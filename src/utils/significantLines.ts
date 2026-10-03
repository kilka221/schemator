/**
 * Accurately counts operators (statements) in source code for all supported languages:
 * C++, C#, Java, and Python.
 * 
 * Takes into account:
 * - Semicolon-terminated statements (assignments, calls, declarations, returns)
 * - Control flow operators (if, else, for, while, do, switch, case, default, try, catch, finally, with, match)
 * - Function and class definitions
 * - Single-line statement separators (semicolons on the same line)
 * - Properly ignores comments (single-line & multi-line), string literals, and bracket nesting.
 */

export const OPERATORS_PER_SCHEMA = 70;

function stripCommentsAndStringsCStyle(code: string): string {
  let result = '';
  let i = 0;
  const len = code.length;

  while (i < len) {
    // Single-line comment //
    if (code[i] === '/' && code[i + 1] === '/') {
      i += 2;
      while (i < len && code[i] !== '\n') i++;
      result += '\n';
      continue;
    }
    // Multi-line comment /* ... */
    if (code[i] === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < len && !(code[i] === '*' && code[i + 1] === '/')) {
        if (code[i] === '\n') result += '\n';
        i++;
      }
      i += 2;
      result += ' ';
      continue;
    }
    // String literal "..."
    if (code[i] === '"') {
      i++;
      while (i < len && code[i] !== '"') {
        if (code[i] === '\\') i++; // Skip escape
        i++;
      }
      i++;
      result += ' "" ';
      continue;
    }
    // Char literal '...'
    if (code[i] === "'") {
      i++;
      while (i < len && code[i] !== "'") {
        if (code[i] === '\\') i++;
        i++;
      }
      i++;
      result += " '' ";
      continue;
    }
    result += code[i];
    i++;
  }
  return result;
}

function countOperatorsCStyle(code: string): number {
  const clean = stripCommentsAndStringsCStyle(code);
  let count = 0;
  let parenDepth = 0;

  // Preprocessor directives (e.g. #include, #define)
  const lines = clean.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      count++;
    }
  }

  // Count semicolons outside parentheses (ignores for (int i=0; i<n; i++))
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '(') parenDepth++;
    else if (ch === ')') {
      if (parenDepth > 0) parenDepth--;
    } else if (ch === ';') {
      if (parenDepth === 0) {
        count++;
      }
    }
  }

  // Control flow keywords: if, else, for, while, do, switch, case, default, try, catch, finally
  const controlKeywords = [
    /\bif\s*\(/g,
    /\belse\b(?!\s*if\b)/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bdo\s*\{/g,
    /\bswitch\s*\(/g,
    /\bcase\b\s+[^:]+:/g,
    /\bdefault\s*:/g,
    /\btry\s*\{/g,
    /\bcatch\s*\(/g,
    /\bfinally\s*\{/g,
  ];

  for (const re of controlKeywords) {
    const matches = clean.match(re);
    if (matches) count += matches.length;
  }

  // Function / method definitions with body {
  // e.g. int countInRange(...) { or void main() {
  const funcDefRegex = /\b[a-zA-Z0-9_]+\s*\([^)]*\)\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = funcDefRegex.exec(clean)) !== null) {
    const matchedStr = match[0];
    const funcNameMatch = matchedStr.match(/^([a-zA-Z0-9_]+)/);
    if (funcNameMatch) {
      const name = funcNameMatch[1];
      if (!['if', 'for', 'while', 'switch', 'catch', 'using', 'lock'].includes(name)) {
        count++;
      }
    }
  }

  return count;
}

function stripCommentsAndStringsPython(code: string): string {
  let result = '';
  let i = 0;
  const len = code.length;

  while (i < len) {
    // Single-line comment #
    if (code[i] === '#') {
      while (i < len && code[i] !== '\n') i++;
      result += '\n';
      continue;
    }
    // Triple double quote """ ... """
    if (code.startsWith('"""', i)) {
      i += 3;
      while (i < len && !code.startsWith('"""', i)) {
        if (code[i] === '\n') result += '\n';
        i++;
      }
      i += 3;
      result += ' ';
      continue;
    }
    // Triple single quote ''' ... '''
    if (code.startsWith("'''", i)) {
      i += 3;
      while (i < len && !code.startsWith("'''", i)) {
        if (code[i] === '\n') result += '\n';
        i++;
      }
      i += 3;
      result += ' ';
      continue;
    }
    // Double quoted string "..."
    if (code[i] === '"') {
      i++;
      while (i < len && code[i] !== '"') {
        if (code[i] === '\\') i++;
        i++;
      }
      i++;
      result += ' "" ';
      continue;
    }
    // Single quoted string '...'
    if (code[i] === "'") {
      i++;
      while (i < len && code[i] !== "'") {
        if (code[i] === '\\') i++;
        i++;
      }
      i++;
      result += " '' ";
      continue;
    }
    result += code[i];
    i++;
  }
  return result;
}

function countOperatorsPython(code: string): number {
  const clean = stripCommentsAndStringsPython(code);
  const lines = clean.split(/\r?\n/);
  let count = 0;
  let bracketDepth = 0;

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check if bracket depth is 0 at start of line
    const isTopLevel = bracketDepth === 0;

    // Track bracket depth: (), [], {}
    for (let c of line) {
      if (c === '(' || c === '[' || c === '{') bracketDepth++;
      else if (c === ')' || c === ']' || c === '}') {
        if (bracketDepth > 0) bracketDepth--;
      }
    }

    // Only count as statement start if at top level or starting a major compound statement
    if (isTopLevel) {
      // Ignore lines that are just closing brackets
      if (/^[}\]\)]+$/.test(line)) continue;

      // Base statement for this line
      count++;

      // Multiple statements on one line separated by semicolons: a = 1; b = 2; c = 3
      const semicolons = (line.match(/;/g) || []).length;
      if (semicolons > 0) {
        // Trailing semicolon shouldn't add an extra empty statement
        const trailing = line.endsWith(';') ? 1 : 0;
        count += (semicolons - trailing);
      }
    }
  }

  return count;
}

/**
 * Counts the total number of operators / statements in the given code snippet.
 */
export function countOperators(code: string, language?: string): number {
  if (!code || !code.trim()) return 0;
  const lang = (language || '').toLowerCase().trim();

  if (lang === 'cpp' || lang === 'csharp' || lang === 'java' || lang === 'c++' || lang === 'c#') {
    return countOperatorsCStyle(code);
  }

  return countOperatorsPython(code);
}

/**
 * Backwards compatibility alias for countSignificantLines -> now counts operators.
 */
export function countSignificantLines(code: string, language?: string): number {
  return countOperators(code, language);
}

/**
 * Calculates the cost in "Схемы" for generating a diagram based on operators count.
 * 1 to 70 operators = 1 схема.
 * 71 to 140 operators = 2 схемы.
 * Every 70 operators adds 1 схема.
 */
export function calculateSchemaCost(operatorCount: number): number {
  if (operatorCount <= 0) return 1;
  return Math.max(1, Math.ceil(operatorCount / OPERATORS_PER_SCHEMA));
}

/**
 * Formats count with Russian noun declension for "оператор":
 * 1 оператор, 2 оператора, 5 операторов
 */
export function formatOperatorsRu(count: number): string {
  const abs = Math.abs(count) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return `${count} операторов`;
  if (lastDigit > 1 && lastDigit < 5) return `${count} оператора`;
  if (lastDigit === 1) return `${count} оператор`;
  return `${count} операторов`;
}

/**
 * Formats count with Russian noun declension for "схема":
 * 1 схема, 2 схемы, 5 схем
 */
export function formatSchemaCountRu(count: number): string {
  const abs = Math.abs(count) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return `${count} схем`;
  if (lastDigit > 1 && lastDigit < 5) return `${count} схемы`;
  if (lastDigit === 1) return `${count} схема`;
  return `${count} схем`;
}
