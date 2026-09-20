import React, { useState, useMemo } from 'react';
import { Play, Code, Layout, ArrowRight, Maximize, Minimize } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';

import { parseCppSourceWhole } from './parseCpp';
import { mathify, cleanIoArgs, consolidateBlocks, isSubprogramCall, formatRangeToGost } from './mathify';
import { translatePythonLine } from './translate';
import { DiagramStyleConfig, getDiagramStyle } from './diagramStyles';

export type ASTNode = 
  | { type: 'stmt', id: string, text: string, kind: 'process'|'io'|'subprogram'|'end', width?: number, leftW?: number, rightW?: number, lineIndex?: number }
  | { type: 'if', id: string, condition: string, trueBlock: ASTNode[], falseBlock: ASTNode[], width?: number, leftW?: number, rightW?: number, lineIndex?: number }
  | { type: 'while', id: string, condition: string, body: ASTNode[], width?: number, leftW?: number, rightW?: number, lineIndex?: number }
  | { type: 'for', id: string, condition: string, body: ASTNode[], width?: number, leftW?: number, rightW?: number, lineIndex?: number }
  | { type: 'match', id: string, condition: string, cases: { condition: string, block: ASTNode[] }[], defaultBlock?: ASTNode[], width?: number, leftW?: number, rightW?: number, lineIndex?: number }
  | { type: 'with', id: string, condition: string, closeCondition: string, body: ASTNode[], width?: number, leftW?: number, rightW?: number, lineIndex?: number };

export interface FlowNode { id: string; type: string; text: string; x: number; y: number; height?: number; hidden?: boolean; lineIndex?: number; kind?: string; }
export interface FlowEdge { id?: string; points?: {x: number, y: number}[]; segments?: {startX: number, startY: number, endX: number, endY: number}[]; label?: string; noArrow?: boolean; labelPos?: {x: number, y: number}; hidden?: boolean; fromNodeId?: string; toNodeId?: string; }

export const DEFAULT_CODE = `import ui
import data_manager

def add_records(data):
    count = ui.get_int("\
Сколько записей вы хотите добавить?", min_val=1)
    if count is None: return

    for i in range(count):
        print(f"\
=== Ввод данных для заготовки #{i + 1} ===")

        name = ui.get_string("Название заготовки")
        if name is None: return

        material = ui.get_string("Материал")
        if material is None: return

        length = ui.get_float("Длина (в метрах)", min_val=0.001)
        if length is None: return

        width = ui.get_float("Ширина (в метрах)", min_val=0.001)
        if width is None: return

        height = ui.get_float("Высота (в метрах)", min_val=0.001)
        if height is None: return

        specific_weight = ui.get_float("Удельный вес (кг/м³)", min_val=0.1)
        if specific_weight is None: return

        quantity = ui.get_int("Количество на складе (шт)", min_val=0)
        if quantity is None: return

        weight = data_manager.calculate_weight(length, width, height, specific_weight)

        new_record = {
            'id': data_manager.get_next_id(data),
            'name': name,
            'material': material,
            'length': length,
            'width': width,
            'height': height,
            'specific_weight': specific_weight,
            'weight': weight,
            'quantity': quantity
        }
        data.append(new_record)
        ui.print_message("Запись успешно добавлена!")

def edit_record(data):
    ui.display_table(data)
    if not data: return

    target_id = ui.get_int("\
Введите ID записи для редактирования", min_val=1)
    if target_id is None: return

    item = next((row for row in data if row['id'] == target_id), None)
    if not item:
        ui.print_error("Запись с таким ID не найдена.")
        return

    print("\
Какое поле вы хотите изменить?")
    print("1. Название\
2. Материал\
3. Длину\
4. Ширину")
    print("5. Высоту\
6. Удельный вес\
7. Количество")

    choice = ui.get_int("Ваш выбор", min_val=1)
    if choice is None: return

    match choice:
        case 1:
            item['name'] = ui.get_string("Новое название")
        case 2:
            item['material'] = ui.get_string("Новый материал")
        case 3:
            item['length'] = ui.get_float("Новая длина", min_val=0.001)
        case 4:
            item['width'] = ui.get_float("Новая ширина", min_val=0.001)
        case 5:
            item['height'] = ui.get_float("Новая высота", min_val=0.001)
        case 6:
            item['specific_weight'] = ui.get_float("Новый уд. вес", min_val=0.1)
        case 7:
            item['quantity'] = ui.get_int("Новое кол-во", min_val=0)
        case _:
            ui.print_error("Неверный пункт.")
            return

    ui.print_message("Запись успешно обновлена.")

def delete_record(data):
    ui.display_table(data)
    if not data: return

    target_id = ui.get_int("\
Введите ID записи для удаления", min_val=1)
    if target_id is None: return

    for i, item in enumerate(data):
        if item['id'] == target_id:
            deleted = data.pop(i)
            ui.print_message(f"Заготовка '{deleted['name']}' (ID: {target_id}) удалена.")
            return

    ui.print_error("Запись с таким ID не найдена.")

def data_management_menu(data):
    while True:
        print("\
===================================")
        print("=== УПРАВЛЕНИЕ ДАННЫМИ ===")
        print("1. Добавить записи")
        print("2. Редактировать запись")
        print("3. Удалить запись")
        print("0. Вернуться в главное меню")
        print("===================================")

        choice = ui.get_int("Выберите действие", allow_cancel=True)

        match choice:
            case 1:
                add_records(data)
            case 2:
                edit_record(data)
            case 3:
                delete_record(data)
            case 0:
                break
            case _:
                ui.print_error("Неверный выбор.")

def search_and_sort_menu(data):
    if not data:
        ui.print_error("База данных пуста.")
        return

    while True:
        print("\
===================================")
        print("=== ПОИСК И ФИЛЬТРАЦИЯ ===")
        print("1. Поиск по ID, названию или материалу")
        print("2. Фильтрация деталей по материалу")
        print("3. Сортировать по количеству (по убыванию)")
        print("4. Сортировать по массе 1 шт (по убыванию)")
        print("0. Вернуться в главное меню")
        print("===================================")

        choice = ui.get_int("Выберите действие", allow_cancel=True)

        match choice:
            case 1:
                query = ui.get_string("Введите ID или ключевое слово")
                if query:
                    res = [item for item in data if (query.isdigit() and int(query) == item['id']) or query.lower() in item['name'].lower() or query.lower() in item['material'].lower()]
                    if res:
                        ui.display_table(res)
                    else:
                        ui.print_message("Ничего не найдено.")
            case 2:
                mat = ui.get_string("Введите материал для фильтрации")
                if mat:
                    res = [item for item in data if mat.lower() in item['material'].lower()]
                    if res:
                        ui.display_table(res)
                    else:
                        ui.print_message("Детали из такого материала не найдены.")
            case 3:
                sorted_data = sorted(data, key=lambda x: x['quantity'], reverse=True)
                ui.display_table(sorted_data)
            case 4:
                sorted_data = sorted(data, key=lambda x: x['weight'], reverse=True)
                ui.display_table(sorted_data)
            case 0:
                break
            case _:
                ui.print_error("Неверный выбор.")

def process_variant_task(data):
    if not data:
        ui.print_error("База данных пуста.")
        return

    target_name = ui.get_string("\
Название заготовки для транспортировки")
    if target_name is None: return

    max_capacity = ui.get_float("Максимальная грузоподъемность транспорта (кг)", min_val=0.1)
    if max_capacity is None: return

    success, report = data_manager.check_transportation(data, target_name, max_capacity)
    print("\
=== Отчет логистики ===")
    print(report)
    print("===================================")

def crafting_analysis(data):
    print("\
===================================")
    print("=== РАСЧЕТ СБОРКИ ИЗДЕЛИЙ ===")

    recipes = {
        "Деревянный ящик": {"Доска": 4, "Брус": 2},
        "Поддон (Палета)": {"Брус": 3, "Доска": 5},
        "Стеллаж": {"Уголок": 4, "Полка": 4}
    }

    print("Справочник доступных изделий:")
    for product, reqs in recipes.items():
        req_str = ", ".join([f"{k} ({v} шт.)" for k, v in reqs.items()])
        print(f" - {product}: {req_str}")

    print("\
Анализ вашего склада:")
    for product, reqs in recipes.items():
        max_can_build = float('inf')
        missing_items = []

        for req_name, req_qty in reqs.items():
            total_in_stock = sum(item['quantity'] for item in data if req_name.lower() in item['name'].lower())

            if total_in_stock == 0:
                missing_items.append(req_name)
                max_can_build = 0
            else:
                possible = total_in_stock // req_qty
                if possible < max_can_build:
                    max_can_build = possible

        if max_can_build > 0:
            print(f" [+] {product}: можно собрать {max_can_build} шт.")
        else:
            print(f" [-] {product}: собрать нельзя (не хватает: {', '.join(missing_items)})")

    print("===================================")

def main():
    print("Система складского учета заготовок v3.0")
    db = data_manager.load_data()

    while True:
        print("\
===================================")
        print("=== ГЛАВНОЕ МЕНЮ ===")
        print("1. Просмотр всех записей")
        print("2. Управление данными (Добавить/Изменить/Удалить)")
        print("3. Поиск и фильтрация")
        print("4. Анализ транспортировки")
        print("5. Расчет сборки изделий")
        print("6. Сохранить и выйти")
        print("===================================")

        choice = ui.get_int("Выберите действие (1-6)", allow_cancel=False)

        match choice:
            case 1:
                ui.display_table(db)
            case 2:
                data_management_menu(db)
            case 3:
                search_and_sort_menu(db)
            case 4:
                process_variant_task(db)
            case 5:
                crafting_analysis(db)
            case 6:
                data_manager.save_data(db)
                ui.print_message("Данные сохранены. Работа завершена.")
                break
            case _:
                ui.print_error("Такого пункта меню нет. Попробуйте снова.")

if __name__ == "__main__":
    main()
`;

const DEFAULT_CPP_CODE = "";

interface LogicalLine {
    text: string;
    origIndex: number;
}

function preprocessPythonLines(inputLines: LogicalLine[]): LogicalLine[] {
    function getLineIndent(ln: string) {
        const match = ln.match(/^(\s*)/);
        const prefix = match ? match[1] : '';
        return prefix.replace(/\t/g, '    ').length;
    }

    let outputLines: LogicalLine[] = [];
    let i = 0;
    while (i < inputLines.length) {
        let logical = inputLines[i];
        let line = logical.text;
        let trimmed = line.trim();
        let cleanTrimmed = trimmed.replace(/\s*:\s*$/, '');
        
        if (cleanTrimmed === 'try') {
            let tryIndent = getLineIndent(line);
            i++;
            
            let tryBlockLines: LogicalLine[] = [];
            let firstInnerIndent = -1;
            
            while (i < inputLines.length) {
                let innerLogical = inputLines[i];
                let innerLine = innerLogical.text;
                if (innerLine.trim() === '') {
                    tryBlockLines.push(innerLogical);
                    i++;
                    continue;
                }
                let innerIndent = getLineIndent(innerLine);
                if (innerIndent > tryIndent) {
                    if (firstInnerIndent === -1) {
                        firstInnerIndent = innerIndent;
                    }
                    let shift = firstInnerIndent - tryIndent;
                    let text = innerLine;
                    if (shift > 0) {
                        let newIndent = Math.max(0, innerIndent - shift);
                        text = ' '.repeat(newIndent) + innerLine.trim();
                    }
                    tryBlockLines.push({ text, origIndex: innerLogical.origIndex });
                    i++;
                } else {
                    break;
                }
            }
            
            let processedTryBlock = preprocessPythonLines(tryBlockLines);
            outputLines.push(...processedTryBlock);
            
            while (i < inputLines.length) {
                let peekLogical = inputLines[i];
                let peekLine = peekLogical.text;
                let peekTrimmed = peekLine.trim();
                let peekIndent = getLineIndent(peekLine);
                
                if (peekTrimmed === '') {
                    i++;
                    continue;
                }
                
                let cleanPeek = peekTrimmed.replace(/\s*:\s*$/, '');
                if (peekIndent === tryIndent && (
                    cleanPeek.startsWith('except') || 
                    cleanPeek.startsWith('finally') || 
                    cleanPeek === 'else'
                )) {
                    let isFinally = cleanPeek.startsWith('finally');
                    i++;
                    
                    let finallyBlockLines: LogicalLine[] = [];
                    let firstFinallyInnerIndent = -1;
                    
                    while (i < inputLines.length) {
                        let innerPeekLogical = inputLines[i];
                        let innerPeek = innerPeekLogical.text;
                        if (innerPeek.trim() === '') {
                            if (isFinally) finallyBlockLines.push(innerPeekLogical);
                            i++;
                            continue;
                        }
                        let innerIndent = getLineIndent(innerPeek);
                        if (innerIndent > tryIndent) {
                            if (isFinally) {
                                if (firstFinallyInnerIndent === -1) {
                                    firstFinallyInnerIndent = innerIndent;
                                }
                                let shift = firstFinallyInnerIndent - tryIndent;
                                let text = innerPeek;
                                if (shift > 0) {
                                    let newIndent = Math.max(0, innerIndent - shift);
                                    text = ' '.repeat(newIndent) + innerPeek.trim();
                                }
                                finallyBlockLines.push({ text, origIndex: innerPeekLogical.origIndex });
                            }
                            i++;
                        } else {
                            break;
                        }
                    }
                    if (isFinally && finallyBlockLines.length > 0) {
                        let processedFinallyBlock = preprocessPythonLines(finallyBlockLines);
                        outputLines.push(...processedFinallyBlock);
                    }
                } else {
                    break;
                }
            }
        } else {
            outputLines.push(logical);
            i++;
        }
    }
    return outputLines;
}

function cleanPythonParams(paramsStr: string): string {
    let parts: string[] = [];
    let current = '';
    let pCount = 0, bCount = 0;
    for (let char of paramsStr) {
        if (char === '(') pCount++;
        else if (char === ')') pCount--;
        else if (char === '[') bCount++;
        else if (char === ']') bCount--;
        
        if (char === ',' && pCount === 0 && bCount === 0) {
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
        let colonIdx = -1;
        let pC = 0, bC = 0;
        for (let j = 0; j < trimmed.length; j++) {
            let char = trimmed[j];
            if (char === '(') pC++;
            else if (char === ')') pC--;
            else if (char === '[') bC++;
            else if (char === ']') bC--;
            else if (char === ':' && pC === 0 && bC === 0) {
                colonIdx = j;
                break;
            }
        }
        
        let beforeColon = trimmed;
        if (colonIdx !== -1) {
            beforeColon = trimmed.substring(0, colonIdx).trim();
        }
        
        let eqIdx = beforeColon.indexOf('=');
        if (eqIdx !== -1) {
            beforeColon = beforeColon.substring(0, eqIdx).trim();
        }
        
        return beforeColon.trim();
    });
    
    return cleanedParts.filter(x => x !== '').join(', ');
}

export function parsePythonSourceWhole(code: string) {
    let cleanedCode = code.replace(/"""[\s\S]*?"""/g, (match) => {
        return match.split('\n').map(() => '').join('\n');
    });
    cleanedCode = cleanedCode.replace(/'''[\s\S]*?'''/g, (match) => {
        return match.split('\n').map(() => '').join('\n');
    });

    let rawLogicalLines: LogicalLine[] = [];
    let currentLogicalLine = '';
    let currentLogicalLineIndex: number | undefined = undefined;
    let pCount = 0, bCount = 0, cCount = 0;
    
    // Strip comments, being careful about # inside strings
    let inString = false;
    let stringChar = '';
    let processedCode = '';
    
    for (let j = 0; j < cleanedCode.length; j++) {
        let char = cleanedCode[j];
        if (inString) {
            if (char === '\\') {
                processedCode += char + cleanedCode[j+1];
                j++;
                continue;
            }
            if (char === stringChar) {
                inString = false;
            }
            processedCode += char;
        } else {
            if (char === '"' || char === "'") {
                inString = true;
                stringChar = char;
                processedCode += char;
            } else if (char === '#') {
                // skip until newline
                while (j < cleanedCode.length && cleanedCode[j] !== '\n') {
                    j++;
                }
                processedCode += '\n';
            } else {
                processedCode += char;
            }
        }
    }

    let processedLines = processedCode.split('\n');
    for (let idx = 0; idx < processedLines.length; idx++) {
        let r = processedLines[idx];
        // Find if line has a block keyword followed by colon and then more stuff
        let match = r.match(/^(\s*)(if\s+.*|elif\s+.*|else|while\s+.*|for\s+.*|case\s+.*|match\s+.*|def\s+.*)$/);
        // We will just do a simple char-by-char split on colons outside strings
        let inlineStatements: string[] = [];
        let inStr = false;
        let strChar = '';
        let lastSplit = 0;
        let isKeywordLine = !!r.trim().match(/^(if|elif|else|while|for|case|match|def)\b/);
        
        let pCountLocal = 0, bCountLocal = 0, cCountLocal = 0;
        for (let j = 0; j < r.length; j++) {
            let char = r[j];
            if (inStr) {
                if (char === '\\') j++;
                else if (char === strChar) inStr = false;
            } else {
                if (char === '"' || char === "'") {
                    inStr = true;
                    strChar = char;
                } else if (char === '(') {
                    pCountLocal++;
                } else if (char === ')') {
                    pCountLocal--;
                } else if (char === '[') {
                    bCountLocal++;
                } else if (char === ']') {
                    bCountLocal--;
                } else if (char === '{') {
                    cCountLocal++;
                } else if (char === '}') {
                    cCountLocal--;
                } else if (char === ':' && isKeywordLine && pCountLocal === 0 && bCountLocal === 0 && cCountLocal === 0) {
                    // Check if there is something after colon
                    let rest = r.substring(j + 1).trim();
                    if (rest !== '') {
                        let indentMatch = r.match(/^(\s*)/);
                        let baseIndent = indentMatch ? indentMatch[1] : '';
                        inlineStatements.push(r.substring(0, j + 1));
                        inlineStatements.push(baseIndent + '    ' + rest);
                        r = ''; // clear rest so we don't process it below
                        break;
                    }
                }
            }
        }
        
        if (inlineStatements.length > 0) {
            for (let stmt of inlineStatements) {
                if (stmt.trim() !== '') {
                    rawLogicalLines.push({ text: stmt, origIndex: idx });
                }
            }
            continue;
        }

        let codePart = r;
        
        let noStrCodePart = '';
        let inTempStr = false;
        let tempStrChar = '';
        for (let j = 0; j < codePart.length; j++) {
            let char = codePart[j];
            if (inTempStr) {
                if (char === '\\') j++;
                else if (char === tempStrChar) inTempStr = false;
            } else {
                if (char === '"' || char === "'") {
                    inTempStr = true;
                    tempStrChar = char;
                } else {
                    noStrCodePart += char;
                }
            }
        }

        for (let char of noStrCodePart) {
            if (char === '(') pCount++; else if (char === ')') pCount--;
            if (char === '[') bCount++; else if (char === ']') bCount--;
            if (char === '{') cCount++; else if (char === '}') cCount--;
        }
        
        if (currentLogicalLine === '') {
            currentLogicalLine = r;
            currentLogicalLineIndex = idx;
        } else {
            currentLogicalLine += ' ' + r.trim();
        }
        
        if (pCount <= 0 && bCount <= 0 && cCount <= 0) {
            // Reset negative counts just in case
            pCount = bCount = cCount = 0;
            rawLogicalLines.push({ text: currentLogicalLine, origIndex: currentLogicalLineIndex !== undefined ? currentLogicalLineIndex : idx });
            currentLogicalLine = '';
            currentLogicalLineIndex = undefined;
        }
    }
    if (currentLogicalLine !== '') {
        rawLogicalLines.push({ text: currentLogicalLine, origIndex: currentLogicalLineIndex !== undefined ? currentLogicalLineIndex : processedLines.length - 1 });
    }

    let processedLogicalLines = preprocessPythonLines(rawLogicalLines);
    let lines = processedLogicalLines.map(l => l.text);
    let logicalLineIndices = processedLogicalLines.map(l => l.origIndex);

    let functionsAst: {name: string, returnType?: string, ast: ASTNode[]}[] = [];
    
    let userDeclaredFunctions = new Set<string>();
    for (let ln of lines) {
        let t = ln.trim();
        if (t.startsWith('def ')) {
            let m = t.match(/def\s+([a-zA-Z0-9_]+)/);
            if (m) {
                userDeclaredFunctions.add(m[1]);
            }
        }
    }
    
    function getIndent(line: string) {
        const match = line.match(/^(\s*)/);
        const prefix = match ? match[1] : '';
        return prefix.replace(/\t/g, '    ').length;
    }

    function isCodeLine(line: string) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) return false;
        if (trimmed.startsWith('@') && !/^@\s*print/i.test(trimmed)) return false;
        
        const normalized = trimmed.replace(/^[frFR]/, '');
        if ((normalized.startsWith('"""') && normalized.endsWith('"""')) ||
            (normalized.startsWith("'''") && normalized.endsWith("'''")) ||
            (normalized.startsWith('"') && normalized.endsWith('"')) ||
            (normalized.startsWith("'") && normalized.endsWith("'"))) {
            return false;
        }
        return true;
    }

    let i = 0;
    let mainCodeLines: {line: string, index: number}[] = [];
    let idCounter = 1;
    let fileVarMap = new Map<string, string>();

    function parseLinesAsBlock(myLines: string[], expectedIndent: number, currentFuncName?: string, myLinesIndices?: number[]) {
        let i = 0;
        
        function getNext(startIndex: number) {
            for (let j = startIndex; j < myLines.length; j++) {
                if (isCodeLine(myLines[j])) return { index: j, text: myLines[j], indent: getIndent(myLines[j]) };
            }
            return null;
        }

        function getNextIndent(startIndex: number) {
            const res = getNext(startIndex);
            return res ? res.indent : 9999;
        }

        function parseElifsAndElse(baseIndent: number): ASTNode[] {
            const peekLine = getNext(i);
            if (!peekLine || peekLine.indent !== baseIndent) return [];
            
            let text = peekLine.text.trim();
            if (text.startsWith('else:')) {
                i = peekLine.index + 1;
                return parseBlockInternal(getNextIndent(i));
            } else if (text.startsWith('elif ')) {
                let condition = text.substring(5).replace(/:$/, '').trim();
                let matchingIndex = myLinesIndices ? myLinesIndices[peekLine.index] : undefined;
                i = peekLine.index + 1;
                let trueBlock = parseBlockInternal(getNextIndent(i));
                let falseBlock = parseElifsAndElse(baseIndent);
                return [{ type: 'if', id: `node-${idCounter++}`, condition, trueBlock, falseBlock, lineIndex: matchingIndex }];
            }
            return [];
        }

        function parseBlockInternal(expIndent: number): ASTNode[] {
            let statements: ASTNode[] = [];
            while (i < myLines.length) {
                let line = myLines[i];
                if (!isCodeLine(line)) {
                    i++; continue;
                }
                let indent = getIndent(line);
                if (indent < expIndent) break;
                
                let text = line.trim();
                text = text.replace(/:$/, '');
                
                if (text === 'else' || text === 'else:') {
                    i++; continue; 
                }
                
                if (text.startsWith('import ') || text.startsWith('from ')) {
                    i++; continue;
                }
                
                let matchingIndex = myLinesIndices ? myLinesIndices[i] : undefined;
                console.log("Block line: ", text, matchingIndex);

                if (text.startsWith('if ')) {
                    let condition = text.substring(3).trim();
                    condition = mathify(condition);
                    let matchingIndex = myLinesIndices ? myLinesIndices[i] : undefined;
                    i++;
                    let trueBlock = parseBlockInternal(getNextIndent(i));
                    let falseBlock = parseElifsAndElse(indent);
                    statements.push({ type: 'if', id: `node-${idCounter++}`, condition, trueBlock, falseBlock, lineIndex: matchingIndex });
                } 
                else if (text.startsWith('while ') || text.startsWith('for ')) {
                    let isFor = text.startsWith('for ');
                    let condition = isFor ? text.substring(4).trim() : text.substring(6).trim();
                    
                    if (isFor) {
                        let rangeMatch = condition.match(/^([a-zA-Z0-9_]+)\s+in\s+range\((.*)\)$/);
                        let enumMatch = condition.match(/^([a-zA-Z0-9_,\s]+)\s+in\s+enumerate\((.*)\)$/);
                        let inMatch = condition.match(/^([a-zA-Z0-9_,\s]+)\s+in\s+(.*?)$/);
                        
                        if (rangeMatch) {
                            let varName = rangeMatch[1];
                            let rawArgs = rangeMatch[2];
                            let args: string[] = [];
                            let curr = '';
                            let depth = 0;
                            for (let char of rawArgs) {
                                if (char === '(' || char === '[' || char === '{') depth++;
                                else if (char === ')' || char === ']' || char === '}') depth--;
                                if (char === ',' && depth === 0) {
                                    args.push(curr.trim());
                                    curr = '';
                                } else {
                                    curr += char;
                                }
                            }
                            if (curr.trim()) args.push(curr.trim());
                            condition = formatRangeToGost(varName, args);
                        } else if (enumMatch) {
                            condition = `Для каждого ${enumMatch[1].trim()} из списка ${mathify(enumMatch[2].trim())}`;
                        } else if (inMatch) {
                            condition = `Для каждого ${inMatch[1].trim()} из списка ${mathify(inMatch[2].trim())}`;
                        } else {
                            condition = mathify(condition);
                        }
                    } else {
                        condition = mathify(condition);
                    }
                    
                    let matchingIndex = myLinesIndices ? myLinesIndices[i] : undefined;
                    i++;
                    let body = parseBlockInternal(getNextIndent(i));
                    if (isFor) {
                        statements.push({ type: 'for', id: `node-${idCounter++}`, condition, body, lineIndex: matchingIndex });
                    } else {
                        statements.push({ type: 'while', id: `node-${idCounter++}`, condition, body, lineIndex: matchingIndex });
                    }
                }
                else if (text.startsWith('with ')) {
                    let matchingIndex = myLinesIndices ? myLinesIndices[i] : undefined;
                    let withMatch = text.match(/^with\s+open\((.*?)\)(?:\s+as\s+(.*?))?(?::)?$/);
                    if (!withMatch) withMatch = text.match(/^with\s+open\((.*?)\)(?::)?$/);
                    
                    let fileAction = 'чтения';
                    let fileName = '...';
                    if (withMatch) {
                        let argsMatch = withMatch[1].split(',').map(s => s.trim());
                        fileName = argsMatch[0];
                        if (argsMatch.length > 1) {
                            let mode = argsMatch[1];
                            let isWrite = mode.includes('w') || mode.includes('a') || mode.includes('x');
                            if (isWrite) fileAction = 'записи';
                        }
                    }
                    i++;
                    let body = parseBlockInternal(getNextIndent(i));
                    statements.push({
                        type: 'with',
                        id: `node-${idCounter++}`,
                        condition: `Открыть файл ${fileName} для ${fileAction}`,
                        closeCondition: `Закрытие файла ${fileName}`,
                        body: body,
                        lineIndex: matchingIndex
                    });
                }
                else if (text.startsWith('match ')) {
                    let matchVar = text.substring(6).trim().replace(/:$/, '');
                    let matchingIndex = myLinesIndices ? myLinesIndices[i] : undefined;
                    i++;
                    let matchIndent = getNextIndent(i);
                    let matchCases: {condition: string, block: ASTNode[]}[] = [];
                    let defaultBlock: ASTNode[] = [];
                    
                    while (i < myLines.length) {
                        const skipCheck = getNext(i);
                        if (!skipCheck || skipCheck.indent < matchIndent) break;
                        
                        let peekText = skipCheck.text.trim().replace(/:$/, '');
                        if (peekText.startsWith('case ') && skipCheck.indent === matchIndent) {
                            let caseVal = peekText.substring(5).trim();
                            i = skipCheck.index + 1;
                            let caseBlock = parseBlockInternal(getNextIndent(i));
                            
                            if (caseVal === '_') {
                                defaultBlock = caseBlock;
                            } else {
                                let condStr = caseVal.split('|').map(v => v.trim()).join(', ');
                                matchCases.push({ condition: condStr, block: caseBlock });
                            }
                        } else {
                            i++;
                        }
                    }
                    
                    statements.push({ type: 'match', id: `node-${idCounter++}`, condition: matchVar, cases: matchCases, defaultBlock, lineIndex: matchingIndex });
                }
                else {
                    let kind: 'process' | 'io' | 'subprogram' | 'end' = 'process';
                    let displayText = text;

                    if (text.includes('open(')) {
                        const assignMatch = text.match(/^([a-zA-Z0-9_]+)\s*=\s*/);
                        const openMatch = text.match(/open\s*\(\s*([^,\s)]+)/);
                        let filename = openMatch ? openMatch[1].trim() : 'файл';
                        filename = filename.replace(/^['"]|['"]$/g, '');
                        
                        if (assignMatch) {
                            const varName = assignMatch[1].trim();
                            fileVarMap.set(varName, filename);
                        }
                        
                        const isWrite = /mode\s*=\s*['"][wa]/.test(text) || /['"][wa]['"]/.test(text);
                        if (isWrite) {
                            kind = 'io';
                            displayText = `Открыть файл ${filename} для записи`;
                        } else {
                            kind = 'process';
                            displayText = `Открыть файл ${filename} для чтения`;
                        }
                    } else if (text.match(/^([a-zA-Z0-9_]+)\.close(?:\s*\(\s*\))?$/)) {
                        const closeMatch = text.match(/^([a-zA-Z0-9_]+)\.close(?:\s*\(\s*\))?$/);
                        const varName = closeMatch ? closeMatch[1] : 'файл';
                        let filename = fileVarMap.get(varName) || varName;
                        kind = 'process';
                        displayText = `Закрытие файла ${filename}`;
                    } else if (text.includes('.write(') || text.includes('writer.writerow') || text.includes('writer.writerows')) {
                        kind = 'io';
                        const fileVarMatch = text.match(/([a-zA-Z0-9_]+)\.write/);
                        const fileVar = fileVarMatch ? fileVarMatch[1] : '';
                        const filename = fileVarMap.get(fileVar) || fileVar;
                        const writeMatch = text.match(/\.write\s*\((.*?)\)/);
                        if (writeMatch) {
                            displayText = `Запись в файл ${filename}: ${mathify(writeMatch[1].trim())}`;
                        } else {
                            displayText = `Запись в файл ${filename}`;
                        }
                    } else if (text.includes('.read') || text.includes('csv.reader(') || text.includes('json.load(')) {
                        kind = 'io';
                        let matchAssign = text.match(/^([a-zA-Z0-9_,\s]+)\s*=/);
                        let varName = matchAssign ? matchAssign[1].trim() : '';
                        let fileVarMatch = text.match(/([a-zA-Z0-9_]+)\.read/);
                        let fileVar = fileVarMatch ? fileVarMatch[1] : '';
                        let filename = fileVarMap.get(fileVar) || fileVar;
                        if (text.includes('csv.reader(')) {
                            displayText = `Чтение CSV данных${varName ? ': ' + varName : ''}`;
                        } else if (text.includes('json.load(')) {
                            displayText = `Чтение JSON данных${varName ? ': ' + varName : ''}`;
                        } else {
                            displayText = `Чтение из файла ${filename}${varName ? ': ' + varName : ''}`;
                        }
                    } else if (/\b(input)\s*\(/.test(text) || /^([a-zA-Z0-9_]+)\s*=\s*(?:sys\.stdin\.readline|input)\s*\(/.test(text)) {
                        kind = 'io';
                        let match = text.match(/^([a-zA-Z0-9_]+)\s*=\s*(?:sys\.stdin\.readline|input)\s*\((.*?)\)$/);
                        if (match) {
                            let varName = match[1].trim();
                            let promptArg = match[2].trim();
                            let promptStr = '';
                            const strMatch = promptArg.match(/^(?:f?["'])(.*?)(?:["'])(?:,.*)?$/);
                            if (strMatch) {
                                promptStr = strMatch[1].replace(/[:?]+\s*$/, '').trim();
                            }
                            if (promptStr) {
                                displayText = `Ввод: ${varName} (${promptStr})`;
                            } else {
                                displayText = `Ввод: ${varName}`;
                            }
                        } else {
                            let simpleMatch = text.match(/^([a-zA-Z0-9_]+)\s*=\s*/);
                            if (simpleMatch) {
                                displayText = `Ввод: ${simpleMatch[1]}`;
                            } else {
                                displayText = `Ввод данных`;
                            }
                        }
                    } else if (/@?print\s*\(/.test(text)) {
                        kind = 'io';
                        let isForced = /^@\s*print/i.test(text.trim());
                        let match = text.match(/@?print\s*\((.*?)\)$/);
                        if (match) {
                             if (match[1].trim() === '') {
                                 i++; continue;
                             }
                             let argsCleaned = isForced ? match[1].trim() : cleanIoArgs(match[1]);
                             if (!argsCleaned) { i++; continue; }
                             displayText = `Вывод: ${mathify(argsCleaned)}`;
                        } else {
                             if (!isForced) { i++; continue; }
                             displayText = `Вывод данных`;
                        }
                    } else if (text.startsWith('return ') || text === 'return') {
                        let retVal = text.substring(6).trim();
                        let isComplex = retVal !== '' && (retVal.includes('for') || retVal.includes('max(') || retVal.includes('sum(') || retVal.includes('any(') || retVal.includes('all(') || retVal.includes('len(') || retVal.length > 20);
                        if (isComplex && currentFuncName) {
                            let processText = '';
                            if (currentFuncName === 'get_next_id') {
                                processText = 'Присвоить next_id значение: максимальный id из всех элементов data, увеличенный на 1';
                            } else {
                                processText = `Присвоить возвращаемое значение: ${translatePythonLine(retVal)}`;
                            }
                            let matchingIndex = myLinesIndices ? myLinesIndices[i] : undefined;
                            statements.push({ type: 'stmt', id: `node-${idCounter++}`, text: processText, kind: 'process', lineIndex: matchingIndex });
                            
                            kind = 'end';
                            displayText = 'return';
                        } else {
                            kind = 'end';
                            if (retVal) {
                                displayText = `Возврат: ${retVal}`;
                            } else {
                                displayText = `Возврат`;
                            }
                        }
                    } else {
                        // First see if it's a comprehension / generator we can translate
                        let translatedRightObj = translatePythonLine(text);
                        let isTranslated = translatedRightObj !== text;
                        let textContainsEq = false;
                        let assignmentOp = '=';
                        let leftSide = '';
                        let rightSide = text;

                        let assignMatch = text.match(/^([^=<>!]+?)\s*(\+=|-=|\*=|\/=|%=|\/\/=|\*\*=|=)\s*(.*)$/);
                        if (assignMatch) {
                            let rawLeft = assignMatch[1].trim();
                            assignmentOp = assignMatch[2].trim();
                            let rawRight = assignMatch[3].trim();
                            let colonIdx = rawLeft.indexOf(':');
                            if (colonIdx !== -1) {
                                rawLeft = rawLeft.substring(0, colonIdx).trim();
                            }
                            leftSide = rawLeft;
                            rightSide = rawRight;
                            textContainsEq = true;
                        }
                        
                        let wholeLineTranslated = isTranslated;
                        if (!isTranslated && textContainsEq) {
                            translatedRightObj = translatePythonLine(rightSide);
                            isTranslated = translatedRightObj !== rightSide;
                        }

                        if (isTranslated) {
                            if (wholeLineTranslated) {
                                displayText = mathify(translatedRightObj);
                            } else if (textContainsEq) {
                                displayText = `${mathify(leftSide)} ${assignmentOp} ${mathify(translatedRightObj)}`;
                            } else {
                                displayText = mathify(translatedRightObj);
                            }
                        } else if (/^[^=()]+\s*\(.*?\)$/.test(text) || /^[^=]+\s*=\s*[^=()]+\s*\(.*?\)$/.test(text)) {
                            let matchArg = text.match(/^([^=]+=\s*)?([^=()]+)\s*\((.*?)\)$/);
                            let prefix = '';
                            let funcName = '';
                            let args = '';
                            if (matchArg) {
                                prefix = matchArg[1] || '';
                                if (prefix) {
                                    let colonIdx = prefix.indexOf(':');
                                    if (colonIdx !== -1) {
                                        prefix = prefix.substring(0, colonIdx).trim() + ' = ';
                                    }
                                }
                                funcName = matchArg[2].trim();
                                args = matchArg[3];
                            }
                            
                            if (matchArg && isSubprogramCall(funcName, userDeclaredFunctions)) {
                                kind = 'subprogram';
                                let cleanedArgs = cleanIoArgs(args);
                                displayText = mathify(`${prefix}${funcName}(${cleanedArgs})`);
                            } else {
                                kind = 'process';
                                if (matchArg) {
                                    let cleanedArgs = cleanIoArgs(args);
                                    displayText = mathify(`${prefix}${funcName}(${cleanedArgs})`);
                                        } else {
                                    displayText = mathify(text);
                                }
                            }
                        } else if (textContainsEq) {
                            let left = leftSide;
                            let right = rightSide;
                            if (left && right) {
                                if (right === '[]' || right === 'list()') {
                                    displayText = `Создание пустого списка ${mathify(left)}`;
                                } else if (right === '{}' || right === 'dict()') {
                                    displayText = `Создание пустого словаря ${mathify(left)}`;
                                } else if (right === 'set()') {
                                    displayText = `Создание пустого множества ${mathify(left)}`;
                                } else if (right === '""' || right === "''" || right === 'str()') {
                                    displayText = `Создание пустой строки ${mathify(left)}`;
                                } else if ((right.startsWith('{') && right.endsWith('}')) && right.length > 20) {
                                    displayText = `Заполнение словаря ${mathify(left)}`;
                                } else if (right.startsWith('[') && right.endsWith(']') && right.length > 20) {
                                    displayText = `Заполнение списка ${mathify(left)}`;
                                } else if (right.startsWith('[') && right.endsWith(']')) {
                                    displayText = `Объявление массива ${mathify(left)} = ${mathify(right)}`;
                                } else {
                                    right = right.replace(/\[(.*?)\]/g, (match, inner) => {
                                        let items = inner.split(',').map((s: string) => s.trim());
                                        if (items.length > 4) {
                                             return `[${items[0]}, ${items[1]}, ..., ${items[items.length-1]}]`;
                                        }
                                        return match;
                                    });
                                    displayText = `${mathify(left)} ${assignmentOp} ${mathify(right)}`;
                                }
                            } else {
                                displayText = mathify(text);
                            }
                        } else {
                            displayText = mathify(text);
                        }
                    }

                    let matchingIndex = myLinesIndices ? myLinesIndices[i] : undefined;
                    if (text === 'pass' || text === 'continue' || text === 'break') {
                        statements.push({ type: 'stmt', id: `node-${idCounter++}`, text, kind: 'process', lineIndex: matchingIndex });
                    } else {
                        statements.push({ type: 'stmt', id: `node-${idCounter++}`, text: displayText, kind, lineIndex: matchingIndex });
                    }
                    i++;
                }
            }
            return statements;
        }
        
        return parseBlockInternal(expectedIndent);
    }

    while (i < lines.length) {
        let line = lines[i];
        if (!isCodeLine(line)) { i++; continue; }
        
        let trimmed = line.trim();
        let indent = getIndent(line);
        if (trimmed.startsWith('class ')) {
             // Ignore the class declaration itself, but continue so we can parse its methods
             i++;
             continue;
        }

        if (trimmed.startsWith('def ')) {
            let funcNameMatch = trimmed.match(/def\s+([a-zA-Z0-9_]+)\s*\((.*?)\)(?:\s*->\s*(.*?))?:/);
            let funcName = funcNameMatch ? `${funcNameMatch[1]}(${cleanPythonParams(funcNameMatch[2])})` : 'func';
            let returnType = funcNameMatch && funcNameMatch[3] ? funcNameMatch[3].trim() : undefined;
            let defIndent = indent;
            
            let funcLines = [];
            let funcLinesIndices = [];
            i++;
            while (i < lines.length) {
                if (!isCodeLine(lines[i])) {
                    funcLines.push(lines[i]);
                    funcLinesIndices.push(logicalLineIndices[i]);
                    i++;
                    continue;
                }
                if (getIndent(lines[i]) <= defIndent) break;
                funcLines.push(lines[i]);
                funcLinesIndices.push(logicalLineIndices[i]);
                i++;
            }
            
            let firstCode = funcLines.find(l => isCodeLine(l));
            let expectedIdent = firstCode ? getIndent(firstCode) : defIndent + 4;
            let funcSimpleName = funcNameMatch ? funcNameMatch[1] : 'func';
            let ast = parseLinesAsBlock(funcLines, expectedIdent, funcSimpleName, funcLinesIndices);
            functionsAst.push({ name: funcName, returnType, ast });
        } else {
            mainCodeLines.push({line, index: logicalLineIndices[i]});
            i++;
        }
    }
    
    let mainAst = mainCodeLines.length > 0 ? parseLinesAsBlock(mainCodeLines.map(v=>v.line), 0, undefined, mainCodeLines.map(v=>v.index)) : [];
    
    mainAst = consolidateBlocks(mainAst);
    for (let f of functionsAst) {
        f.ast = consolidateBlocks(f.ast);
    }
    
    return { main: mainAst, functions: functionsAst };
}

function orthogonalRoute(p1: {x:number, y:number}, p2: {x:number, y:number}) {
    if (Math.abs(p1.x - p2.x) < 1 && Math.abs(p1.y - p2.y) < 1) return [p1, p2];
    if (Math.abs(p1.x - p2.x) < 1) return [p1, p2];
    if (Math.abs(p1.y - p2.y) < 1) return [p1, p2];
    let midY = Math.max(p1.y, p2.y) - 20;
    if (p1.y < p2.y - 40) midY = (p1.y + p2.y) / 2;
    return [p1, {x: p1.x, y: midY}, {x: p2.x, y: midY}, p2];
}

export function buildGraphs(code: string, language: string, activeOverrides: any = {}, splitMode: 'auto' | 'manual' = 'auto', allCustomCuts: Record<number, number[]> = {}, isScissorsMode: boolean = false, diagramStyleId: string = 'classic_gost') {
    const parsed = language === 'cpp' ? parseCppSourceWhole(code) : parsePythonSourceWhole(code);
    let graphs = [];
    let idx = 0;
    if (parsed.main.length > 0) {
        graphs.push(buildGraphForAst(parsed.main, 'Main', undefined, true, activeOverrides[idx] || {}, splitMode, allCustomCuts[idx] || [], isScissorsMode, diagramStyleId));
        idx++;
    }
    for (let f of parsed.functions) {
        graphs.push(buildGraphForAst(f.ast, f.name, (f as any).returnType, false, activeOverrides[idx] || {}, splitMode, allCustomCuts[idx] || [], isScissorsMode, diagramStyleId));
        idx++;
    }
    return graphs;
}

function buildGraphForAst(ast: ASTNode[], title: string, returnType: string | undefined, isMain: boolean, graphOverrides: any = {}, splitMode: 'auto' | 'manual' = 'auto', customCuts: number[] = [], isScissorsMode: boolean = false, diagramStyleId: string = 'classic_gost') {
    const style = getDiagramStyle(diagramStyleId);
    const NODE_WIDTH = style.nodeWidth;
    const X_SEP = style.xSep;
    const Y_MARGIN = style.yMargin;
    const cleanTitle = isMain ? '' : title.split('(')[0].trim();

    function getASTNodeHeight(node: ASTNode | undefined): number {
        if (!node) return style.baseHeight;
        let t = node.type === 'stmt' ? node.text : node.condition;
        
        if (graphOverrides?.nodes?.[node.id]?.text !== undefined) {
             t = graphOverrides.nodes[node.id].text;
        } else {
            if (node.type === 'stmt' && node.kind === 'end') {
                if (isMain) t = 'Конец';
                else {
                    t = `Выход из п/п\n${cleanTitle}` + (returnType ? ` (${returnType})` : ``);
                }
            }
        }
        let shapeType = node.type === 'stmt' ? node.kind : (node.type === 'while' ? 'decision' : (node.type === 'for' ? 'loop' : (node.type === 'with' ? 'process' : 'decision')));
        return getNodeHeight(t, shapeType, style);
    }
    
    function yStep(n1: ASTNode | undefined, n2: ASTNode | undefined) {
        return getASTNodeHeight(n1)/2 + Y_MARGIN + getASTNodeHeight(n2)/2;
    }

    function blockTerminates(nodes: ASTNode[]): boolean {
        for (let node of nodes) {
            if (node.type === 'stmt' && node.kind === 'end') {
                return true;
            }
            if (node.type === 'if') {
                if (blockTerminates(node.trueBlock) && blockTerminates(node.falseBlock)) {
                    return true;
                }
            }
        }
        return false;
    }

    function computeWidthsMulti(nodes: ASTNode[]) {
        for (let node of nodes) {
            if (node.type === 'stmt') {
                node.leftW = NODE_WIDTH/2;
                node.rightW = NODE_WIDTH/2;
                node.width = NODE_WIDTH + X_SEP;
            } else if (node.type === 'if') {
                computeWidthsMulti(node.trueBlock);
                computeWidthsMulti(node.falseBlock);
                let trueLeftW = 0, trueRightW = 0;
                let falseLeftW = 0, falseRightW = 0;
                if (node.trueBlock.length > 0) {
                    trueLeftW = Math.max(...node.trueBlock.map(n => n.leftW!));
                    trueRightW = Math.max(...node.trueBlock.map(n => n.rightW!));
                }
                if (node.falseBlock.length > 0) {
                    falseLeftW = Math.max(...node.falseBlock.map(n => n.leftW!));
                    falseRightW = Math.max(...node.falseBlock.map(n => n.rightW!));
                }
                
                let trueEmpty = node.trueBlock.length === 0;
                let falseEmpty = node.falseBlock.length === 0;
                
                if (falseEmpty && !trueEmpty) {
                    node.leftW = Math.max(NODE_WIDTH/2 + 20, trueLeftW + 45);
                    node.rightW = Math.max(NODE_WIDTH/2, trueRightW);
                    (node as any).isFalseEmpty = true;
                } else if (trueEmpty && !falseEmpty) {
                    node.leftW = Math.max(NODE_WIDTH/2, falseLeftW);
                    node.rightW = Math.max(NODE_WIDTH/2 + 20, falseRightW + 45);
                    (node as any).isTrueEmpty = true;
                } else {
                    let margin = 20;
                    let trueShift = Math.max(NODE_WIDTH/2 + margin, trueLeftW + margin);
                    let falseShift = Math.max(NODE_WIDTH/2 + margin, falseRightW + margin);
                    
                    (node as any).trueShift = trueShift;
                    (node as any).falseShift = falseShift;
                    
                    node.leftW = Math.max(NODE_WIDTH/2, falseShift + falseLeftW);
                    node.rightW = Math.max(NODE_WIDTH/2, trueShift + trueRightW);
                }
                node.width = node.leftW + node.rightW;
            } else if (node.type === 'while' || node.type === 'for' || node.type === 'with') {
                computeWidthsMulti(node.body);
                let bodyLeftW = 0;
                let bodyRightW = 0;
                if (node.body.length > 0) {
                    bodyLeftW = Math.max(...node.body.map(n => n.leftW!));
                    bodyRightW = Math.max(...node.body.map(n => n.rightW!));
                }
                node.leftW = Math.max(NODE_WIDTH/2 + X_SEP, bodyLeftW + X_SEP);
                node.rightW = Math.max(NODE_WIDTH/2 + X_SEP, bodyRightW + X_SEP);
                node.width = node.leftW + node.rightW;
            } else if (node.type === 'match') {
                let currentPos = 0;
                let casesPositions: number[] = [];
                let branchWidths: {left: number, right: number}[] = [];
                
                for (let i = 0; i < node.cases.length; i++) {
                    const c = node.cases[i];
                    computeWidthsMulti(c.block);
                    let cLeft = c.block.length > 0 ? Math.max(...c.block.map(n => n.leftW!)) : NODE_WIDTH/2;
                    let cRight = c.block.length > 0 ? Math.max(...c.block.map(n => n.rightW!)) : NODE_WIDTH/2;
                    branchWidths.push({left: cLeft, right: cRight});
                }
                
                let defaultLeft = NODE_WIDTH/2;
                let defaultRight = NODE_WIDTH/2;
                if (node.defaultBlock && node.defaultBlock.length > 0) {
                    computeWidthsMulti(node.defaultBlock);
                    defaultLeft = Math.max(...node.defaultBlock.map(n => n.leftW!));
                    defaultRight = Math.max(...node.defaultBlock.map(n => n.rightW!));
                }
                
                // Calculate total width of all branches laid out side by side
                let totalWidth = 0;
                for (let i = 0; i < branchWidths.length; i++) {
                    totalWidth += (i > 0 ? X_SEP : 0) + branchWidths[i].left + branchWidths[i].right;
                }
                totalWidth += X_SEP + defaultLeft + defaultRight;
                
                let startX = -totalWidth / 2; // Center around 0
                let currentX = startX;
                
                let casesShifts: number[] = [];
                for (let i = 0; i < branchWidths.length; i++) {
                    casesShifts.push(currentX + branchWidths[i].left);
                    currentX += branchWidths[i].left + branchWidths[i].right + X_SEP;
                }
                let defaultShift = currentX + defaultLeft;
                
                let minShift = casesShifts.length > 0 ? casesShifts[0] - branchWidths[0].left : defaultShift - defaultLeft;
                let maxShift = defaultShift + defaultRight;
                
                (node as any).casesShifts = casesShifts;
                (node as any).defaultShift = defaultShift;
                
                node.leftW = Math.max(NODE_WIDTH/2 + X_SEP, -minShift);
                node.rightW = Math.max(NODE_WIDTH/2 + X_SEP, maxShift);
                node.width = node.leftW + node.rightW;
            }
        }
    }
    
    computeWidthsMulti(ast);

    let disablePagination = true;
    let allNodes: FlowNode[] = [];
    let allEdges: FlowEdge[] = [];
    
    let jumpCounter = 'A'.charCodeAt(0);
    let globalColumnStartY = 60;
    let usedReturnX: number[] = [];

    function estimateHeight(nodes: ASTNode[]): number {
        let h = 0;
        for (let n of nodes) {
            let nodeH = getASTNodeHeight(n);
            if (n.type === 'if') {
                 h += nodeH + 20 + Math.max(estimateHeight(n.trueBlock), estimateHeight(n.falseBlock)) + 40;
            } else if (n.type === 'while' || n.type === 'for' || n.type === 'with') {
                 h += nodeH + 20 + estimateHeight(n.body) + 60;
            } else if (n.type === 'match') {
                 let maxC = 0;
                 if (n.cases) {
                     for (let c of n.cases) maxC = Math.max(maxC, estimateHeight(c.block));
                 }
                 if (n.defaultBlock) maxC = Math.max(maxC, estimateHeight(n.defaultBlock));
                 h += nodeH + 20 + maxC + 80;
            } else {
                 h += nodeH + 20;
            }
        }
        return h;
    }

    function layout(nodes: ASTNode[], cx: number, cy: number, incomingPoints: {x:number, y:number, from?:any, label?:string, labelPos?: {x:number,y:number}, limitX?: number}[], isRoot: boolean = false, loopBreaks: any[] = [], loopContinues: any[] = [], parentAllowsPagination: boolean = true): { endPoints: {x:number, y:number, from?:any, label?:string, labelPos?: {x:number,y:number}, limitX?: number}[], finalY: number, endCx: number } {
        let currentY = cy;
        let inPts = incomingPoints;
        let maxReachedY = cy;
        
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const h = getASTNodeHeight(node);
            const nextNode = i + 1 < nodes.length ? nodes[i+1] : undefined;
            const nextH = nextNode ? getASTNodeHeight(nextNode) : 0;

            maxReachedY = Math.max(maxReachedY, currentY);

            if (inPts.length > 0) {
                const targetPoint = { x: cx, y: currentY - h/2 };
                const mergeY = targetPoint.y - 20;

                let incomingLabel: string | undefined = undefined;
                let incomingLabelPos: { x: number, y: number } | undefined = undefined;
                let hasZeroLengthForLabel = false;

                for (const p of inPts) {
                    if (p.label) {
                        incomingLabel = p.label;
                        incomingLabelPos = p.labelPos;
                        if (p.from && Math.abs(p.from.y - mergeY) < 1) {
                            hasZeroLengthForLabel = true;
                        }
                    }
                    if (p.from) {
                        const px = (p as any).limitX || p.x;
                        allEdges.push({ 
                            points: [p.from, {x: px, y: p.from.y}, {x: px, y: mergeY}, {x: cx, y: mergeY}], 
                            label: p.label, 
                            labelPos: p.labelPos ? { ...p.labelPos } : undefined,
                            noArrow: true 
                        });
                    } else {
                        if (Math.abs(p.x - cx) < 1) {
                            allEdges.push({ points: [p, {x: cx, y: mergeY}], noArrow: true });
                        } else {
                            allEdges.push({ points: [p, {x: p.x, y: mergeY}, {x: cx, y: mergeY}], noArrow: true });
                        }
                    }
                }
                
                allEdges.push({ 
                    points: [{x: cx, y: mergeY}, targetPoint],
                    label: hasZeroLengthForLabel ? incomingLabel : undefined,
                    labelPos: hasZeroLengthForLabel ? (incomingLabelPos ? { ...incomingLabelPos } : { x: cx + 12, y: mergeY + 12 }) : undefined
                });
                inPts = [];
            }
            
            if (node.type === 'stmt') {
                let adjustedText = node.text;
                if (node.kind === 'end') {
                    if (isMain) {
                        adjustedText = 'Конец';
                    } else {
                        adjustedText = `Выход из п/п\n${cleanTitle}` + (returnType ? ` (${returnType})` : ``);
                    }
                }
                allNodes.push({ id: node.id, type: node.kind, text: adjustedText, x: cx, y: currentY, height: h, lineIndex: node.lineIndex });
                if (node.kind === 'end') {
                    inPts = [];
                } else {
                    inPts = [{ x: cx, y: currentY + h/2 }];
                }
                currentY += h/2 + Y_MARGIN + nextH/2;
                maxReachedY = Math.max(maxReachedY, currentY);
            } else if (node.type === 'if') {
                allNodes.push({ id: node.id, type: 'decision', text: node.condition, x: cx, y: currentY, height: h, lineIndex: node.lineIndex });
                
                let trueShift = (node as any).trueShift || (NODE_WIDTH/2 + X_SEP/2);
                let falseShift = (node as any).falseShift || (NODE_WIDTH/2 + X_SEP/2);
                let trueCx = cx + trueShift;
                let falseCx = cx - falseShift;
                
                let rightOut = { x: cx + NODE_WIDTH/2, y: currentY };
                let leftOut = { x: cx - NODE_WIDTH/2, y: currentY };
                let bottomOut = { x: cx, y: currentY + h/2 };
                
                let trueEnds: any[], falseEnds: any[];
                let localMax = currentY;
                
                let trueTerminates = false;
                let falseTerminates = false;
                let tFinalY = currentY;
                let fFinalY = currentY;
                
                let trueFrom = rightOut;
                let falseFrom = leftOut;
                let trueLabelPos = {x: rightOut.x + 10, y: rightOut.y - 10};
                let falseLabelPos = {x: leftOut.x - 25, y: leftOut.y - 10};
                
                if ((node as any).isFalseEmpty) {
                    trueCx = cx;
                    trueFrom = bottomOut;
                    trueLabelPos = {x: bottomOut.x + 35, y: bottomOut.y + 5};
                    falseCx = cx - node.leftW + 20;
                } else if ((node as any).isTrueEmpty) {
                    falseCx = cx;
                    falseFrom = bottomOut;
                    falseLabelPos = {x: bottomOut.x - 35, y: bottomOut.y + 15};
                    trueFrom = rightOut;
                    trueCx = cx + node.rightW - 20;
                }
                
                if (node.trueBlock.length > 0) {
                    let firstTrueY = currentY + h/2 + Y_MARGIN + getASTNodeHeight(node.trueBlock[0])/2;
                    let isSingleTerm = (blockTerminates(node.trueBlock) && node.trueBlock.length === 1);
                    if (isSingleTerm && node.falseBlock.length === 0) {
                        firstTrueY = currentY + h/2 + Y_MARGIN + getASTNodeHeight(node.trueBlock[0])/2;
                    }
                    const tRes = layout(node.trueBlock, trueCx, firstTrueY, [{ x: trueCx, y: currentY, from: trueFrom, label: 'Да', labelPos: trueLabelPos }], false, loopBreaks, loopContinues);
                    trueEnds = tRes.endPoints;
                    if (trueEnds.length === 0) trueTerminates = true;
                    tFinalY = tRes.finalY;
                    if (isSingleTerm && node.falseBlock.length === 0) {
                        tFinalY = firstTrueY + getASTNodeHeight(node.trueBlock[0])/2 + Y_MARGIN;
                    }
                    localMax = Math.max(localMax, tFinalY);
                } else {
                    trueEnds = [{x: trueCx, y: currentY, from: trueFrom, label: 'Да', labelPos: trueLabelPos}];
                }
                
                if (node.falseBlock.length > 0) {
                    let firstFalseY = currentY + h/2 + Y_MARGIN + getASTNodeHeight(node.falseBlock[0])/2;
                    let isSingleTerm = (blockTerminates(node.falseBlock) && node.falseBlock.length === 1);
                    if (isSingleTerm && node.trueBlock.length === 0) {
                        firstFalseY = currentY + h/2 + Y_MARGIN + getASTNodeHeight(node.falseBlock[0])/2;
                    }
                    const fRes = layout(node.falseBlock, falseCx, firstFalseY, [{ x: falseCx, y: currentY, from: falseFrom, label: 'Нет', labelPos: falseLabelPos }], false, loopBreaks, loopContinues);
                    falseEnds = fRes.endPoints;
                    if (falseEnds.length === 0) falseTerminates = true;
                    fFinalY = fRes.finalY;
                    if (isSingleTerm && node.trueBlock.length === 0) {
                        fFinalY = firstFalseY + getASTNodeHeight(node.falseBlock[0])/2 + Y_MARGIN;
                    }
                    localMax = Math.max(localMax, fFinalY);
                } else {
                    falseEnds = [{x: falseCx, y: currentY, from: falseFrom, label: 'Нет', labelPos: falseLabelPos}];
                }
                
                if (trueTerminates && node.falseBlock.length === 0 && !(node as any).isFalseEmpty) {
                    falseEnds = [{ 
                        x: cx, y: currentY + h/2, 
                        from: bottomOut, 
                        label: 'Нет', 
                        labelPos: {x: bottomOut.x - 35, y: bottomOut.y + 15},
                        limitX: cx
                    }];
                } else if (falseTerminates && node.trueBlock.length === 0 && !(node as any).isTrueEmpty) {
                    trueEnds = [{ 
                        x: cx, y: currentY + h/2, 
                        from: bottomOut, 
                        label: 'Да', 
                        labelPos: {x: bottomOut.x + 35, y: bottomOut.y + 15},
                        limitX: cx
                    }];
                }
                
                let mergeMax = currentY + h/2;
                if (node.trueBlock.length > 0) mergeMax = Math.max(mergeMax, tFinalY);
                if (node.falseBlock.length > 0) mergeMax = Math.max(mergeMax, fFinalY);
                let commonY = mergeMax + Y_MARGIN;
                
                if (trueTerminates && falseTerminates) {
                    inPts = [];
                } else if (trueTerminates && !falseTerminates) {
                    inPts = falseEnds.map(pt => ({ ...pt, y: Math.max(pt.y || 0, commonY) }));
                } else if (!trueTerminates && falseTerminates) {
                    inPts = trueEnds.map(pt => ({ ...pt, y: Math.max(pt.y || 0, commonY) }));
                } else {
                    for (let pt of trueEnds) {
                         let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos ? { ...pt.labelPos } : undefined} : {};
                         if (pt.from) {
                             let px = (pt as any).limitX || pt.x;
                             allEdges.push({ 
                                  points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}, {x: cx, y: commonY}], 
                                  ...extra, noArrow: Math.abs(px - cx) < 1
                             });
                         } else {
                             allEdges.push({ points: [pt, {x: pt.x, y: commonY}, {x: cx, y: commonY}], ...extra, noArrow: Math.abs(pt.x - cx) < 1 });
                         }
                    }
                    for (let pt of falseEnds) {
                         let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos ? { ...pt.labelPos } : undefined} : {};
                         if (pt.from) {
                             let px = (pt as any).limitX || pt.x;
                             allEdges.push({ 
                                  points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}, {x: cx, y: commonY}], 
                                  ...extra, noArrow: Math.abs(px - cx) < 1
                             });
                         } else {
                             allEdges.push({ points: [pt, {x: pt.x, y: commonY}, {x: cx, y: commonY}], ...extra, noArrow: Math.abs(pt.x - cx) < 1 });
                         }
                    }
                    inPts = [{x: cx, y: commonY, label: '', skipTopVertical: true } as any];
                }
                
                currentY = commonY + Y_MARGIN + (nextH || 0)/2;
                maxReachedY = Math.max(maxReachedY, currentY);
            } else if (node.type === 'match') {
                allNodes.push({ id: node.id, type: 'decision', text: node.condition, x: cx, y: currentY, height: h, lineIndex: node.lineIndex });
                
                const casesShifts = (node as any).casesShifts as number[];
                const defaultShift = (node as any).defaultShift as number;
                
                let commonY = currentY;
                let branchEnds: any[] = [];
                let matchBreaks: any[] = [];
                let matchContinues: any[] = [];
                
                // Track where the horizontal line connects to branches
                let horizontalLineY = currentY + h/2; // this horizontal line doesn't work well directly if we need to draw it exactly below. The diagram shows: 
                // decision -> horizontal bar -> branches down
                // The switch has one down out, then a horiz line, then down to cases
                
                let lineY = currentY + h/2 + 15;
                allEdges.push({ points: [{x: cx, y: currentY + h/2}, {x: cx, y: lineY}], noArrow: true });
                
                let minBranchCx = casesShifts.length > 0 ? cx + casesShifts[0] : cx + defaultShift;
                let maxBranchCx = cx + defaultShift;
                allEdges.push({ points: [{x: minBranchCx, y: lineY}, {x: maxBranchCx, y: lineY}], noArrow: true });
                
                for (let i = 0; i < node.cases.length; i++) {
                    const c = node.cases[i];
                    const shift = casesShifts[i];
                    const branchCx = cx + shift; 
                    
                    let outP = {x: branchCx, y: lineY + 30};
                    
                    allEdges.push({ 
                        points: [{x: branchCx, y: lineY}, {x: branchCx, y: outP.y}],
                        label: c.condition,
                        labelPos: {x: branchCx, y: lineY - 6},
                        noArrow: true 
                    });
                    
                    if (c.block.length > 0) {
                        let firstBlockY = outP.y + getASTNodeHeight(c.block[0])/2;
                        let bRes = layout(c.block, branchCx, firstBlockY, [{x: branchCx, y: outP.y, from: {x: branchCx, y: lineY}}], false, matchBreaks, matchContinues);
                        branchEnds.push(...bRes.endPoints);
                        if (bRes.endPoints.length > 0) {
                            commonY = Math.max(commonY, bRes.finalY);
                        }
                    } else {
                        branchEnds.push({x: branchCx, y: outP.y, from: {x: branchCx, y: lineY}});
                    }
                }
                
                // Add default branch
                const defBranchCx = cx + defaultShift;
                let defOutP = {x: defBranchCx, y: lineY + 30};
                allEdges.push({ 
                    points: [{x: defBranchCx, y: lineY}, {x: defBranchCx, y: defOutP.y}],
                    label: 'Иначе',
                    labelPos: {x: defBranchCx, y: lineY - 6},
                    noArrow: true 
                });
                
                if (node.defaultBlock && node.defaultBlock.length > 0) {
                    let firstBlockY = defOutP.y + getASTNodeHeight(node.defaultBlock[0])/2;
                    let bRes = layout(node.defaultBlock, defBranchCx, firstBlockY, [{x: defBranchCx, y: defOutP.y, from: {x: defBranchCx, y: lineY}}], false, matchBreaks, matchContinues);
                    branchEnds.push(...bRes.endPoints);
                    if (bRes.endPoints.length > 0) {
                        commonY = Math.max(commonY, bRes.finalY);
                    }
                } else {
                    branchEnds.push({x: defBranchCx, y: defOutP.y, from: {x: defBranchCx, y: lineY}});
                }

                branchEnds.push(...matchBreaks.map(brk => {
                    return { ...brk, from: brk };
                }));
                branchEnds.push(...matchContinues.map(cont => {
                    return { ...cont, from: cont };
                }));

                commonY += 15;
                
                let minEndCx = cx;
                let maxEndCx = cx;
                
                for (let pt of branchEnds) {
                    let px = pt.limitX || pt.x;
                    minEndCx = Math.min(minEndCx, px);
                    maxEndCx = Math.max(maxEndCx, px);
                    
                    let extra = pt.label ? {label: pt.label, labelPos: pt.labelPos} : {};
                    if (pt.from) {
                        allEdges.push({ 
                            points: [pt.from, {x: px, y: pt.from.y}, {x: px, y: commonY}],
                            ...extra,
                            noArrow: true
                        });
                    } else {
                        allEdges.push({ points: [pt, {x: pt.x, y: commonY}], noArrow: true });
                    }
                }
                
                if (minEndCx < maxEndCx) {
                    allEdges.push({ points: [{x: minEndCx, y: commonY}, {x: maxEndCx, y: commonY}], noArrow: true});
                }
                
                maxReachedY = Math.max(maxReachedY, commonY);
                currentY = commonY + 15 + (nextH || 0)/2;
                inPts = [{x: cx, y: commonY, label: '', skipTopVertical: true, from: {x: cx, y: commonY} } as any];
                
            } else if (node.type === 'while') {
                const shapeType = 'decision';
                allNodes.push({ id: node.id, type: shapeType, text: node.condition, x: cx, y: currentY, height: h, lineIndex: node.lineIndex });
                
                const bodyIn = {x: cx, y: currentY + h/2};
                
                let bodyEnds;
                let localMax = currentY;
                let actEndCx = cx;
                let bBreaks: any[] = [];
                let bContinues: any[] = [];
                if (node.body.length > 0) {
                    const firstBodyY = currentY + h/2 + Y_MARGIN + getASTNodeHeight(node.body[0])/2;
                    const bRes = layout(node.body, cx, firstBodyY, [{ x: cx, y: currentY + h/2, from: bodyIn, label: 'Да', labelPos: {x: cx + 35, y: currentY + h/2 + Y_MARGIN/2} }], true, bBreaks, bContinues);
                    bodyEnds = bRes.endPoints;
                    localMax = Math.max(localMax, bRes.finalY);
                    actEndCx = bRes.endCx;
                } else {
                    bodyEnds = [{x: cx, y: currentY + h/2 + Y_MARGIN, from: bodyIn, label: 'Да', labelPos: {x: cx + 35, y: currentY + h/2 + Y_MARGIN} }];
                }
                
                bodyEnds.push(...bContinues.map(c => ({...c, from: c, isContinue: true})));
                
                let endsInLastCol = bodyEnds.filter(p => !p.isContinue && Math.abs(p.x - actEndCx) < NODE_WIDTH * 2);
                let actualBodyMaxY = currentY;
                if (endsInLastCol.length > 0) {
                     actualBodyMaxY = Math.max(...endsInLastCol.map(p => p.y || 0));
                } else if (bodyEnds.filter(p => !p.isContinue).length > 0) {
                     actualBodyMaxY = Math.max(...bodyEnds.filter(p => !p.isContinue).map(p => p.y || 0));
                } else if (node.body.length > 0) {
                     actualBodyMaxY = localMax;
                }
                const mergeY = actualBodyMaxY + X_SEP/2;
                
                let rightCorridor = cx + Math.max(node.rightW || NODE_WIDTH, NODE_WIDTH * 2) - X_SEP/2 + 20;

                for (let p of bodyEnds) {
                    if (p.isContinue) {
                         allEdges.push({ 
                             points: [p.from, {x: p.from.x, y: p.from.y + 15}, {x: rightCorridor, y: p.from.y + 15}, {x: rightCorridor, y: mergeY}, {x: actEndCx, y: mergeY}], 
                             noArrow: true 
                         });
                    } else if (p.from) {
                         const px = (p as any).limitX || p.x;
                         let lblObj = {};
                         if (p.label) {
                             if (p.from && p.from.x > cx) {
                                  lblObj = {label: p.label, labelPos: {x: p.from.x + 15, y: p.from.y - 10}};
                             } else {
                                  lblObj = {label: p.label, labelPos: {x: cx + 12, y: currentY + h/2 + 10}};
                             }
                         }
                         allEdges.push({ 
                             points: [p.from, {x: px, y: p.from.y}, {x: px, y: mergeY}, {x: actEndCx, y: mergeY}], 
                             ...lblObj, 
                             noArrow: true 
                         });
                    } else {
                         if (Math.abs(p.x - actEndCx) < 1) {
                             allEdges.push({ points: [p, {x: actEndCx, y: mergeY}], noArrow: true });
                         } else {
                             allEdges.push({ points: [p, {x: p.x, y: mergeY}, {x: actEndCx, y: mergeY}], noArrow: true });
                         }
                    }
                }
                
                let returnX = cx - node.leftW! + X_SEP/2;
                while (usedReturnX.some(usedX => Math.abs(usedX - returnX) < 45)) {
                    returnX -= 50;
                }
                usedReturnX.push(returnX);
                
                allEdges.push({ 
                    points: [
                        {x: actEndCx, y: mergeY},
                        {x: returnX, y: mergeY}, 
                        {x: returnX, y: currentY - h/2 - Y_MARGIN/2}, 
                        {x: cx, y: currentY - h/2 - Y_MARGIN/2}
                    ]
                });
                
                let localMaxYInCx = currentY;
                let cxNodes = allNodes.filter(n => Math.abs(n.x - cx) < NODE_WIDTH && n.y > currentY);
                let lastNodeInCx: any = node;
                if (cxNodes.length > 0) {
                     localMaxYInCx = Math.max(...cxNodes.map(n => n.y));
                     lastNodeInCx = cxNodes.find(n => n.y === localMaxYInCx) || node;
                }
                let nextY = Math.max(localMaxYInCx + getASTNodeHeight(lastNodeInCx)/2, mergeY) + 20 + (nextH ? nextH/2 : 0);
                const rightOut = {x: cx + NODE_WIDTH/2, y: currentY};
                let falsePathLimit = cx + node.rightW! - X_SEP/2;
                
                inPts = [{
                    x: cx, 
                    y: nextY, 
                    from: rightOut, 
                    label: 'Нет',
                    labelPos: {x: rightOut.x + 10, y: rightOut.y - 10},
                    limitX: falsePathLimit
                } as any];

                for (let brk of bBreaks) {
                    allEdges.push({
                        points: [brk, {x: brk.x, y: brk.y + 15}, {x: falsePathLimit, y: brk.y + 15}, {x: falsePathLimit, y: nextY}],
                        noArrow: true
                    });
                    inPts.push({
                        x: cx,
                        y: nextY,
                        from: {x: falsePathLimit, y: nextY},
                        limitX: falsePathLimit
                    } as any);
                }
                
                currentY = nextY;
                maxReachedY = Math.max(maxReachedY, currentY);
            } else if (node.type === 'with') {
                allNodes.push({ id: node.id, type: 'stmt', kind: 'process', text: node.condition, x: cx, y: currentY, height: h, lineIndex: node.lineIndex });
                let bBreaks: any[] = [];
                let bConts: any[] = [];
                
                let inBodyPts = [{x: cx, y: currentY + h/2}];
                let bodyRes = layout(node.body, cx, currentY + h/2 + Y_MARGIN + (node.body.length > 0 ? getASTNodeHeight(node.body[0])/2 : 0), inBodyPts, false, bBreaks, bConts);
                
                let mergeY = bodyRes.finalY - 15;
                let endText = node.closeCondition;
                let endH = getNodeHeight(endText, 'process');
                let endY = mergeY + 15 + endH/2;
                
                let mergedPaths = false;
                for (let p of bodyRes.endPoints) {
                    if ((p as any).from) {
                        const px = (p as any).limitX || p.x;
                        allEdges.push({ 
                            points: [(p as any).from, {x: px, y: (p as any).from.y}, {x: px, y: mergeY}, {x: cx, y: mergeY}], 
                            fromNodeId: (p as any).fromNodeId, toNodeId: node.id + '_end',
                            noArrow: true
                        });
                        mergedPaths = true;
                    } else {
                        if (Math.abs(p.x - cx) >= 1) {
                            allEdges.push({ points: [p, {x: p.x, y: mergeY}, {x: cx, y: mergeY}], fromNodeId: (p as any).fromNodeId, toNodeId: node.id + '_end', noArrow: true });
                            mergedPaths = true;
                        } else {
                            allEdges.push({ points: [p, {x: cx, y: mergeY}], fromNodeId: (p as any).fromNodeId, toNodeId: node.id + '_end', noArrow: true });
                            mergedPaths = true;
                        }
                    }
                }
                
                if (mergedPaths) {
                    allEdges.push({
                        points: [{x: cx, y: mergeY}, {x: cx, y: endY - endH/2}],
                        toNodeId: node.id + '_end'
                    });
                } else if (node.body.length === 0) {
                    allEdges.push({
                        points: [{x: cx, y: currentY + h/2}, {x: cx, y: endY - endH/2}],
                        toNodeId: node.id + '_end'
                    });
                }
                
                allNodes.push({ id: node.id + '_end', type: 'stmt', kind: 'process', text: endText, x: cx, y: endY, height: endH });
                inPts = [{ x: cx, y: endY + endH/2, from: {x: cx, y: endY + endH/2} } as any];
                
                if (bBreaks.length > 0) loopBreaks.push(...bBreaks);
                if (bConts.length > 0) loopContinues.push(...bConts);
                
                currentY = endY + endH/2 + Y_MARGIN + (nextH ? nextH/2 : 0);
                maxReachedY = Math.max(maxReachedY, currentY);
            } else if (node.type === 'for') {
                allNodes.push({ id: node.id, type: 'loop_begin', text: node.condition, x: cx, y: currentY, height: h, lineIndex: node.lineIndex });
                
                let outPts = [{ x: cx, y: currentY + h/2 }];
                
                let bBreaks: any[] = [];
                let bContinues: any[] = [];
                let bRes;
                if (node.body.length > 0) {
                    let firstBodyY = currentY + h/2 + Y_MARGIN + getASTNodeHeight(node.body[0])/2;
                    bRes = layout(node.body, cx, firstBodyY, outPts.map(p => ({ x: cx, y: currentY + h/2, from: p })), true, bBreaks, bContinues);
                    outPts = bRes.endPoints;
                    
                    let actualBodyMaxY = currentY;
                    let endsInLastCol = outPts.filter(p => Math.abs(p.x - cx) < NODE_WIDTH * 2);
                    if (endsInLastCol.length > 0) {
                         actualBodyMaxY = Math.max(...endsInLastCol.map(p => p.y || 0));
                    } else if (outPts.length > 0) {
                         actualBodyMaxY = Math.max(...outPts.map(p => p.y || 0));
                    } else if (bRes) {
                         actualBodyMaxY = bRes.finalY;
                    }
                    currentY = actualBodyMaxY;
                } else {
                    currentY += h/2 + Y_MARGIN;
                }
                
                let mergeY = currentY + 5;
                
                let rightCorridor = cx + Math.max(node.rightW || NODE_WIDTH, NODE_WIDTH * 2) - X_SEP/2 + 20;
                let contY = currentY + 5;
                for (let c of bContinues) {
                    allEdges.push({
                        points: [c, {x: c.x, y: c.y + 15}, {x: rightCorridor, y: c.y + 15}, {x: rightCorridor, y: contY}, {x: cx, y: contY}],
                        noArrow: true
                    });
                    outPts.push({
                        x: cx,
                        y: contY,
                        from: {x: cx, y: contY},
                        limitX: cx
                    } as any);
                }
                
                let endText = "Конец цикла\n" + node.condition;
                if (node.type === 'for') {
                    if (node.condition.includes(' из ')) {
                        endText = node.condition.split(' из ')[0].trim();
                    } else if (node.condition.includes(' = ')) {
                        endText = node.condition.split(' = ')[0].trim();
                    } else {
                        endText = node.condition;
                    }
                }
                let endH = getNodeHeight(endText, 'loop_end');
                // Calculate next valid position for end element based on incoming lines
                let endY = mergeY + 15 + endH/2;
                
                let mergedPaths = false;
                for (let p of outPts) {
                    if ((p as any).from) {
                        const px = (p as any).limitX || p.x;
                        allEdges.push({ 
                            points: [(p as any).from, {x: px, y: (p as any).from.y}, {x: px, y: mergeY}, {x: cx, y: mergeY}], 
                            noArrow: true 
                        });
                        mergedPaths = true;
                    } else {
                        if (Math.abs(p.x - cx) >= 1) {
                            allEdges.push({ points: [p, {x: p.x, y: mergeY}, {x: cx, y: mergeY}], noArrow: true });
                            mergedPaths = true;
                        } else {
                            allEdges.push({ points: [p, {x: cx, y: mergeY}], noArrow: true });
                            mergedPaths = true;
                        }
                    }
                }
                
                if (mergedPaths) {
                    allEdges.push({
                        points: [{x: cx, y: mergeY}, {x: cx, y: endY - endH/2}]
                    });
                }
                
                allNodes.push({ id: node.id + '_end', type: 'loop_end', text: endText, x: cx, y: endY, height: endH });
                
                inPts = [{ x: cx, y: endY + endH/2, from: {x: cx, y: endY + endH/2} } as any];
                
                let breakPathLimit = cx + Math.max(node.rightW || NODE_WIDTH, NODE_WIDTH * 2) - X_SEP/2 + 40;
                let bBrkY = mergeY + 15;
                for (let brk of bBreaks) {
                    allEdges.push({
                        points: [brk, {x: brk.x, y: brk.y + 15}, {x: breakPathLimit, y: brk.y + 15}, {x: breakPathLimit, y: endY + endH/2 + 15}],
                        noArrow: true
                    });
                    inPts.push({
                        x: cx,
                        y: endY + endH/2 + 15,
                        from: {x: breakPathLimit, y: endY + endH/2 + 15},
                        limitX: breakPathLimit
                    } as any);
                }
                
                currentY = endY + endH/2 + 15;
                if (nextH) {
                     currentY += nextH/2;
                }
                maxReachedY = Math.max(maxReachedY, currentY);
            }
        }
        
        return { endPoints: inPts, finalY: currentY, endCx: cx };
    }
    
    let rootW = NODE_WIDTH;
    if (ast.length > 0) rootW = Math.max(...ast.map(n => n.width || NODE_WIDTH));
    
    const rootCx = Math.max(200, rootW) / 2 + 50;
    let startText = isMain ? 'Начало' : `Вход в п/п\n${title}`;
    const startH = getNodeHeight(startText, 'start', style);
    const startY = 40 + startH / 2;
    
    allNodes.push({ id: 'start', type: 'start', text: startText, x: rootCx, y: startY, height: startH });
    let rootInPts = [{ x: rootCx, y: startY + startH/2 }];
    
    let res = layout(ast, rootCx, startY + startH/2 + Y_MARGIN + getASTNodeHeight(ast[0])/2, rootInPts, true);
    
    let endCx = res.endCx;
    let overlappingNodes = allNodes.filter(n => Math.abs(n.x - endCx) < NODE_WIDTH);
    let endPtsY = res.endPoints.filter(p => Math.abs(p.x - endCx) < NODE_WIDTH * 2).map(p => p.y);
    let maxYOfEnds = endPtsY.length > 0 ? Math.max(...endPtsY) : res.finalY;
    
    let localColMaxY = startY;
    let localColNode: any = null;
    if (overlappingNodes.length > 0) {
        localColMaxY = Math.max(...overlappingNodes.map(n => n.y));
        localColNode = overlappingNodes.find(n => n.y === localColMaxY);
    }
    let localColBottom = localColNode ? localColMaxY + getASTNodeHeight(localColNode)/2 : startY;

    let endText = isMain ? 'Конец' : `Выход из п/п\n${cleanTitle}` + (returnType ? ` (${returnType})` : ``);
    let endH = getNodeHeight(endText, 'end', style);
    let finalY = Math.max(maxYOfEnds, localColBottom) + Y_MARGIN + endH/2;

    if (res.endPoints.length > 0) {
        allNodes.push({ id: 'end', type: 'end', text: endText, x: endCx, y: finalY, height: endH });
        
        const targetPoint = {x: endCx, y: finalY - endH/2};
        const mergeY = targetPoint.y - 20;
        for (let p of res.endPoints) {
            if (p.from) {
                 const px = (p as any).limitX || p.x;
                 let extra = p.label ? {label: p.label, labelPos: p.labelPos || {x: Math.min(p.from.x, px) + Math.abs(px - p.from.x)/2, y: p.from.y - 10}} : {};
                 allEdges.push({ 
                     points: [p.from, {x: px, y: p.from.y}, {x: px, y: mergeY}, {x: endCx, y: mergeY}], 
                     ...extra,
                     noArrow: true 
                 });
                 allEdges.push({ points: [{x: endCx, y: mergeY}, targetPoint] });
            } else {
                 if (Math.abs(p.x - endCx) < 1) {
                     allEdges.push({ points: [p, targetPoint] });
                 } else {
                     allEdges.push({ points: [p, {x: p.x, y: mergeY}, {x: endCx, y: mergeY}], noArrow: true });
                     allEdges.push({ points: [{x: endCx, y: mergeY}, targetPoint] });
                 }
            }
        }
    }


    let minX = 0;
    if (allNodes.length > 0) {
        minX = Math.min(...allNodes.map(n => n.x - NODE_WIDTH/2), ...allEdges.flatMap(e => e.points ? e.points.map(p => p.x) : []));
    }
    let shiftX = 0;
    if (minX < 50) {
        shiftX = 50 - minX;
        for (let n of allNodes) n.x += shiftX;
        for (let e of allEdges) {
            if (e.points) e.points.forEach(p => p.x += shiftX);
            if (e.labelPos) e.labelPos.x += shiftX;
        }
    }
    
    let allEdgesFinal = allEdges.map((e, idx) => {
        let cleanedPoints = e.points ? e.points.filter((p, i, arr) => {
            if (i === 0) return true;
            return Math.abs(p.x - arr[i-1].x) > 1 || Math.abs(p.y - arr[i-1].y) > 1;
        }) : [];
        let segments = [];
        for (let i = 1; i < cleanedPoints.length; i++) {
             segments.push({
                  startX: cleanedPoints[i-1].x,
                  startY: cleanedPoints[i-1].y,
                  endX: cleanedPoints[i].x,
                  endY: cleanedPoints[i].y
             });
        }
        return { ...e, id: `e-${idx}`, segments };
    });

    if (graphOverrides) {
        let nodeShifts = new Map<string, {dx: number, dy: number, origNode: any}>();
        allNodes.forEach(n => {
            let ov = graphOverrides?.nodes?.[n.id];
            if (ov && (ov.dx || ov.dy)) {
                nodeShifts.set(n.id, { dx: ov.dx || 0, dy: ov.dy || 0, origNode: {...n} });
            }
        });
        
        allEdgesFinal.forEach(e => {
            let ov = graphOverrides?.edges?.[e.id!];
            if (ov?.segments && e.segments) {
                Object.keys(ov.segments).forEach(k => {
                    let idx = parseInt(k);
                    let segIdx = idx - 1;
                    if (segIdx >= 0 && segIdx < e.segments!.length) {
                         let seg = ov.segments[idx];
                         e.segments![segIdx].startX += (seg.startDx || 0);
                         e.segments![segIdx].startY += (seg.startDy || 0);
                         e.segments![segIdx].endX += (seg.endDx || 0);
                         e.segments![segIdx].endY += (seg.endDy || 0);
                    }
                });
            }
        });

        allNodes = allNodes.map((n) => {
            let ov = graphOverrides?.nodes?.[n.id];
            if (ov) {
                return { ...n, x: n.x + (ov.dx || 0), y: n.y + (ov.dy || 0), hidden: ov.hidden, text: ov.text !== undefined ? ov.text : n.text };
            }
            return n;
        }).filter(n => !n.hidden);
        
        allEdgesFinal = allEdgesFinal.filter(e => {
            return !graphOverrides?.edges?.[e.id]?.hidden;
        });
    }


    let finalWidth = 600;
    if (allNodes.length > 0) finalWidth = Math.max(...allNodes.map(n => n.x)) + NODE_WIDTH/2 + 100;
    
    let actualMaxY = finalY;
    if (allNodes.length > 0) actualMaxY = Math.max(actualMaxY, ...allNodes.map(n => n.y), res.finalY);

    const PAGE_H = 1200;
    let pages: {nodes: FlowNode[], edges: FlowEdge[], width: number, height: number}[] = [];
    
    let shouldSplit = false;
    if (splitMode === 'manual') {
        shouldSplit = (customCuts && customCuts.length > 0) && !isScissorsMode;
    } else {
        shouldSplit = actualMaxY > PAGE_H + 50;
    }
    
    if (!shouldSplit) {
        let minX = Math.min(...allNodes.map(n => n.x - NODE_WIDTH/2));
        let maxX = Math.max(...allNodes.map(n => n.x + NODE_WIDTH/2));
        allEdgesFinal.forEach(e => {
            if (e.segments) {
                e.segments.forEach(seg => {
                    minX = Math.min(minX, seg.startX, seg.endX);
                    maxX = Math.max(maxX, seg.startX, seg.endX);
                });
            }
        });
        let diagramWidth = maxX - minX;
        let pageCanvasWidth = Math.max(diagramWidth + 200, 800);
        let diagramCenter = (minX + maxX) / 2;
        let pageCenter = pageCanvasWidth / 2;
        let dx = pageCenter - diagramCenter;
        
        allNodes.forEach(n => n.x += dx);
        allEdgesFinal.forEach(e => {
            if (e.segments) {
                e.segments.forEach(seg => {
                    seg.startX += dx;
                    seg.endX += dx;
                });
            }
            if (e.labelPos) {
                e.labelPos.x += dx;
            }
        });
        pages.push({ nodes: allNodes, edges: allEdgesFinal, width: pageCanvasWidth, height: actualMaxY + 100 });
    } else {
        let pageIntervals: { yMin: number, yMax: number, s: number }[] = [];
        
        if (splitMode === 'manual') {
            let sortedCuts = [...customCuts].sort((a, b) => a - b);
            for (let s = 0; s <= sortedCuts.length; s++) {
                let yMin = (s === 0) ? 0 : sortedCuts[s - 1];
                let yMax = (s === sortedCuts.length) ? Infinity : sortedCuts[s];
                pageIntervals.push({ yMin, yMax, s });
            }
        } else {
            let maxNodeY = Math.max(
                ...allNodes.map(n => n.y + (n.height || 64)/2),
                ...allEdgesFinal.flatMap(e => e.segments ? e.segments.map(s => Math.max(s.startY, s.endY)) : [])
            );
            
            let currentY = 0;
            let s = 0;
            const TARGET_PAGE_H = 880;
            
            while (currentY < maxNodeY) {
                let remaining = maxNodeY - currentY;
                if (remaining <= TARGET_PAGE_H + 120) {
                    pageIntervals.push({ yMin: currentY, yMax: Infinity, s });
                    break;
                }
                
                let desiredCut = currentY + TARGET_PAGE_H;
                
                // Forbidden Y zones: only the actual physical box of each node and horizontal segments
                let forbiddenRanges: { minY: number, maxY: number }[] = [];
                allNodes.forEach(n => {
                    let h = n.height || 64;
                    forbiddenRanges.push({ minY: n.y - h/2 - 8, maxY: n.y + h/2 + 8 });
                });
                
                allEdgesFinal.forEach(e => {
                    if (e.segments) {
                        e.segments.forEach(seg => {
                            if (Math.abs(seg.startY - seg.endY) < 2) {
                                forbiddenRanges.push({ minY: seg.startY - 8, maxY: seg.startY + 8 });
                            }
                        });
                    }
                });
                
                let bestCut = -1;
                let bestScore = -Infinity;
                
                for (let candidate = desiredCut + 60; candidate >= currentY + Math.max(300, TARGET_PAGE_H * 0.65); candidate -= 10) {
                    let inForbidden = forbiddenRanges.some(r => candidate >= r.minY && candidate <= r.maxY);
                    if (!inForbidden) {
                        let crossingCount = 0;
                        allEdgesFinal.forEach(e => {
                            if (e.segments) {
                                e.segments.forEach(seg => {
                                    let sy = Math.min(seg.startY, seg.endY);
                                    let ey = Math.max(seg.startY, seg.endY);
                                    if (sy < candidate && ey > candidate) {
                                        crossingCount++;
                                    }
                                });
                            }
                        });
                        
                        let distScore = -Math.abs(candidate - desiredCut) * 1.5;
                        let edgeScore = -crossingCount * 4;
                        let totalScore = distScore + edgeScore;
                        
                        if (totalScore > bestScore) {
                            bestScore = totalScore;
                            bestCut = candidate;
                        }
                    }
                }
                
                if (bestCut === -1) {
                    let sortedNodesInArea = allNodes
                        .filter(n => n.y >= currentY + 300 && n.y <= desiredCut + 200)
                        .sort((a, b) => a.y - b.y);
                    
                    if (sortedNodesInArea.length >= 2) {
                        let bestGapScore = -Infinity;
                        let gapY = desiredCut;
                        for (let k = 0; k < sortedNodesInArea.length - 1; k++) {
                            let n1 = sortedNodesInArea[k];
                            let n2 = sortedNodesInArea[k+1];
                            let bot1 = n1.y + (n1.height || 64) / 2;
                            let top2 = n2.y - (n2.height || 64) / 2;
                            let mid = (bot1 + top2) / 2;
                            let score = -(Math.abs(mid - desiredCut));
                            if (score > bestGapScore) {
                                bestGapScore = score;
                                gapY = mid;
                            }
                        }
                        bestCut = gapY;
                    } else {
                        bestCut = desiredCut;
                    }
                }
                
                pageIntervals.push({ yMin: currentY, yMax: bestCut, s });
                currentY = bestCut;
                s++;
            }
        }

        if (pageIntervals.length > 1) {
            let boundaries = pageIntervals.map(pi => pi.yMax).filter(y => y !== Infinity);
            boundaries.forEach(yB => {
                let interval = pageIntervals.find(pi => pi.yMax === yB);
                let yMin = interval ? interval.yMin : 0;
                let lastPageNodes = allNodes.filter(n => n.y >= yMin && n.y < yB);

                let mergePointsToMove = new Map<string, {cx: number, cy: number, edgesIn: any[], edgesOut: any[]}>();

                allEdgesFinal.forEach(e => {
                    if (!e.segments || e.segments.length === 0) return;
                    let lastSeg = e.segments[e.segments.length - 1];
                    let mergeY = lastSeg.endY;
                    let cx = lastSeg.endX;
                    let k = `${cx}_${mergeY}`;

                    if (!mergePointsToMove.has(k)) {
                        mergePointsToMove.set(k, { cx, cy: mergeY, edgesIn: [], edgesOut: [] });
                    }
                    mergePointsToMove.get(k)!.edgesIn.push(e);
                });

                allEdgesFinal.forEach(e => {
                    if (!e.segments || e.segments.length === 0) return;
                    let firstSeg = e.segments[0];
                    let k = `${firstSeg.startX}_${firstSeg.startY}`;
                    if (mergePointsToMove.has(k)) {
                        mergePointsToMove.get(k)!.edgesOut.push(e);
                    }
                });

                mergePointsToMove.forEach(info => {
                    let { cx, cy, edgesIn, edgesOut } = info;
                    if (cy >= yB && cy < yB + 80) {
                        let allFromPrevPage = true;
                        let maxStartY = 0;
                        let isRelevant = false;
                        
                        edgesIn.forEach(e => {
                            let sy = e.segments![0].startY;
                            if (sy >= yB) allFromPrevPage = false;
                            maxStartY = Math.max(maxStartY, sy);
                            if (e.segments!.length >= 2) {
                                let prevSeg = e.segments![e.segments!.length - 2];
                                if (prevSeg.startY < yB) isRelevant = true;
                            }
                        });

                        if (edgesIn.length > 0 && allFromPrevPage && isRelevant) {
                            let otherEdgesMaxY = 0;
                            allEdgesFinal.forEach(e => {
                                if (edgesIn.includes(e) || edgesOut.includes(e)) return;
                                if (e.segments) {
                                    e.segments.forEach(seg => {
                                        if (seg.startY < yB && seg.endY < yB && (seg.startY >= yMin || seg.endY >= yMin)) {
                                            otherEdgesMaxY = Math.max(otherEdgesMaxY, seg.startY, seg.endY);
                                        }
                                    });
                                }
                            });

                            let maxNodeBottom = lastPageNodes.length > 0 ? Math.max(...lastPageNodes.map(n => n.y + (n.height || 64)/2)) : maxStartY;
                            let baseBottom = Math.max(maxNodeBottom, otherEdgesMaxY);
                            let newY = Math.max(maxStartY + 20, baseBottom + 20);
                            
                            if (newY < yB - 5) {
                                edgesIn.forEach(e => {
                                    e.segments!.forEach(seg => {
                                        if (Math.abs(seg.startY - cy) < 2) seg.startY = newY;
                                        if (Math.abs(seg.endY - cy) < 2) seg.endY = newY;
                                    });
                                });
                                edgesOut.forEach(e => {
                                    e.segments!.forEach(seg => {
                                        if (Math.abs(seg.startY - cy) < 2) seg.startY = newY;
                                        if (Math.abs(seg.endY - cy) < 2) seg.endY = newY;
                                    });
                                });
                            }
                        }
                    }
                });
            });
        }

        const LATIN_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        let jumpCounter = 0;
        function getJumpLetter(idx: number): string {
            if (idx < LATIN_LETTERS.length) {
                return LATIN_LETTERS[idx];
            }
            let base = LATIN_LETTERS[idx % LATIN_LETTERS.length];
            let num = Math.floor(idx / LATIN_LETTERS.length) + 1;
            return `${base}${num}`;
        }
        let jumpMap = new Map<string, string>();

        let globalMinX = 999999;
        let globalMaxX = -999999;
        allNodes.forEach(n => {
            globalMinX = Math.min(globalMinX, n.x - NODE_WIDTH/2);
            globalMaxX = Math.max(globalMaxX, n.x + NODE_WIDTH/2);
        });
        allEdgesFinal.forEach(e => {
            if (e.segments) {
                e.segments.forEach(seg => {
                    globalMinX = Math.min(globalMinX, seg.startX, seg.endX);
                    globalMaxX = Math.max(globalMaxX, seg.startX, seg.endX);
                });
            }
        });

        let globalDiagramWidth = (globalMinX !== 999999 && globalMaxX !== -999999) ? (globalMaxX - globalMinX) : 600;
        let globalPageCanvasWidth = Math.max(globalDiagramWidth + 200, 800);
        let globalDiagramCenter = (globalMinX + globalMaxX) / 2;
        let globalPageCenter = globalPageCanvasWidth / 2;
        let globalDx = globalPageCenter - globalDiagramCenter;

        for (let interval of pageIntervals) {
            let { yMin, yMax, s } = interval;
            let pageNodesList = allNodes.filter(n => n.y >= yMin && n.y < yMax);

            let minGapLocalY = PAGE_H;
            pageNodesList.forEach(n => {
                let localY = n.y - yMin;
                let top = localY - (n.height || 64) / 2;
                if (top < minGapLocalY) minGapLocalY = top;
            });

            if (minGapLocalY === PAGE_H || minGapLocalY === Infinity) minGapLocalY = 0;
            
            let SHIFT = (s > 0) ? Math.max(0, 100 - minGapLocalY) : 0;
            
            let sNodes = pageNodesList.map(n => ({...n, y: n.y - yMin + SHIFT}));
            
            let maxBottomLocalY = 100;
            sNodes.forEach(n => {
                let bottom = n.y + (n.height || 64) / 2;
                if (bottom > maxBottomLocalY) maxBottomLocalY = bottom;
            });

            // Consider internal edges for bottom extent
            allEdgesFinal.forEach(e => {
                if (!e.segments || e.segments.length === 0) return;
                let sy = e.segments[0].startY;
                let ey = e.segments[e.segments.length - 1].endY;
                if (sy >= yMin && sy < yMax && ey >= yMin && ey < yMax) {
                    e.segments.forEach(seg => {
                        let lsy = seg.startY - yMin + SHIFT;
                        let ley = seg.endY - yMin + SHIFT;
                        if (lsy > maxBottomLocalY) maxBottomLocalY = lsy;
                        if (ley > maxBottomLocalY) maxBottomLocalY = ley;
                    });
                }
            });

            // Single unified line for all jump out circles at bottom of page
            let jumpOutY = Math.max(maxBottomLocalY + 45, 200);
            const JUMP_IN_Y = 45;

            let sEdges: FlowEdge[] = [];

            allEdgesFinal.forEach(e => {
                let newSegments: any[] = [];
                let eInS = false;
                let hasJumpOut = false;
                
                if (e.segments && e.segments.length > 0) {
                    let firstSeg = e.segments[0];
                    let lastSeg = e.segments[e.segments.length - 1];
                    
                    let startY = firstSeg.startY;
                    let endY = lastSeg.endY;

                    let fromPage = -1;
                    let toPage = -1;
                    for (let pi of pageIntervals) {
                        if (startY >= pi.yMin && startY < pi.yMax) fromPage = pi.s;
                        if (endY >= pi.yMin && endY < pi.yMax) toPage = pi.s;
                    }
                    if (fromPage === -1) fromPage = startY < pageIntervals[0].yMin ? 0 : pageIntervals.length - 1;
                    if (toPage === -1) toPage = endY < pageIntervals[0].yMin ? 0 : pageIntervals.length - 1;

                    if (fromPage === toPage) {
                        if (s === fromPage) {
                            e.segments.forEach(seg => {
                                let clipSy = seg.startY - yMin + SHIFT;
                                let clipEy = seg.endY - yMin + SHIFT;
                                if (Math.abs(clipSy - clipEy) > 0.1 || Math.abs(seg.startX - seg.endX) > 0.1) {
                                    newSegments.push({
                                        startX: seg.startX,
                                        startY: clipSy,
                                        endX: seg.endX,
                                        endY: clipEy
                                    });
                                }
                                eInS = true;
                            });
                        }
                    } else if (fromPage < toPage) { // Downward transition
                        for (let p = fromPage; p < toPage; p++) {
                            let k = `${e.id}_down_${p}_to_${p+1}`;
                            if (!jumpMap.has(k)) { jumpMap.set(k, getJumpLetter(jumpCounter++)); }
                        }

                        if (s === fromPage) {
                            let k = `${e.id}_down_${s}_to_${s+1}`;
                            let letter = jumpMap.get(k)!;
                            let hasClipped = false;
                            for (let seg of e.segments) {
                                if (hasClipped) break;
                                let clipSy = seg.startY - yMin + SHIFT;
                                let clipEy = seg.endY - yMin + SHIFT;
                                if (seg.endY >= yMax) {
                                    clipEy = jumpOutY - 20;
                                    sNodes.push({ id: `jump_out_${k}`, type: 'circle', text: letter, x: seg.endX, y: jumpOutY, height: 40 });
                                    hasJumpOut = true;
                                    hasClipped = true;
                                }
                                if (Math.abs(clipSy - clipEy) > 0.1 || Math.abs(seg.startX - seg.endX) > 0.1) {
                                    newSegments.push({
                                        startX: seg.startX,
                                        startY: clipSy,
                                        endX: seg.endX,
                                        endY: clipEy
                                    });
                                }
                                eInS = true;
                            }
                        } else if (fromPage < s && s < toPage) {
                            // Transit page passing downwards
                            let kIn = `${e.id}_down_${s-1}_to_${s}`;
                            let kOut = `${e.id}_down_${s}_to_${s+1}`;
                            let letterIn = jumpMap.get(kIn)!;
                            let letterOut = jumpMap.get(kOut)!;

                            let busX = firstSeg.endX;
                            for (let seg of e.segments) {
                                if (Math.abs(seg.startX - seg.endX) < 1 && Math.min(seg.startY, seg.endY) <= yMin && Math.max(seg.startY, seg.endY) >= yMax) {
                                    busX = seg.startX;
                                    break;
                                }
                            }

                            sNodes.push({ id: `jump_in_${kIn}`, type: 'circle', text: letterIn, x: busX, y: JUMP_IN_Y, height: 40 });
                            sNodes.push({ id: `jump_out_${kOut}`, type: 'circle', text: letterOut, x: busX, y: jumpOutY, height: 40 });
                            hasJumpOut = true;

                            newSegments.push({
                                startX: busX,
                                startY: JUMP_IN_Y + 20,
                                endX: busX,
                                endY: jumpOutY - 20
                            });
                            eInS = true;
                        } else if (s === toPage) {
                            let k = `${e.id}_down_${s-1}_to_${s}`;
                            let letter = jumpMap.get(k)!;
                            for (let seg of e.segments) {
                                if (seg.endY <= yMin) continue;
                                let clipSy = seg.startY - yMin + SHIFT;
                                let clipEy = seg.endY - yMin + SHIFT;
                                if (seg.startY <= yMin) {
                                    clipSy = JUMP_IN_Y + 20;
                                    sNodes.push({ id: `jump_in_${k}`, type: 'circle', text: letter, x: seg.startX, y: JUMP_IN_Y, height: 40 });
                                }
                                if (Math.abs(clipSy - clipEy) > 0.1 || Math.abs(seg.startX - seg.endX) > 0.1) {
                                    newSegments.push({
                                        startX: seg.startX,
                                        startY: clipSy,
                                        endX: seg.endX,
                                        endY: clipEy
                                    });
                                }
                                eInS = true;
                            }
                        }
                    } else { // Upward transition (fromPage > toPage)
                        for (let p = fromPage; p > toPage; p--) {
                            let k = `up_${e.id}_${p}_to_${p-1}`;
                            if (!jumpMap.has(k)) { jumpMap.set(k, getJumpLetter(jumpCounter++)); }
                        }

                        if (s === fromPage) {
                            let k = `up_${e.id}_${s}_to_${s-1}`;
                            let letter = jumpMap.get(k)!;
                            let hasClipped = false;
                            for (let seg of e.segments) {
                                if (hasClipped) break;
                                let clipSy = seg.startY - yMin + SHIFT;
                                let clipEy = seg.endY - yMin + SHIFT;
                                if (seg.endY <= yMin) {
                                    clipEy = JUMP_IN_Y + 20;
                                    sNodes.push({ id: `jump_out_up_${k}`, type: 'circle', text: letter, x: seg.endX, y: JUMP_IN_Y, height: 40 });
                                    hasJumpOut = true;
                                    hasClipped = true;
                                }
                                if (Math.abs(clipSy - clipEy) > 0.1 || Math.abs(seg.startX - seg.endX) > 0.1) {
                                    newSegments.push({
                                        startX: seg.startX,
                                        startY: clipSy,
                                        endX: seg.endX,
                                        endY: clipEy
                                    });
                                }
                                eInS = true;
                            }
                        } else if (toPage < s && s < fromPage) {
                            // Transit page passing upwards
                            let kIn = `up_${e.id}_${s+1}_to_${s}`;
                            let kOut = `up_${e.id}_${s}_to_${s-1}`;
                            let letterIn = jumpMap.get(kIn)!;
                            let letterOut = jumpMap.get(kOut)!;

                            let busX = firstSeg.endX;
                            for (let seg of e.segments) {
                                if (Math.abs(seg.startX - seg.endX) < 1 && Math.min(seg.startY, seg.endY) <= yMin && Math.max(seg.startY, seg.endY) >= yMax) {
                                    busX = seg.startX;
                                    break;
                                }
                            }

                            sNodes.push({ id: `jump_in_up_${kIn}`, type: 'circle', text: letterIn, x: busX, y: jumpOutY, height: 40 });
                            sNodes.push({ id: `jump_out_up_${kOut}`, type: 'circle', text: letterOut, x: busX, y: JUMP_IN_Y, height: 40 });
                            hasJumpOut = true;

                            newSegments.push({
                                startX: busX,
                                startY: jumpOutY - 20,
                                endX: busX,
                                endY: JUMP_IN_Y + 20
                            });
                            eInS = true;
                        } else if (s === toPage) {
                            let k = `up_${e.id}_${s+1}_to_${s}`;
                            let letter = jumpMap.get(k)!;
                            for (let seg of e.segments) {
                                if (seg.endY >= yMax) continue;
                                let clipSy = seg.startY - yMin + SHIFT;
                                let clipEy = seg.endY - yMin + SHIFT;
                                if (seg.startY >= yMax) {
                                    clipSy = jumpOutY - 20;
                                    sNodes.push({ id: `jump_in_up_${k}`, type: 'circle', text: letter, x: seg.startX, y: jumpOutY, height: 40 });
                                }
                                if (Math.abs(clipSy - clipEy) > 0.1 || Math.abs(seg.startX - seg.endX) > 0.1) {
                                    newSegments.push({
                                        startX: seg.startX,
                                        startY: clipSy,
                                        endX: seg.endX,
                                        endY: clipEy
                                    });
                                }
                                eInS = true;
                            }
                        }
                    }
                }
                
                if (eInS && newSegments.length > 0) {
                    let labelPos;
                    if (e.labelPos && e.labelPos.y >= yMin && e.labelPos.y < yMax) {
                         labelPos = { x: e.labelPos.x, y: e.labelPos.y - yMin + SHIFT };
                    }
                    sEdges.push({ ...e, segments: newSegments, labelPos, noArrow: hasJumpOut ? false : e.noArrow });
                }
            });
            
            let uniqueNodes = new Map();
            sNodes.forEach(n => {
                uniqueNodes.set(n.id + n.type + n.x + n.y, n);
            });
            sNodes = Array.from(uniqueNodes.values());

            sNodes.forEach(n => n.x += globalDx);
            sEdges.forEach(e => {
                if (e.segments) {
                    e.segments.forEach(seg => {
                        seg.startX += globalDx;
                        seg.endX += globalDx;
                    });
                }
                if (e.labelPos) {
                    e.labelPos.x += globalDx;
                }
            });

            let pgMaxY = 100;
            sNodes.forEach(n => pgMaxY = Math.max(pgMaxY, n.y + (n.height||64)/2 + 40));
            sEdges.forEach(e => {
                if (e.segments) {
                    e.segments.forEach(seg => {
                        pgMaxY = Math.max(pgMaxY, seg.startY + 40, seg.endY + 40);
                    });
                }
            });

            pages.push({ nodes: sNodes, edges: sEdges, width: globalPageCanvasWidth, height: pgMaxY });
        }
    }
    return { pages, title };}
export function EdgePolyline({ 
    edge, 
    theme = 'light',
    diagramStyle = 'classic_gost',
    fontFamily = 'monospace'
}: { 
    edge: FlowEdge; 
    theme?: string; 
    diagramStyle?: string | DiagramStyleConfig;
    fontFamily?: string;
    key?: React.Key 
}) {
    if (!edge.segments || edge.segments.length === 0) return null;
    const style = typeof diagramStyle === 'string' ? getDiagramStyle(diagramStyle) : (diagramStyle || getDiagramStyle());
    const filter = style.isRough ? "url(#rough-sketch)" : undefined;
    const strokeWidth = style.strokeWidth ? style.strokeWidth.toString() : "1.5";
    
    let pathData = '';
    edge.segments.forEach((seg, i) => {
         if (i === 0) {
             pathData += `M ${seg.startX} ${seg.startY} L ${seg.endX} ${seg.endY}`;
         } else {
             let prev = edge.segments![i-1];
             if (Math.abs(prev.endX - seg.startX) < 0.1 && Math.abs(prev.endY - seg.startY) < 0.1) {
                 pathData += ` L ${seg.endX} ${seg.endY}`;
             } else {
                 pathData += ` M ${seg.startX} ${seg.startY} L ${seg.endX} ${seg.endY}`;
             }
         }
    });
    
    let labelPoint = edge.labelPos ? edge.labelPos : null;
    let labelStr = edge.label ? edge.label.toUpperCase() : '';
    if (edge.label && edge.segments.length > 0 && !labelPoint) {
        let first = edge.segments[0];
        if (Math.abs(first.startX - first.endX) > 10) { 
            labelPoint = { x: first.startX + Math.sign(first.endX - first.startX) * 20, y: first.startY - 6 };
        } else {
            labelPoint = { x: first.startX + 12, y: first.startY + Math.sign(first.endY - first.startY) * 20 };
        }
    }

    const edgeStrokeColor = style.strokeColor || "#18181b";

    return (
        <g filter={filter}>
            <path d={pathData} fill="none" stroke={edgeStrokeColor} strokeWidth={strokeWidth} markerEnd={edge.noArrow ? undefined : `url(#arrowhead)`} strokeLinejoin="round" />
            {labelPoint && labelStr && (
                <text 
                    x={labelPoint.x} 
                    y={labelPoint.y} 
                    fontSize={Math.max(11, style.fontSize - 2).toString()} 
                    fontWeight="bold" 
                    fontFamily={fontFamily}
                    fill={edgeStrokeColor} 
                    stroke="#ffffff"
                    strokeWidth="4"
                    paintOrder="stroke"
                    textAnchor="middle" 
                    dominantBaseline="central"
                    className="uppercase tracking-wider"
                >
                    {labelStr}
                </text>
            )}
        </g>
    );
}

function splitTextIntoLines(text: string, maxCharsPerLine: number = 28): string[] {
  if (!text) return [];
  const lines: string[] = [];
  let currentLine = '';
  
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  for (const word of words) {
    if (currentLine.length === 0) {
      if (word.length > maxCharsPerLine) {
        let w = word;
        while (w.length > maxCharsPerLine) {
          lines.push(w.slice(0, maxCharsPerLine));
          w = w.slice(maxCharsPerLine);
        }
        currentLine = w;
      } else {
        currentLine = word;
      }
    } else {
      if (currentLine.length + 1 + word.length <= maxCharsPerLine) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine.trim());
        if (word.length > maxCharsPerLine) {
          let w = word;
          while (w.length > maxCharsPerLine) {
            lines.push(w.slice(0, maxCharsPerLine));
            w = w.slice(maxCharsPerLine);
          }
          currentLine = w;
        } else {
          currentLine = word;
        }
      }
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  return lines;
}

export function getNodeLines(text: string, type?: string, style?: DiagramStyleConfig | string): string[] {
    if (!text) return [];
    const styleObj = typeof style === 'string' ? getDiagramStyle(style) : (style || getDiagramStyle());
    let maxC = 24;
    if (styleObj.nodeWidth) {
        maxC = Math.max(16, Math.floor((styleObj.nodeWidth / 220) * (15 / styleObj.fontSize) * 25));
    }
    if (type === 'decision') maxC = Math.floor(maxC * 0.85);
    else if (type === 'start' || type === 'end') maxC = Math.floor(maxC * 0.88);
    else if (type === 'loop' || type === 'loop_begin' || type === 'loop_end') maxC = Math.floor(maxC * 0.85);
    else if (type === 'io') maxC = Math.floor(maxC * 0.85);

    return text.split('\n').flatMap(l => splitTextIntoLines(l.trim(), maxC));
}

export function getNodeHeight(text: string, type?: string, style?: DiagramStyleConfig | string): number {
    const styleObj = typeof style === 'string' ? getDiagramStyle(style) : (style || getDiagramStyle());
    const isStartEnd = type === 'start' || type === 'end';
    const isDecision = type === 'decision';
    const isLoop = type === 'loop' || type === 'loop_begin' || type === 'loop_end';
    
    // Narrow vertical height for start/end in student styles (30-40px, or standard 54-56px)
    let baseH = styleObj.baseHeight;
    if (isStartEnd) {
        baseH = styleObj.startBaseHeight || 34;
    } else if (isDecision) {
        baseH = styleObj.rhombusBaseHeight || Math.round(styleObj.baseHeight * 0.82);
    } else if (isLoop) {
        baseH = Math.round(styleObj.baseHeight * 0.92);
    }

    if (!text) return baseH;
    const lines = getNodeLines(text, type, styleObj);
    if (lines.length <= 1) {
        return baseH;
    }

    if (isStartEnd) {
        const lineStep = styleObj.fontSize ? styleObj.fontSize * 1.05 : 15;
        const pad = Math.max(4, Math.round(baseH * 0.15));
        return Math.max(baseH, Math.round(lines.length * lineStep + pad));
    }

    const lineStep = styleObj.fontSize ? styleObj.fontSize * 1.2 : 17;
    const pad = isDecision 
        ? Math.max(12, Math.round(baseH * 0.35)) 
        : Math.max(8, Math.round(baseH * 0.22));
    return Math.max(baseH, Math.round(lines.length * lineStep + pad));
}

export function GostShape({ 
  node, 
  highlighted = false, 
  fontFamily = 'monospace', 
  theme = 'light',
  diagramStyle = 'classic_gost'
}: { 
  node: FlowNode; 
  highlighted?: boolean; 
  fontFamily?: string; 
  theme?: string; 
  diagramStyle?: string | DiagramStyleConfig;
  key?: React.Key 
}) {
  const style = typeof diagramStyle === 'string' ? getDiagramStyle(diagramStyle) : (diagramStyle || getDiagramStyle());
  
  // ALL BLOCKS IN A DIAGRAM HAVE STRICTLY EQUAL UNIFORM WIDTH!
  // Horizontal expansion is forbidden; blocks expand vertically only.
  const WIDTH = style.nodeWidth;
  const HEIGHT = node.height || (node.type === 'circle' ? 40 : getNodeHeight(node.text, node.type, style));

  const cx = node.x;
  const cy = node.y;
  const x = cx - WIDTH / 2;
  const y = cy - HEIGHT / 2;

  // Block schemes must always be white with dark/gray borders and clear text (ГОСТ standards)
  const fill = highlighted ? "#fef08a" : "#ffffff";
  const stroke = highlighted ? "#ca8a04" : (style.strokeColor || "#18181b");
  const textColor = style.strokeColor === '#4b5563' ? "#1f2937" : "#18181b";
  const strokeWidth = highlighted ? "2.5" : style.strokeWidth.toString();
  const filter = style.isRough ? "url(#rough-sketch)" : undefined;

  let shapeElement;

  switch (node.type) {
    case 'start':
    case 'end': {
      const rxVal = HEIGHT / 2;
      shapeElement = <rect x={x} y={y} width={WIDTH} height={HEIGHT} rx={rxVal} ry={rxVal} fill={fill} stroke={stroke} strokeWidth={strokeWidth} filter={filter} />;
      break;
    }
    case 'circle': {
      const r = 20;
      shapeElement = <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} filter={filter} />;
      break;
    }
    case 'process': {
      shapeElement = <rect x={x} y={y} width={WIDTH} height={HEIGHT} rx={style.processRx || 0} ry={style.processRx || 0} fill={fill} stroke={stroke} strokeWidth={strokeWidth} filter={filter} />;
      break;
    }
    case 'io': {
      const skew = style.ioSkew || 18;
      shapeElement = <polygon points={`${x+skew},${y} ${x+WIDTH},${y} ${x+WIDTH-skew},${y+HEIGHT} ${x},${y+HEIGHT}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} filter={filter} />;
      break;
    }
    case 'decision': {
      shapeElement = <polygon points={`${cx},${y} ${x+WIDTH},${cy} ${cx},${y+HEIGHT} ${x},${cy}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} filter={filter} />;
      break;
    }
    case 'loop': {
      const hexTip = style.loopHexTip || 24;
      shapeElement = <polygon points={`${x+hexTip},${y} ${x+WIDTH-hexTip},${y} ${x+WIDTH},${cy} ${x+WIDTH-hexTip},${y+HEIGHT} ${x+hexTip},${y+HEIGHT} ${x},${cy}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} filter={filter} />;
      break;
    }
    case 'loop_begin': {
      const cl = style.loopHexTip ? Math.round(style.loopHexTip * 0.75) : 18;
      shapeElement = <polygon points={`${x+cl},${y} ${x+WIDTH-cl},${y} ${x+WIDTH},${y+cl} ${x+WIDTH},${y+HEIGHT} ${x},${y+HEIGHT} ${x},${y+cl}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} filter={filter} />;
      break;
    }
    case 'loop_end': {
      const ce = style.loopHexTip ? Math.round(style.loopHexTip * 0.75) : 18;
      shapeElement = <polygon points={`${x},${y} ${x+WIDTH},${y} ${x+WIDTH},${y+HEIGHT-ce} ${x+WIDTH-ce},${y+HEIGHT} ${x+ce},${y+HEIGHT} ${x},${y+HEIGHT-ce}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} filter={filter} />;
      break;
    }
    case 'subprogram': {
      const stripe = style.subprogramStripeOffset || 15;
      shapeElement = (
        <g filter={filter}>
           <rect x={x} y={y} width={WIDTH} height={HEIGHT} rx={style.processRx || 0} ry={style.processRx || 0} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
           <line x1={x + stripe} y1={y} x2={x + stripe} y2={y + HEIGHT} stroke={stroke} strokeWidth={strokeWidth} />
           <line x1={x + WIDTH - stripe} y1={y} x2={x + WIDTH - stripe} y2={y + HEIGHT} stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      );
      break;
    }
    default:
      shapeElement = <rect x={x} y={y} width={WIDTH} height={HEIGHT} rx={style.processRx || 0} ry={style.processRx || 0} fill={fill} stroke={stroke} strokeWidth={strokeWidth} filter={filter} />;
  }

  const textLines = node.type === 'circle' ? [node.text] : getNodeLines(node.text, node.type, style);
  const fontSz = node.type === 'circle' ? (style.fontSize + 3) : style.fontSize;
  const fontW = node.type === 'circle' ? "bold" : style.fontWeight;

  return (
    <g>
      {shapeElement}
      <text 
        x={cx} 
        y={cy} 
        fontSize={fontSz.toString()} 
        fontWeight={fontW} 
        fontFamily={fontFamily}
        fill={textColor} 
        textAnchor="middle" 
        dominantBaseline="central"
      >
        {textLines.map((line, i, arr) => (
          <tspan 
            key={i} 
            x={cx} 
            dy={i === 0 ? `-${(arr.length - 1) * ((node.type === 'start' || node.type === 'end') ? 0.55 : 0.65)}em` : ((node.type === 'start' || node.type === 'end') ? "1.15em" : "1.3em")}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

