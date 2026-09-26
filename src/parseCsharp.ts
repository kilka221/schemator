import { mathify, cleanIoArgs, consolidateBlocks, isSubprogramCall, formatRangeToGost } from './mathify';
import { ASTNode } from './logic';

export function cleanCsharpParams(paramsStr: string): string {
    let parts: string[] = [];
    let current = '';
    let pCount = 0, bCount = 0, aCount = 0;
    for (let char of paramsStr) {
        if (char === '(') pCount++;
        else if (char === ')') pCount--;
        else if (char === '[') bCount++;
        else if (char === ']') bCount--;
        else if (char === '<') aCount++;
        else if (char === '>') aCount--;
        
        if (char === ',' && pCount === 0 && bCount === 0 && aCount === 0) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim() !== '') {
        parts.push(current);
    }

    let cleanedParts = parts.map(p => {
        let trimmed = p.trim();
        // Remove default values e.g. int x = 0
        if (trimmed.includes('=')) {
            trimmed = trimmed.split('=')[0].trim();
        }
        // Extract parameter variable name (last word after modifiers/types/attributes)
        trimmed = trimmed.replace(/\[\s*\]/g, '');
        let varMatch = trimmed.match(/([a-zA-Z0-9_]+)\s*$/);
        return varMatch ? varMatch[1] : trimmed;
    });

    return cleanedParts.filter(Boolean).join(', ');
}

export function cleanCsharpTypesFromStatement(stmt: string): string {
    let s = stmt.trim();
    if (s.startsWith('return ') || s === 'return') return s;

    // Type modifiers in C#
    const typePatterns = [
        /^(?:(?:public|private|protected|internal|static|readonly|volatile|const)\s+)*(?:(?:int|long|short|byte|sbyte|uint|ulong|ushort|float|double|decimal|bool|char|string|var|object|dynamic)\s*(?:\[\s*\]|\?)*\s+)([a-zA-Z0-9_]+)\s*(=.*)?$/,
        /^(?:(?:public|private|protected|internal|static|readonly|volatile|const)\s+)*(?:(?:[A-Z][a-zA-Z0-9_]*(?:<[^>]+>)?)\s*(?:\[\s*\]|\?)*\s+)([a-zA-Z0-9_]+)\s*(=.*)?$/
    ];

    for (let pat of typePatterns) {
        let m = s.match(pat);
        if (m) {
            let varName = m[1];
            let assign = m[2];
            if (assign) {
                return `${varName} ${assign}`.trim();
            } else {
                return varName;
            }
        }
    }

    return s;
}

export function parseCsharpSourceWhole(code: string) {
    let sourceLines = code.split('\n');
    let totalLines = sourceLines.length;

    // Remove multiline comments and line comments while preserving line indices
    let cleanCode = '';
    let inBlockComment = false;
    for (let l = 0; l < totalLines; l++) {
        let line = sourceLines[l];
        let processedLine = '';
        let pos = 0;
        while (pos < line.length) {
            if (inBlockComment) {
                let endIdx = line.indexOf('*/', pos);
                if (endIdx !== -1) {
                    inBlockComment = false;
                    pos = endIdx + 2;
                } else {
                    pos = line.length;
                }
            } else {
                let blockStart = line.indexOf('/*', pos);
                let lineStart = line.indexOf('//', pos);
                if (lineStart !== -1 && (blockStart === -1 || lineStart < blockStart)) {
                    processedLine += line.substring(pos, lineStart);
                    pos = line.length;
                } else if (blockStart !== -1) {
                    processedLine += line.substring(pos, blockStart);
                    inBlockComment = true;
                    pos = blockStart + 2;
                } else {
                    processedLine += line.substring(pos);
                    pos = line.length;
                }
            }
        }
        cleanCode += processedLine + '\n';
    }

    let idCounter = 1;
    let functions: {name: string, returnType?: string, ast: ASTNode[]}[] = [];
    let mainBody: ASTNode[] = [];
    let userDeclaredFunctions = new Set<string>();

    function getLineNumber(charIndex: number): number {
        let sub = cleanCode.substring(0, charIndex);
        return (sub.match(/\n/g) || []).length;
    }

    function createStatementNode(rawText: string, lineIndex?: number): ASTNode | null {
        let text = rawText.trim();
        if (!text || text === ';') return null;

        // Skip using directives and namespace declarations
        if (text.startsWith('using ') || text.startsWith('namespace ')) return null;

        let kind: 'process'|'io'|'subprogram'|'end' = 'process';
        let displayText = text;

        // 1. C# Input: Console.ReadLine(), Console.Read(), Console.ReadKey()
        if (/Console\.(?:ReadLine|Read|ReadKey)\s*\(/.test(text)) {
            kind = 'io';
            // Check assignment like int x = int.Parse(Console.ReadLine()) or var s = Console.ReadLine()
            let mAssign = text.match(/^(?:.*?[\s*])?([a-zA-Z0-9_]+)\s*=\s*(?:[a-zA-Z0-9_.]+\.(?:Parse|ToInt[0-9]+|ToDouble)\s*\()?\s*Console\.ReadLine/);
            if (mAssign) {
                displayText = `Ввод: ${mAssign[1]}`;
            } else {
                let mDirect = text.match(/^([a-zA-Z0-9_]+)\s*=\s*Console\.ReadLine/);
                if (mDirect) {
                    displayText = `Ввод: ${mDirect[1]}`;
                } else {
                    displayText = 'Ввод: данные';
                }
            }
        }
        // 2. C# Output: Console.WriteLine / Console.Write
        else if (/@?Console\.(?:WriteLine|Write)\s*\(/.test(text)) {
            kind = 'io';
            let isForced = text.startsWith('@');
            let m = text.match(/@?Console\.(?:WriteLine|Write)\s*\((.*)\)\s*;?$/s);
            let inside = m ? m[1].trim() : '';

            if (isForced) {
                displayText = `Вывод: ${inside}`;
            } else if (!inside) {
                return null; // Empty Console.WriteLine() -> newline only
            } else if (/^\$"(.*?)"$/s.test(inside)) {
                // String interpolation: $"Result: {res}"
                let matches = inside.match(/\{([^}]+)\}/g);
                if (matches && matches.length > 0) {
                    let vars = matches.map(m => m.slice(1, -1).split(':')[0].trim()).filter(Boolean);
                    displayText = `Вывод: ${vars.join(', ')}`;
                } else {
                    return null; // Pure string without interpolation
                }
            } else if (/^"(.*?)"$/.test(inside)) {
                // Pure string literal
                return null;
            } else if (inside.includes('+')) {
                // "Sum = " + sum
                let parts = inside.split('+').map(p => p.trim());
                let vars = parts.filter(p => !/^["'].*["']$/.test(p));
                if (vars.length > 0) {
                    displayText = `Вывод: ${mathify(cleanIoArgs(vars.join(', ')))}`;
                } else {
                    return null;
                }
            } else {
                displayText = `Вывод: ${mathify(cleanIoArgs(inside))}`;
            }
        }
        // 3. Return statement
        else if (text.startsWith('return ') || text === 'return;' || text === 'return') {
            let retExpr = text.replace(/^return\s*/, '').replace(/;$/, '').trim();
            if (retExpr === '0' || retExpr === '' || retExpr === 'null') {
                return { type: 'stmt', id: `node-${idCounter++}`, text: 'Конец', kind: 'end', lineIndex };
            }
            return { type: 'stmt', id: `node-${idCounter++}`, text: `Выход ${mathify(retExpr)}`, kind: 'end', lineIndex };
        }
        // 4. Subprogram calls
        else {
            let clean = cleanCsharpTypesFromStatement(text).replace(/;$/, '').trim();
            let callMatch = clean.match(/^([a-zA-Z0-9_.]+)\s*\((.*)\)$/);
            if (callMatch && isSubprogramCall(callMatch[1], userDeclaredFunctions)) {
                kind = 'subprogram';
                displayText = clean;
            } else {
                displayText = mathify(clean);
            }
        }

        return { type: 'stmt', id: `node-${idCounter++}`, text: displayText, kind, lineIndex };
    }

    function parseBlock(blockCode: string, offset: number): ASTNode[] {
        let localPos = 0;
        let stmts: ASTNode[] = [];

        function lSkipWhitespace() {
            while (localPos < blockCode.length && /\s/.test(blockCode[localPos])) localPos++;
        }

        function lMatchWord(word: string) {
            lSkipWhitespace();
            if (blockCode.startsWith(word, localPos)) {
                let next = blockCode[localPos + word.length];
                if (!next || !/[a-zA-Z0-9_]/.test(next)) {
                    localPos += word.length;
                    return true;
                }
            }
            return false;
        }

        function readParenContent() {
            lSkipWhitespace();
            if (blockCode[localPos] !== '(') return '';
            localPos++;
            let pCount = 1;
            let start = localPos;
            while (localPos < blockCode.length && pCount > 0) {
                if (blockCode[localPos] === '(') pCount++;
                else if (blockCode[localPos] === ')') pCount--;
                localPos++;
            }
            return blockCode.substring(start, localPos - 1);
        }

        function readBlockOrStmt(): { content: string; startOffset: number } {
            lSkipWhitespace();
            if (blockCode[localPos] === '{') {
                localPos++;
                let bCount = 1;
                let start = localPos;
                while (localPos < blockCode.length && bCount > 0) {
                    if (blockCode[localPos] === '{') bCount++;
                    else if (blockCode[localPos] === '}') bCount--;
                    localPos++;
                }
                return { content: blockCode.substring(start, localPos - 1), startOffset: start };
            } else {
                let start = localPos;
                let pCount = 0;
                let bCount = 0;
                while (localPos < blockCode.length) {
                    let c = blockCode[localPos];
                    if (c === '(') pCount++;
                    else if (c === ')') pCount--;
                    else if (c === '{') bCount++;
                    else if (c === '}') bCount--;
                    else if (c === ';' && pCount === 0 && bCount === 0) {
                        localPos++;
                        break;
                    }
                    localPos++;
                }
                return { content: blockCode.substring(start, localPos), startOffset: start };
            }
        }

        while (localPos < blockCode.length) {
            lSkipWhitespace();
            if (localPos >= blockCode.length) break;

            let curCharPos = offset + localPos;
            let curLine = getLineNumber(curCharPos);

            // 1. IF statement
            if (lMatchWord('if')) {
                let condStr = readParenContent();
                let trueBody = readBlockOrStmt();
                let trueBlock = parseBlock(trueBody.content, offset + trueBody.startOffset);
                let falseBlock: ASTNode[] = [];

                lSkipWhitespace();
                if (lMatchWord('else')) {
                    let falseBody = readBlockOrStmt();
                    falseBlock = parseBlock(falseBody.content, offset + falseBody.startOffset);
                }

                stmts.push({
                    type: 'if',
                    id: `node-${idCounter++}`,
                    condition: mathify(condStr),
                    trueBlock,
                    falseBlock,
                    lineIndex: curLine
                });
            }
            // 2. WHILE loop
            else if (lMatchWord('while')) {
                let condStr = readParenContent();
                let bodyInfo = readBlockOrStmt();
                let body = parseBlock(bodyInfo.content, offset + bodyInfo.startOffset);

                stmts.push({
                    type: 'while',
                    id: `node-${idCounter++}`,
                    condition: mathify(condStr),
                    body,
                    lineIndex: curLine
                });
            }
            // 3. DO-WHILE loop
            else if (lMatchWord('do')) {
                let bodyInfo = readBlockOrStmt();
                let body = parseBlock(bodyInfo.content, offset + bodyInfo.startOffset);
                lSkipWhitespace();
                let condStr = '1';
                if (lMatchWord('while')) {
                    condStr = readParenContent();
                    lSkipWhitespace();
                    if (blockCode[localPos] === ';') localPos++;
                }

                stmts.push({
                    type: 'while',
                    id: `node-${idCounter++}`,
                    condition: mathify(condStr),
                    body,
                    lineIndex: curLine
                });
            }
            // 4. FOREACH loop: foreach (var item in list)
            else if (lMatchWord('foreach')) {
                let header = readParenContent();
                let bodyInfo = readBlockOrStmt();
                let body = parseBlock(bodyInfo.content, offset + bodyInfo.startOffset);

                // e.g. "var x in items" -> "x в items"
                let m = header.match(/(?:var|[a-zA-Z0-9_<>?[\]]+)\s+([a-zA-Z0-9_]+)\s+in\s+(.*)/);
                let condStr = m ? `${m[1]} в ${m[2].trim()}` : header;

                stmts.push({
                    type: 'for',
                    id: `node-${idCounter++}`,
                    condition: condStr,
                    body,
                    lineIndex: curLine
                });
            }
            // 5. FOR loop: for (int i = 0; i < n; i++)
            else if (lMatchWord('for')) {
                let header = readParenContent();
                let bodyInfo = readBlockOrStmt();
                let body = parseBlock(bodyInfo.content, offset + bodyInfo.startOffset);

                let parts = header.split(';').map(p => p.trim());
                if (parts.length === 3) {
                    let init = cleanCsharpTypesFromStatement(parts[0]);
                    let cond = parts[1];
                    let step = parts[2];

                    let initMatch = init.match(/^([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
                    if (initMatch) {
                        let varName = initMatch[1];
                        let startVal = initMatch[2];
                        let condMatch = cond.match(new RegExp(`^${varName}\\s*(<|<=|>|>=)\\s*(.*)$`));
                        if (condMatch) {
                            let op = condMatch[1];
                            let endVal = condMatch[2];
                            let stepVal = '1';
                            if (step.includes('++') || step.includes('+= 1') || step.includes('+ 1')) {
                                stepVal = '1';
                            } else if (step.includes('--') || step.includes('-= 1') || step.includes('- 1')) {
                                stepVal = '-1';
                            } else {
                                let stepMatch = step.match(/\+=\s*(.*)/) || step.match(/=\s*[a-zA-Z0-9_]+\s*\+\s*(.*)/);
                                if (stepMatch) stepVal = stepMatch[1].trim();
                            }

                            let conditionStr = '';
                            if (op === '<') {
                                conditionStr = formatRangeToGost(varName, [startVal, `${endVal} - 1`, stepVal]);
                            } else if (op === '<=') {
                                conditionStr = formatRangeToGost(varName, [startVal, endVal, stepVal]);
                            } else {
                                conditionStr = `${varName} = ${startVal}, ${endVal}`;
                            }

                            stmts.push({
                                type: 'for',
                                id: `node-${idCounter++}`,
                                condition: conditionStr,
                                body,
                                lineIndex: curLine
                            });
                            continue;
                        }
                    }
                }

                stmts.push({
                    type: 'while',
                    id: `node-${idCounter++}`,
                    condition: mathify(parts[1] || header),
                    body,
                    lineIndex: curLine
                });
            }
            // 6. Plain Statement
            else {
                let start = localPos;
                let pCount = 0;
                let bCount = 0;
                while (localPos < blockCode.length) {
                    let c = blockCode[localPos];
                    if (c === '(') pCount++;
                    else if (c === ')') pCount--;
                    else if (c === '{') bCount++;
                    else if (c === '}') bCount--;
                    else if (c === ';' && pCount === 0 && bCount === 0) {
                        localPos++;
                        break;
                    }
                    localPos++;
                }
                let rawStmt = blockCode.substring(start, localPos);
                let node = createStatementNode(rawStmt, curLine);
                if (node) stmts.push(node);
            }
        }

        return stmts;
    }

    // Outer parse: find class definitions, methods, or top-level statements
    let pos = 0;
    function skipWhitespace() {
        while (pos < cleanCode.length && /\s/.test(cleanCode[pos])) pos++;
    }

    function readUntilMatchingBrace() {
        let bCount = 1;
        let start = pos;
        while (pos < cleanCode.length && bCount > 0) {
            if (cleanCode[pos] === '{') bCount++;
            else if (cleanCode[pos] === '}') bCount--;
            pos++;
        }
        return cleanCode.substring(start, pos - 1);
    }

    function readUntil(chars: string[]) {
        let start = pos;
        let pCount = 0;
        while (pos < cleanCode.length) {
            let c = cleanCode[pos];
            if (c === '(') pCount++;
            else if (c === ')') pCount--;
            if (pCount === 0 && chars.includes(c)) break;
            pos++;
        }
        return cleanCode.substring(start, pos);
    }

    function parseClassOrGlobal(codeStr: string, baseOffset: number) {
        let p = 0;
        while (p < codeStr.length) {
            while (p < codeStr.length && /\s/.test(codeStr[p])) p++;
            if (p >= codeStr.length) break;

            if (codeStr.startsWith('using ', p) || codeStr.startsWith('#', p)) {
                while (p < codeStr.length && codeStr[p] !== '\n') p++;
                continue;
            }

            let startP = p;
            let pCount = 0;
            while (p < codeStr.length) {
                let c = codeStr[p];
                if (c === '(') pCount++;
                else if (c === ')') pCount--;
                if (pCount === 0 && (c === '{' || c === ';')) break;
                p++;
            }

            let sig = codeStr.substring(startP, p).trim();
            let endChar = codeStr[p];

            if (endChar === ';') {
                p++;
                let node = createStatementNode(sig, getLineNumber(baseOffset + startP));
                if (node) mainBody.push(node);
                continue;
            } else if (endChar === '{') {
                p++;
                let blockStart = p;
                let bCount = 1;
                while (p < codeStr.length && bCount > 0) {
                    if (codeStr[p] === '{') bCount++;
                    else if (codeStr[p] === '}') bCount--;
                    p++;
                }
                let blockContent = codeStr.substring(blockStart, p - 1);

                // Class, Struct, Namespace, Record
                if (/\b(?:class|struct|interface|record|namespace)\s+([a-zA-Z0-9_]+)/.test(sig)) {
                    parseClassOrGlobal(blockContent, baseOffset + blockStart);
                } else {
                    // Method definition
                    let fnMatch = sig.match(/(?:(?:public|private|protected|internal|static|async|virtual|override|abstract)\s+)*(?:([a-zA-Z0-9_<>?[\]]+)\s+)?([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
                    if (fnMatch) {
                        let retType = fnMatch[1];
                        let fnName = fnMatch[2];
                        let params = fnMatch[3];
                        let cleanParams = cleanCsharpParams(params);
                        let fullName = `${fnName}(${cleanParams})`;
                        let ast = parseBlock(blockContent, baseOffset + blockStart);

                        if (fnName.toLowerCase() === 'main') {
                            mainBody = ast;
                        } else {
                            functions.push({ name: fullName, returnType: retType, ast });
                        }
                    } else {
                        // Generic block or top level
                        let ast = parseBlock(blockContent, baseOffset + blockStart);
                        mainBody.push(...ast);
                    }
                }
            }
        }
    }

    parseClassOrGlobal(cleanCode, 0);

    mainBody = consolidateBlocks(mainBody);
    for (let f of functions) {
        f.ast = consolidateBlocks(f.ast);
    }

    return { main: mainBody, functions };
}
