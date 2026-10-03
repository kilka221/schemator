/**
 * Calculates the number of significant lines of code (ignoring empty lines and comments)
 */
export function countSignificantLines(code: string, language?: string): number {
  if (!code || !code.trim()) return 0;

  const lines = code.split(/\r?\n/);
  let count = 0;
  let inBlockComment = false;
  let blockCommentType: 'slash_star' | 'triple_double' | 'triple_single' | 'html' | 'brace' | null = null;

  const lang = (language || '').toLowerCase().trim();
  const isPythonOrRuby = ['python', 'py', 'ruby', 'rb', 'bash', 'sh', 'shell', 'yaml', 'yml', 'r'].includes(lang);
  const isPascal = ['pascal', 'delphi'].includes(lang);

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue; // blank line

    // If we are currently inside a multi-line block comment:
    if (inBlockComment) {
      if (blockCommentType === 'slash_star') {
        const endIdx = line.indexOf('*/');
        if (endIdx !== -1) {
          inBlockComment = false;
          blockCommentType = null;
          line = line.substring(endIdx + 2).trim();
          if (!line) continue;
        } else {
          continue;
        }
      } else if (blockCommentType === 'triple_double') {
        const endIdx = line.indexOf('"""');
        if (endIdx !== -1) {
          inBlockComment = false;
          blockCommentType = null;
          line = line.substring(endIdx + 3).trim();
          if (!line) continue;
        } else {
          continue;
        }
      } else if (blockCommentType === 'triple_single') {
        const endIdx = line.indexOf("'''");
        if (endIdx !== -1) {
          inBlockComment = false;
          blockCommentType = null;
          line = line.substring(endIdx + 3).trim();
          if (!line) continue;
        } else {
          continue;
        }
      } else if (blockCommentType === 'html') {
        const endIdx = line.indexOf('-->');
        if (endIdx !== -1) {
          inBlockComment = false;
          blockCommentType = null;
          line = line.substring(endIdx + 3).trim();
          if (!line) continue;
        } else {
          continue;
        }
      } else if (blockCommentType === 'brace') {
        const endIdx = line.indexOf('}');
        if (endIdx !== -1) {
          inBlockComment = false;
          blockCommentType = null;
          line = line.substring(endIdx + 1).trim();
          if (!line) continue;
        } else {
          continue;
        }
      }
    }

    // Check start of block comment
    if (line.startsWith('/*')) {
      const endIdx = line.indexOf('*/', 2);
      if (endIdx !== -1) {
        // Comment opened and closed on same line
        const rest = line.substring(endIdx + 2).trim();
        if (rest) count++;
        continue;
      } else {
        inBlockComment = true;
        blockCommentType = 'slash_star';
        continue;
      }
    }

    if (isPythonOrRuby && (line.startsWith('"""') || line.startsWith("'''"))) {
      const marker = line.startsWith('"""') ? '"""' : "'''";
      const endIdx = line.indexOf(marker, 3);
      if (endIdx !== -1) {
        const rest = line.substring(endIdx + 3).trim();
        if (rest) count++;
        continue;
      } else {
        inBlockComment = true;
        blockCommentType = marker === '"""' ? 'triple_double' : 'triple_single';
        continue;
      }
    }

    if (isPascal && line.startsWith('{')) {
      const endIdx = line.indexOf('}');
      if (endIdx !== -1) {
        const rest = line.substring(endIdx + 1).trim();
        if (rest) count++;
        continue;
      } else {
        inBlockComment = true;
        blockCommentType = 'brace';
        continue;
      }
    }

    if (line.startsWith('<!--')) {
      const endIdx = line.indexOf('-->', 4);
      if (endIdx !== -1) {
        const rest = line.substring(endIdx + 3).trim();
        if (rest) count++;
        continue;
      } else {
        inBlockComment = true;
        blockCommentType = 'html';
        continue;
      }
    }

    // Single-line comments
    if (line.startsWith('//')) continue;
    if (line.startsWith('#')) continue;
    if (line.startsWith('--')) continue;
    if (line.startsWith(';')) continue;
    if (line.startsWith('*') && (line.length === 1 || /\s/.test(line[1]))) continue;

    // Significant code line!
    count++;
  }

  return count;
}

/**
 * Calculates the cost in "Схемы" for generating a diagram based on significant lines of code.
 * 1 to 80 significant lines = 1 схема.
 * 81 to 160 significant lines = 2 схемы.
 * Every 80 significant lines adds 1 схема.
 */
export function calculateSchemaCost(significantLines: number): number {
  if (significantLines <= 0) return 1;
  return Math.max(1, Math.ceil(significantLines / 80));
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
