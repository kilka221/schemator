import { mathify, cleanIoArgs, consolidateBlocks, isSubprogramCall, formatRangeToGost } from './mathify';
import { ASTNode } from './logic';

export function cleanCppParams(paramsStr: string): string {
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
        // Extract parameter variable name (last word after qualifiers/types)
        // e.g. "const vector<int>& arr" -> "arr", "int a[]" -> "a", "int* ptr" -> "ptr"
        trimmed = trimmed.replace(/\[\s*\]/g, '');
        let varMatch = trimmed.match(/([a-zA-Z0-9_]+)\s*$/);
        return varMatch ? varMatch[1] : trimmed;
    });

    return cleanedParts.filter(Boolean).join(', ');
}

export function translateCppLine(line: string): string {
    const original = line;
    try {
        let clean = line.trim().replace(/;$/, '').trim();

        // 1. File Streams
        let mIfstream = clean.match(/^ifstream\s+([a-zA-Z0-9_]+)\s*\((.*?)\)$/);
        if (mIfstream) {
            return `Открытие файла ${mIfstream[2]} для чтения (${mIfstream[1]})`;
        }
        let mOfstream = clean.match(/^ofstream\s+([a-zA-Z0-9_]+)\s*\((.*?)\)$/);
        if (mOfstream) {
            return `Открытие файла ${mOfstream[2]} для записи (${mOfstream[1]})`;
        }
        let mFstream = clean.match(/^fstream\s+([a-zA-Z0-9_]+)\s*\((.*?)\)$/);
        if (mFstream) {
            return `Открытие файла ${mFstream[2]} (${mFstream[1]})`;
        }
        let mFileClose = clean.match(/^([a-zA-Z0-9_]+)\.close\(\)$/);
        if (mFileClose) {
            return `Закрытие файла (${mFileClose[1]})`;
        }

        // 2. Vector / Container declarations
        let mVecFill = clean.match(/^(?:std::)?vector\s*<.*?>\s+([a-zA-Z0-9_]+)\s*\(\s*([^,]+)\s*,\s*(.*?)\s*\)$/);
        if (mVecFill) {
            return `Создание массива ${mVecFill[1]} размера ${mVecFill[2]} (заполненного ${mVecFill[3]})`;
        }
        let mVecSize = clean.match(/^(?:std::)?vector\s*<.*?>\s+([a-zA-Z0-9_]+)\s*\(\s*([^,]+)\s*\)$/);
        if (mVecSize) {
            return `Создание массива ${mVecSize[1]} размера ${mVecSize[2]}`;
        }
        let mVecInit = clean.match(/^(?:std::)?vector\s*<.*?>\s+([a-zA-Z0-9_]+)\s*=\s*(\{.*\})$/);
        if (mVecInit) {
            return `Инициализация массива ${mVecInit[1]} = ${mVecInit[2]}`;
        }
        let mVecEmpty = clean.match(/^(?:std::)?vector\s*<.*?>\s+([a-zA-Z0-9_]+)$/);
        if (mVecEmpty) {
            return `Создание пустого массива ${mVecEmpty[1]}`;
        }
        let mMat = clean.match(/^(?:std::)?vector\s*<\s*(?:std::)?vector\s*<.*?>\s*>\s+([a-zA-Z0-9_]+)\s*\(\s*([^,]+)\s*,\s*(?:std::)?vector\s*<.*?>\s*\(\s*([^,]+)(?:\s*,\s*(.*?))?\s*\)\s*\)$/);
        if (mMat) {
            let fillStr = mMat[4] !== undefined ? ` (заполненного ${mMat[4]})` : '';
            return `Создание матрицы ${mMat[1]} размера ${mMat[2]} × ${mMat[3]}${fillStr}`;
        }
        let mArrInit = clean.match(/^([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)\[(.*?)\]\s*=\s*\{\s*0\s*\}$/);
        if (mArrInit) {
            return `Инициализация массива ${mArrInit[2]}[${mArrInit[3]}] нулями`;
        }
        let mArrDecl = clean.match(/^(?:int|float|double|char|bool|long\s+long|size_t)\s+([a-zA-Z0-9_]+)\[(.*?)\]$/);
        if (mArrDecl) {
            return `Выделение массива ${mArrDecl[1]}[${mArrDecl[2]}]`;
        }

        // Map / Set / Queue / Stack Declarations
        let mMapDecl = clean.match(/^(?:std::)?(?:unordered_)?map\s*<.*?>\s+([a-zA-Z0-9_]+)$/);
        if (mMapDecl) {
            return `Создание словаря / ассоциативного массива ${mMapDecl[1]}`;
        }
        let mSetDecl = clean.match(/^(?:std::)?(?:unordered_)?set\s*<.*?>\s+([a-zA-Z0-9_]+)$/);
        if (mSetDecl) {
            return `Создание множества ${mSetDecl[1]}`;
        }
        let mStackDecl = clean.match(/^(?:std::)?stack\s*<.*?>\s+([a-zA-Z0-9_]+)$/);
        if (mStackDecl) {
            return `Создание стека ${mStackDecl[1]}`;
        }
        let mQueueDecl = clean.match(/^(?:std::)?queue\s*<.*?>\s+([a-zA-Z0-9_]+)$/);
        if (mQueueDecl) {
            return `Создание очереди ${mQueueDecl[1]}`;
        }
        let mPqDecl = clean.match(/^(?:std::)?priority_queue\s*<.*?>\s+([a-zA-Z0-9_]+)$/);
        if (mPqDecl) {
            return `Создание очереди с приоритетом ${mPqDecl[1]}`;
        }

        // 3. Container Methods
        let mPush = clean.match(/^([a-zA-Z0-9_.]+)\.(?:push_back|emplace_back)\((.*?)\)$/);
        if (mPush) {
            return `Добавление элемента ${mPush[2]} в конец ${mPush[1]}`;
        }
        let mPopBack = clean.match(/^([a-zA-Z0-9_.]+)\.pop_back\(\)$/);
        if (mPopBack) {
            return `Удаление последнего элемента из ${mPopBack[1]}`;
        }
        let mClear = clean.match(/^([a-zA-Z0-9_.]+)\.clear\(\)$/);
        if (mClear) {
            return `Очистка ${mClear[1]}`;
        }
        let mResize = clean.match(/^([a-zA-Z0-9_.]+)\.resize\((.*?)\)$/);
        if (mResize) {
            return `Изменение размера ${mResize[1]} до ${mResize[2]}`;
        }
        let mReserve = clean.match(/^([a-zA-Z0-9_.]+)\.reserve\((.*?)\)$/);
        if (mReserve) {
            return `Резервирование памяти ${mReserve[1]} для ${mReserve[2]} элементов`;
        }
        let mInsert = clean.match(/^([a-zA-Z0-9_.]+)\.insert\((.*?)\)$/);
        if (mInsert) {
            return `Добавление элемента ${mInsert[2]} в ${mInsert[1]}`;
        }
        let mErase = clean.match(/^([a-zA-Z0-9_.]+)\.erase\((.*?)\)$/);
        if (mErase) {
            return `Удаление элемента ${mErase[2]} из ${mErase[1]}`;
        }

        // Stack/Queue push and pop
        let mStPush = clean.match(/^([a-zA-Z0-9_.]+)\.push\((.*?)\)$/);
        if (mStPush) {
            return `Помещение элемента ${mStPush[2]} в ${mStPush[1]}`;
        }
        let mStPop = clean.match(/^([a-zA-Z0-9_.]+)\.pop\(\)$/);
        if (mStPop) {
            return `Извлечение элемента из ${mStPop[1]}`;
        }

        // Map assignment: mp[key] = val
        let mMapSet = clean.match(/^([a-zA-Z0-9_]+)\[([^\]]+)\]\s*=\s*(.*)$/);
        if (mMapSet && !clean.startsWith('if') && !clean.startsWith('while')) {
            // only translate if it's verbal or clean assignment
            // Keep normal array assignments simple mathify, e.g. a[i] = x
        }

        // 4. Algorithms (std::sort, reverse, fill, accumulate, etc.)
        let mSortDesc = clean.match(/^(?:std::)?sort\(\s*([a-zA-Z0-9_.]+)\.(?:rbegin\(\)|begin\(\))\s*,\s*\1\.(?:rend\(\)|end\(\))\s*,\s*(?:std::)?greater<.*?>\(\)\s*\)$/);
        if (mSortDesc) {
            return `Сортировка ${mSortDesc[1]} по убыванию`;
        }
        let mSortAsc = clean.match(/^(?:std::)?sort\(\s*([a-zA-Z0-9_.]+)\.begin\(\)\s*,\s*\1\.end\(\)\s*\)$/);
        if (mSortAsc) {
            return `Сортировка ${mSortAsc[1]} по возрастанию`;
        }
        let mSortArr = clean.match(/^(?:std::)?sort\(\s*([a-zA-Z0-9_]+)\s*,\s*\1\s*\+\s*([a-zA-Z0-9_]+)\s*\)$/);
        if (mSortArr) {
            return `Сортировка массива ${mSortArr[1]} (${mSortArr[2]} элементов)`;
        }
        let mRev = clean.match(/^(?:std::)?reverse\(\s*([a-zA-Z0-9_.]+)\.begin\(\)\s*,\s*\1\.end\(\)\s*\)$/);
        if (mRev) {
            return `Обращение порядка элементов ${mRev[1]}`;
        }
        let mFill = clean.match(/^(?:std::)?fill\(\s*([a-zA-Z0-9_.]+)\.begin\(\)\s*,\s*\1\.end\(\)\s*,\s*(.*?)\s*\)$/);
        if (mFill) {
            return `Заполнение ${mFill[1]} значением ${mFill[2]}`;
        }
        let mAccum = clean.match(/^(?:std::)?accumulate\(\s*([a-zA-Z0-9_.]+)\.begin\(\)\s*,\s*\1\.end\(\)\s*,\s*0\s*\)$/);
        if (mAccum) {
            return `Вычисление суммы элементов ${mAccum[1]}`;
        }
        let mSwap = clean.match(/^(?:std::)?swap\(\s*([a-zA-Z0-9_.]+)\s*,\s*([a-zA-Z0-9_.]+)\s*\)$/);
        if (mSwap) {
            return `Обмен значений ${mSwap[1]} и ${mSwap[2]}`;
        }

        // 5. String methods
        let mSubstr = clean.match(/^([a-zA-Z0-9_.]+)\.substr\(\s*([^,]+)\s*(?:,\s*(.*?))?\s*\)$/);
        if (mSubstr) {
            if (mSubstr[3]) {
                return `Выделение подстроки ${mSubstr[1]} с позиции ${mSubstr[2]} длины ${mSubstr[3]}`;
            } else {
                return `Выделение подстроки ${mSubstr[1]} с позиции ${mSubstr[2]}`;
            }
        }
        let mFindStr = clean.match(/^([a-zA-Z0-9_.]+)\.find\((.*?)\)$/);
        if (mFindStr) {
            return `Поиск подстроки ${mFindStr[2]} в строке ${mFindStr[1]}`;
        }

        return original;
    } catch (e) {
        return original;
    }
}

export function cleanCppTypesFromStatement(stmt: string): string {
    let text = stmt.trim();
    if (text.startsWith('setlocale')) return '';

    // Remove qualifiers like const, static, unsigned, signed, constexpr, etc.
    text = text.replace(/\b(const|static|unsigned|signed|constexpr|inline|volatile)\b\s*/g, '');

    // Check if it's a pure uninitialized variable declaration, e.g. "int a;", "int a, b, c;", "double x, y;"
    let pureDecl = text.match(/^(?:std::)?(?:int|float|double|char|bool|long\s+long|long|short|size_t|string|auto)\s+([a-zA-Z0-9_,\s*&]+)$/);
    if (pureDecl && !text.includes('=')) {
        // Pure uninitialized declaration -> omit in flowchart
        return '';
    }

    // Pointer declarations: int* p = &x -> p = &x
    let mPtr = text.match(/^(?:std::)?(?:int|float|double|char|bool|long\s+long|size_t|auto)\s*\*\s*([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
    if (mPtr) {
        return `${mPtr[1]} = ${mPtr[2]}`;
    }

    // Strip leading type keyword for initialized declarations
    text = text.replace(/^(?:std::)?(?:int|float|double|char|bool|long\s+long|long|short|size_t|string|auto)\b\s*(?:[*&]\s*)?/, '');

    return text.trim();
}

export function parseCppSourceWhole(code: string) {
    // Keep track of line numbers: replace comments with equivalent newlines or whitespace
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
                    // Line comment to end of line
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

    let pos = 0;
    let idCounter = 1;

    let functions: {name: string, returnType?: string, ast: ASTNode[]}[] = [];
    let mainBody: ASTNode[] = [];

    let userDeclaredFunctions = new Set<string>();

    // Pre-scan all declared functions and struct/classes in the file
    let fnHeaderRegex = /(?:(?:inline|static|const|virtual|constexpr)\s+)*(?:(?:[a-zA-Z0-9_:<>&*]+\s+)+)([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?:const)?\s*\{/g;
    let scanMatch;
    while ((scanMatch = fnHeaderRegex.exec(cleanCode)) !== null) {
        let fnName = scanMatch[1];
        if (fnName && fnName !== 'if' && fnName !== 'while' && fnName !== 'for' && fnName !== 'switch' && fnName !== 'catch') {
            userDeclaredFunctions.add(fnName);
        }
    }

    function getLineNumber(charIndex: number): number {
        let sub = cleanCode.substring(0, charIndex);
        return (sub.match(/\n/g) || []).length;
    }

    function skipWhitespace() {
        while(pos < cleanCode.length && /\s/.test(cleanCode[pos])) pos++;
    }

    function matchWord(word: string) {
        skipWhitespace();
        if (cleanCode.startsWith(word, pos)) {
            let nextChar = cleanCode[pos + word.length];
            if (!nextChar || !/[a-zA-Z0-9_]/.test(nextChar)) {
                pos += word.length;
                return true;
            }
        }
        return false;
    }

    function readUntilMatchingBrace() {
        let bCount = 1;
        let start = pos;
        while(pos < cleanCode.length && bCount > 0) {
            if (cleanCode[pos] === '{') bCount++;
            else if (cleanCode[pos] === '}') bCount--;
            pos++;
        }
        return cleanCode.substring(start, pos - 1);
    }
    
    function readUntil(chars: string[], skipParen = false) {
        let start = pos;
        let pCount = 0;
        while(pos < cleanCode.length) {
            let c = cleanCode[pos];
            if (skipParen) {
                if (c === '(') pCount++;
                else if (c === ')') pCount--;
            }
            if (pCount === 0 && chars.includes(c)) break;
            pos++;
        }
        return cleanCode.substring(start, pos);
    }

    function createStatementNode(rawText: string, lineIndex?: number): ASTNode | null {
        let text = rawText.trim();
        if (!text || text === ';' || text.startsWith('setlocale')) return null;

        // Skip #include, using namespace, etc. if encountered inside block
        if (text.startsWith('#') || text.startsWith('using ')) return null;

        // First apply verbal translations for C++ lines
        let verbal = translateCppLine(text);
        if (verbal !== text) {
            return {
                type: 'stmt',
                id: `node-${idCounter++}`,
                text: verbal,
                kind: 'process',
                lineIndex
            };
        }

        let kind: 'process'|'io'|'subprogram'|'end' = 'process';
        let displayText = text;

        if (text.startsWith('union ') || text.startsWith('struct ') || text.startsWith('class ')) {
            kind = 'subprogram';
            displayText = text.replace(/\{[\s\S]*?\}/g, '').replace(/;/g, '').trim();
        } 
        // 1. C++ cin / scanf / getline
        else if (/^(?:std::)?cin\s*>>/.test(text) || /^scanf\s*\(/.test(text) || /^getline\s*\(/.test(text) || /^(?:std::)?getline\s*\(/.test(text)) {
            kind = 'io';
            if (/getline/.test(text)) {
                let m = text.match(/getline\s*\(\s*(?:std::)?cin\s*,\s*([a-zA-Z0-9_]+)\s*\)/);
                let v = m ? m[1] : 'строка';
                displayText = `Ввод: ${v}`;
            } else if (/scanf/.test(text)) {
                let m = text.match(/scanf\s*\(\s*"[^"]*"\s*,\s*(.*?)\s*\)/);
                let args = m ? m[1].replace(/&/g, '').trim() : '';
                displayText = `Ввод: ${args || 'данные'}`;
            } else {
                let vars = text.replace(/^(?:std::)?cin\s*>>/, '').replace(/;/g, '').trim();
                let cleanVars = vars.split('>>').map(v => v.trim()).filter(Boolean).join(', ');
                displayText = `Ввод: ${cleanVars}`;
            }
        } 
        // 2. C++ cout / printf
        else if (/@?(?:std::)?cout\s*<</.test(text) || /@?printf\s*\(/.test(text)) {
            kind = 'io';
            let isForced = text.startsWith('@');
            
            if (text.includes('printf')) {
                let m = text.match(/@?printf\s*\(\s*"([^"]*)"(?:\s*,\s*(.*?))?\s*\)/);
                if (m) {
                    let formatStr = m[1];
                    let args = m[2] ? m[2].trim() : '';
                    if (isForced) {
                        displayText = `Вывод: "${formatStr}"`;
                    } else if (args) {
                        displayText = `Вывод: ${mathify(cleanIoArgs(args))}`;
                    } else {
                        // String-only print: omit unless forced!
                        return null;
                    }
                } else {
                    return null;
                }
            } else {
                // cout << ...
                let rawArgs = text.replace(/@?(?:std::)?cout\s*<</, '').replace(/;/g, '').trim();
                let parts = rawArgs.split('<<').map(p => p.trim()).filter(Boolean);
                
                let nonStringParts: string[] = [];
                let stringParts: string[] = [];
                for (let part of parts) {
                    if (part === 'endl' || part === 'std::endl' || part === "'\\n'" || part === '"\\n"') {
                        continue;
                    }
                    if (/^["'].*["']$/.test(part)) {
                        stringParts.push(part);
                    } else {
                        nonStringParts.push(part);
                    }
                }

                if (isForced) {
                    let out = parts.filter(p => p !== 'endl' && p !== 'std::endl').join(', ');
                    displayText = `Вывод: ${mathify(out)}`;
                } else if (nonStringParts.length > 0) {
                    let clean = cleanIoArgs(nonStringParts.join(', '));
                    displayText = `Вывод: ${mathify(clean)}`;
                } else {
                    // Only string output without variables (e.g. cout << "Hello";) -> ignore per GOST!
                    return null;
                }
            }
        } 
        // 3. Return statement
        else if (text.startsWith('return ') || text === 'return') {
            kind = 'end';
            let ret = text.substring(6).replace(/;$/, '').trim();
            if (ret === '0' || ret === 'EXIT_SUCCESS') {
                displayText = 'Конец';
            } else if (ret) {
                displayText = `Выход из п/п (${mathify(ret)})`;
            } else {
                displayText = `Выход из п/п`;
            }
        } 
        // 4. Subprogram calls and user functions
        else {
            let cleanedStmt = cleanCppTypesFromStatement(text);
            
            // Check if this statement is a subprogram call e.g. foo(a, b); or res = foo(a, b);
            let rightSide = cleanedStmt.replace(/^[a-zA-Z0-9_.,\s]+\s*=\s*/, '').trim();
            let callMatch = rightSide.match(/^([a-zA-Z0-9_.:~>-]+)\s*\((.*)\)$/);
            if (callMatch) {
                let funcName = callMatch[1];
                if (userDeclaredFunctions.has(funcName) || isSubprogramCall(funcName, userDeclaredFunctions)) {
                    kind = 'subprogram';
                }
            }
            displayText = mathify(cleanedStmt);
        }

        if (!displayText || !displayText.trim()) {
            return null;
        }

        return { type: 'stmt', id: `node-${idCounter++}`, text: displayText, kind, lineIndex };
    }

    function parseBlock(blockCode: string, blockOffsetInCode: number = 0): ASTNode[] {
        let stmts: ASTNode[] = [];
        let localPos = 0;

        function lSkipWhitespace() {
            while(localPos < blockCode.length && /\s/.test(blockCode[localPos])) localPos++;
        }
        function lMatchWord(word: string) {
            lSkipWhitespace();
            if (blockCode.startsWith(word, localPos)) {
                let nextChar = blockCode[localPos + word.length];
                if (!nextChar || !/[a-zA-Z0-9_]/.test(nextChar)) {
                    localPos += word.length;
                    return true;
                }
            }
            return false;
        }

        while(localPos < blockCode.length) {
            lSkipWhitespace();
            if (localPos >= blockCode.length) break;

            let curCharPos = blockOffsetInCode + localPos;
            let curLine = getLineNumber(curCharPos);

            if (lMatchWord('if')) {
                let ifLine = curLine;
                lSkipWhitespace();
                if (blockCode[localPos] === '(') {
                    localPos++;
                    let pCount = 1;
                    let start = localPos;
                    while(localPos < blockCode.length && pCount > 0) {
                        if (blockCode[localPos] === '(') pCount++;
                        else if (blockCode[localPos] === ')') pCount--;
                        localPos++;
                    }
                    let condition = blockCode.substring(start, localPos - 1).trim();
                    condition = mathify(condition);

                    let trueBlockStr = readBlockOrStmtLocal();
                    let trueBlock = parseBlock(trueBlockStr, blockOffsetInCode + (localPos - trueBlockStr.length));
                    let falseBlock: ASTNode[] = [];
                    if (lMatchWord('else')) {
                        let falseBlockStr = readBlockOrStmtLocal();
                        falseBlock = parseBlock(falseBlockStr, blockOffsetInCode + (localPos - falseBlockStr.length));
                    }
                    stmts.push({ type: 'if', id: `node-${idCounter++}`, condition, trueBlock, falseBlock, lineIndex: ifLine });
                }
            } 
            else if (lMatchWord('while')) {
                let whileLine = curLine;
                lSkipWhitespace();
                if (blockCode[localPos] === '(') {
                    localPos++;
                    let pCount = 1;
                    let start = localPos;
                    while(localPos < blockCode.length && pCount > 0) {
                        if (blockCode[localPos] === '(') pCount++;
                        else if (blockCode[localPos] === ')') pCount--;
                        localPos++;
                    }
                    let condition = blockCode.substring(start, localPos - 1).trim();
                    condition = mathify(condition);
                    let bodyStr = readBlockOrStmtLocal();
                    let body = parseBlock(bodyStr, blockOffsetInCode + (localPos - bodyStr.length));
                    stmts.push({ type: 'while', id: `node-${idCounter++}`, condition, body, lineIndex: whileLine });
                }
            } 
            else if (lMatchWord('do')) {
                let doLine = curLine;
                let bodyStr = readBlockOrStmtLocal();
                let body = parseBlock(bodyStr, blockOffsetInCode + (localPos - bodyStr.length));
                let condStr = '';
                if (lMatchWord('while')) {
                    lSkipWhitespace();
                    if (blockCode[localPos] === '(') {
                        localPos++;
                        let pCount = 1;
                        let start = localPos;
                        while(localPos < blockCode.length && pCount > 0) {
                            if (blockCode[localPos] === '(') pCount++;
                            else if (blockCode[localPos] === ')') pCount--;
                            localPos++;
                        }
                        condStr = blockCode.substring(start, localPos - 1).trim();
                        lSkipWhitespace();
                        if (blockCode[localPos] === ';') localPos++;
                    }
                }
                stmts.push({ type: 'while', id: `node-${idCounter++}`, condition: mathify(condStr || '1'), body, lineIndex: doLine });
            }
            else if (lMatchWord('for')) {
                let forLine = curLine;
                lSkipWhitespace();
                if (blockCode[localPos] === '(') {
                    localPos++;
                    let pCount = 1;
                    let start = localPos;
                    while(localPos < blockCode.length && pCount > 0) {
                        if (blockCode[localPos] === '(') pCount++;
                        else if (blockCode[localPos] === ')') pCount--;
                        localPos++;
                    }
                    let forConds = blockCode.substring(start, localPos - 1).trim();
                    let bodyStr = readBlockOrStmtLocal();
                    let body = parseBlock(bodyStr, blockOffsetInCode + (localPos - bodyStr.length));

                    // Range-based for: for (auto x : vec) or for (int x : arr)
                    let rangeMatch = forConds.match(/^(?:const\s+)?(?:auto|int|float|double|char|string|[a-zA-Z0-9_:<>&*]+)\s*(&|\*|&&)?\s*([a-zA-Z0-9_]+)\s*:\s*(.*)$/);
                    if (rangeMatch) {
                        let itemVar = rangeMatch[2];
                        let container = rangeMatch[3].trim();
                        let conditionStr = `Для каждого ${itemVar} из ${container}`;
                        stmts.push({ type: 'for', id: `node-${idCounter++}`, condition: conditionStr, body, lineIndex: forLine });
                        continue;
                    }
                    
                    let parts = forConds.split(';');
                    if (parts.length === 3) {
                        let init = parts[0].trim();
                        let cond = parts[1].trim();
                        let inc = parts[2].trim();
                        
                        let initMatch = init.match(/(?:int|float|double|size_t|auto|long\s+long|short)?\s*([a-zA-Z0-9_]+)\s*=\s*(.*)/);
                        if (initMatch) {
                            let iterVar = initMatch[1];
                            let startVal = initMatch[2];
                            
                            let condMatch = cond.match(new RegExp(`${iterVar}\\s*(<|<=|>|>=)\\s*(.*)`));
                            let stepMatch = inc.match(new RegExp(`${iterVar}\\s*(\\+\\+|\\-\\-)|(\\+\\+|\\-\\-)\\s*${iterVar}|${iterVar}\\s*\\+=\\s*(.*)|${iterVar}\\s*\\-=\\s*(.*)`));
                            
                            if (condMatch && stepMatch) {
                                let bound = condMatch[2].trim();
                                let step = "1";
                                if (stepMatch[1] === '--' || stepMatch[2] === '--') step = "-1";
                                else if (stepMatch[3]) step = stepMatch[3].trim();
                                else if (stepMatch[4]) step = "-" + stepMatch[4].trim();
                                
                                if (condMatch[1] === '<') bound = `${bound} - 1`;
                                else if (condMatch[1] === '>') bound = `${bound} + 1`;
                                
                                let conditionStr = `${iterVar} = ${mathify(startVal)}(${mathify(step)})${mathify(bound)}`;
                                stmts.push({ type: 'for', id: `node-${idCounter++}`, condition: conditionStr, body, lineIndex: forLine });
                                continue;
                            }
                        }
                        
                        // Transform into standard while loop if complex
                        if (init) {
                            let node = createStatementNode(init, forLine);
                            if (node) stmts.push(node);
                        }
                        if (inc) {
                            let node = createStatementNode(inc, forLine);
                            if (node) body.push(node);
                        }
                        stmts.push({ type: 'while', id: `node-${idCounter++}`, condition: mathify(cond), body, lineIndex: forLine });
                    } else {
                        stmts.push({ type: 'while', id: `node-${idCounter++}`, condition: mathify(forConds), body, lineIndex: forLine });
                    }
                }
            } 
            else if (lMatchWord('switch')) {
                let switchLine = curLine;
                lSkipWhitespace();
                if (blockCode[localPos] === '(') {
                    localPos++;
                    let pCount = 1;
                    let start = localPos;
                    while(localPos < blockCode.length && pCount > 0) {
                        if (blockCode[localPos] === '(') pCount++;
                        else if (blockCode[localPos] === ')') pCount--;
                        localPos++;
                    }
                    let switchVar = blockCode.substring(start, localPos - 1).trim();
                    lSkipWhitespace();
                    if (blockCode[localPos] === '{') {
                        localPos++;
                        let bCount = 1;
                        let switchBodyStart = localPos;
                        while(localPos < blockCode.length && bCount > 0) {
                            if (blockCode[localPos] === '{') bCount++;
                            else if (blockCode[localPos] === '}') bCount--;
                            localPos++;
                        }
                        let switchBody = blockCode.substring(switchBodyStart, localPos - 1);
                        
                        let cases: { condition: string, block: ASTNode[] }[] = [];
                        let defaultBlock: ASTNode[] | undefined = undefined;
                        let caseRegex = /(?:case\s+([^:]+):|default\s*:)/g;
                        
                        let lastIdx = 0;
                        let lastCond: string | null = null;
                        
                        let matchVal;
                        while ((matchVal = caseRegex.exec(switchBody)) !== null) {
                            if (lastCond !== null) {
                                let blockStr = switchBody.substring(lastIdx, matchVal.index).trim();
                                blockStr = blockStr.replace(/break\s*;$/, '').trim(); 
                                let blockObj = parseBlock(blockStr, blockOffsetInCode + switchBodyStart + lastIdx);
                                if (lastCond === 'default') defaultBlock = blockObj;
                                else cases.push({ condition: lastCond, block: blockObj });
                            }
                            lastCond = matchVal[1] ? matchVal[1].trim() : 'default';
                            lastIdx = matchVal.index + matchVal[0].length;
                        }
                        if (lastCond !== null) {
                            let blockStr = switchBody.substring(lastIdx).trim();
                            blockStr = blockStr.replace(/break\s*;$/, '').trim();
                            let blockObj = parseBlock(blockStr, blockOffsetInCode + switchBodyStart + lastIdx);
                            if (lastCond === 'default') defaultBlock = blockObj;
                            else cases.push({ condition: lastCond, block: blockObj });
                        }
                        
                        stmts.push({ type: 'match', id: `node-${idCounter++}`, condition: switchVar, cases, defaultBlock, lineIndex: switchLine });
                    }
                }
            } 
            else {
                // Parse generic statement until ;
                let start = localPos;
                let bCount = 0;
                let pCount = 0;
                while(localPos < blockCode.length) {
                    let c = blockCode[localPos];
                    if (c === '{') bCount++;
                    else if (c === '}') bCount--;
                    else if (c === '(') pCount++;
                    else if (c === ')') pCount--;
                    else if (c === ';' && bCount === 0 && pCount === 0) {
                        break;
                    }
                    localPos++;
                }
                let stmtText = blockCode.substring(start, localPos).trim();
                if (blockCode[localPos] === ';') localPos++;
                if (stmtText) {
                    let node = createStatementNode(stmtText, curLine);
                    if (node) stmts.push(node);
                }
            }
        }
        return stmts;

        function readBlockOrStmtLocal() {
            lSkipWhitespace();
            if (blockCode[localPos] === '{') {
                localPos++;
                let bCount = 1;
                let start = localPos;
                while(localPos < blockCode.length && bCount > 0) {
                    if (blockCode[localPos] === '{') bCount++;
                    else if (blockCode[localPos] === '}') bCount--;
                    localPos++;
                }
                return blockCode.substring(start, localPos - 1);
            } else {
                let start = localPos;
                if (blockCode.startsWith('if', localPos) || blockCode.startsWith('for', localPos) || blockCode.startsWith('while', localPos)) {
                    let pCount = 0;
                    let bCount = 0;
                    while(localPos < blockCode.length) {
                        let c = blockCode[localPos];
                        if (c === '(') { pCount++; localPos++; }
                        else if (c === ')') { pCount--; localPos++; }
                        else if (c === '{') { bCount++; localPos++; }
                        else if (c === '}') { 
                            bCount--; 
                            localPos++;
                            if (bCount === 0) { 
                                let p = localPos;
                                while(p < blockCode.length && /\s/.test(blockCode[p])) p++;
                                if (blockCode.startsWith('else', p)) {
                                    // continue
                                } else {
                                    break; 
                                }
                            }
                        }
                        else if (c === ';' && pCount === 0 && bCount === 0) {
                            localPos++;
                            let p = localPos;
                            while(p < blockCode.length && /\s/.test(blockCode[p])) p++;
                            if (blockCode.startsWith('else', p)) {
                                // continue
                            } else {
                                break;
                            }
                        }
                        else {
                            localPos++;
                        }
                    }
                    return blockCode.substring(start, localPos);
                } else {
                    let bCount = 0;
                    let pCount = 0;
                    while(localPos < blockCode.length) {
                        let c = blockCode[localPos];
                        if (c === '{') bCount++;
                        else if (c === '}') bCount--;
                        else if (c === '(') pCount++;
                        else if (c === ')') pCount--;
                        else if (c === ';' && bCount === 0 && pCount === 0) {
                            localPos++;
                            break;
                        }
                        localPos++;
                    }
                    return blockCode.substring(start, localPos);
                }
            }
        }
    }

    // Top-level parser for functions, classes, structs and top-level code
    while(pos < cleanCode.length) {
        skipWhitespace();
        if (pos >= cleanCode.length) break;

        // Skip preprocessor directives and namespace directives
        if (cleanCode[pos] === '#') {
            readUntil(['\n']);
            pos++;
            continue;
        }
        if (matchWord('using') || matchWord('typedef')) {
            readUntil([';']);
            if (cleanCode[pos] === ';') pos++;
            continue;
        }

        let startPos = pos;
        let sig = readUntil(['{', ';']);
        let endChar = cleanCode[pos];

        if (endChar === ';') {
            // Variable declaration or function prototype at top level
            pos++;
            let stmtText = sig.trim();
            if (stmtText) {
                let node = createStatementNode(stmtText, getLineNumber(startPos));
                if (node) mainBody.push(node);
            }
            continue;
        } 
        else if (endChar === '{') {
            pos++;
            let blockStartPos = pos;
            let blockStr = readUntilMatchingBrace();
            let sigTrim = sig.trim();

            // Check if it's a class or struct: struct Point { int x, y; };
            if (sigTrim.startsWith('struct ') || sigTrim.startsWith('class ') || sigTrim.startsWith('union ')) {
                // Skip class/struct definition or treat methods inside
                let nameMatch = sigTrim.match(/(?:struct|class|union)\s+([a-zA-Z0-9_]+)/);
                let typeName = nameMatch ? nameMatch[1] : 'Type';
                // Read trailing semicolon if any
                skipWhitespace();
                if (cleanCode[pos] === ';') pos++;
                continue;
            }

            // Function definition: int gcd(int a, int b) { ... }
            let fnMatch = sigTrim.match(/^(?:template\s*<.*?>\s*)?(?:(?:inline|static|const|virtual|constexpr)\s+)*(.*?)\s*([a-zA-Z0-9_~]+)\s*\(([^)]*)\)\s*(?:const)?\s*$/);
            if (fnMatch) {
                let retType = fnMatch[1].trim() || undefined;
                let fnName = fnMatch[2].trim();
                let paramsStr = fnMatch[3].trim();
                let cleanParams = cleanCppParams(paramsStr);
                let fullName = `${fnName}(${cleanParams})`;
                
                let ast = parseBlock(blockStr, blockStartPos);

                if (fnName === 'main') {
                    mainBody = ast;
                } else {
                    functions.push({ name: fullName, returnType: retType, ast });
                }
            } else {
                // Generic block at top level
                let ast = parseBlock(blockStr, blockStartPos);
                mainBody.push(...ast);
            }
        }
    }

    mainBody = consolidateBlocks(mainBody);
    for (let f of functions) {
        f.ast = consolidateBlocks(f.ast);
    }

    return { main: mainBody, functions };
}
