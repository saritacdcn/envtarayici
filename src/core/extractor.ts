import { KeyEntry } from './types.js';

/**
 * Extracts environment variable keys and line numbers from .env content.
 * Does NOT store values to ensure secrets are never retained in data structures.
 */
export function extractEnvKeys(content: string, sourceFile: string): Map<string, KeyEntry> {
  const result = new Map<string, KeyEntry>();
  const lines = content.split(/\r?\n/);

  let insideMultilineQuote: '"' | "'" | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Handle multiline string skipping
    if (insideMultilineQuote) {
      let escaped = false;
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }
        if (char === insideMultilineQuote) {
          insideMultilineQuote = null;
          break;
        }
      }
      continue;
    }

    const trimmed = line.trim();

    // Ignore empty lines and comment lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Strip optional leading 'export '
    let lineContent = trimmed;
    if (lineContent.startsWith('export ') || lineContent.startsWith('export\t')) {
      lineContent = lineContent.slice(6).trimStart();
    }

    // Check for KEY= pattern
    const equalsIndex = lineContent.indexOf('=');
    if (equalsIndex <= 0) {
      continue;
    }

    const rawKey = lineContent.slice(0, equalsIndex).trim();

    // Key must be a valid identifier: [A-Za-z_][A-Za-z0-9_]*
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(rawKey)) {
      continue;
    }

    // Examine value part only to determine `hasValue` and multiline state
    const rawValue = lineContent.slice(equalsIndex + 1).trim();

    let hasValue = false;
    if (rawValue.length > 0) {
      const firstChar = rawValue[0];
      if (firstChar === '"' || firstChar === "'") {
        // Check if quote is closed on the same line
        let escaped = false;
        let quoteClosed = false;
        for (let j = 1; j < rawValue.length; j++) {
          const c = rawValue[j];
          if (escaped) {
            escaped = false;
            continue;
          }
          if (c === '\\') {
            escaped = true;
            continue;
          }
          if (c === firstChar) {
            quoteClosed = true;
            // Check if there's actual content between quotes
            const inside = rawValue.slice(1, j);
            hasValue = inside.trim().length > 0;
            break;
          }
        }
        if (!quoteClosed) {
          // Quote continues to next line
          insideMultilineQuote = firstChar;
          hasValue = true;
        }
      } else {
        // Strip inline comments if unquoted: FOO=bar # comment
        let cleanValue = rawValue;
        const commentIndex = cleanValue.indexOf(' #');
        if (commentIndex !== -1) {
          cleanValue = cleanValue.slice(0, commentIndex).trim();
        }
        hasValue = cleanValue.length > 0;
      }
    }

    // If key was already defined earlier in the file, keep the first definition or overwrite?
    // Standard dotenv overwrites, but we want the first or latest line?
    // Usually .env duplicate key might be an issue, but setting it updates the line.
    result.set(rawKey, {
      key: rawKey,
      line: lineNumber,
      sourceFile,
      hasValue,
    });
  }

  return result;
}
