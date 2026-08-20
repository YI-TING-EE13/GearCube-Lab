import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const PROHIBITED_MODULE_PATTERNS = [
  /^react(\/.*)?$/,
  /^react-dom(\/.*)?$/,
  /^three(\/.*)?$/,
  /^@react-three(\/.*)?$/,
  /^zustand(\/.*)?$/,
  /^\.\.\/\.\.\/apps\/web/,
  /^\.\.\/\.\.\/packages\/renderer/,
  /^\.\.\/\.\.\/packages\/ui/
];

/**
 * Deterministic lexical tokenizer distinguishing:
 * - normal code (WORD, PUNCT, OTHER)
 * - single-quoted strings ('...')
 * - double-quoted strings ("...")
 * - template literals (`...`)
 * - line comments (// ...)
 * - block comments (/* ... *\/)
 */
export function tokenize(source) {
  const tokens = [];
  const len = source.length;
  let i = 0;

  while (i < len) {
    const ch = source[i];
    const nextCh = i + 1 < len ? source[i + 1] : '';

    // 1. Whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // 2. Line comment: // ...
    if (ch === '/' && nextCh === '/') {
      i += 2;
      while (i < len && source[i] !== '\n') {
        i++;
      }
      continue;
    }

    // 3. Block comment: /* ... */
    if (ch === '/' && nextCh === '*') {
      i += 2;
      while (i < len && !(source[i] === '*' && i + 1 < len && source[i + 1] === '/')) {
        i++;
      }
      if (i < len) i += 2;
      continue;
    }

    // 4. Single-quoted string: '...'
    if (ch === "'") {
      i++;
      let val = '';
      while (i < len && source[i] !== "'") {
        if (source[i] === '\\' && i + 1 < len) {
          val += source[i + 1];
          i += 2;
        } else {
          val += source[i];
          i++;
        }
      }
      if (i < len) i++; // consume closing '
      tokens.push({ type: 'STRING', value: val });
      continue;
    }

    // 5. Double-quoted string: "..."
    if (ch === '"') {
      i++;
      let val = '';
      while (i < len && source[i] !== '"') {
        if (source[i] === '\\' && i + 1 < len) {
          val += source[i + 1];
          i += 2;
        } else {
          val += source[i];
          i++;
        }
      }
      if (i < len) i++; // consume closing "
      tokens.push({ type: 'STRING', value: val });
      continue;
    }

    // 6. Template literal: `...`
    if (ch === '`') {
      i++;
      let val = '';
      let isPlainString = true;
      while (i < len && source[i] !== '`') {
        if (source[i] === '\\' && i + 1 < len) {
          val += source[i + 1];
          i += 2;
        } else if (source[i] === '$' && i + 1 < len && source[i + 1] === '{') {
          isPlainString = false;
          i += 2;
          let braceDepth = 1;
          while (i < len && braceDepth > 0) {
            if (source[i] === '{') braceDepth++;
            else if (source[i] === '}') braceDepth--;
            else if (source[i] === "'" || source[i] === '"' || source[i] === '`') {
              const quote = source[i];
              i++;
              while (i < len && source[i] !== quote) {
                if (source[i] === '\\') i += 2;
                else i++;
              }
              if (i < len) i++;
            } else {
              i++;
            }
          }
        } else {
          val += source[i];
          i++;
        }
      }
      if (i < len) i++; // consume closing `
      if (isPlainString) {
        tokens.push({ type: 'STRING', value: val });
      } else {
        tokens.push({ type: 'TEMPLATE', value: val });
      }
      continue;
    }

    // 7. Punctuation
    if (/[(){}[\];,.*]/.test(ch)) {
      tokens.push({ type: 'PUNCT', value: ch });
      i++;
      continue;
    }

    // 8. Word / Identifier / Keyword
    if (/[\w$]/.test(ch)) {
      let word = '';
      while (i < len && /[\w$]/.test(source[i])) {
        word += source[i];
        i++;
      }
      tokens.push({ type: 'WORD', value: word });
      continue;
    }

    // 9. Other characters
    tokens.push({ type: 'OTHER', value: ch });
    i++;
  }

  return tokens;
}

/**
 * Extracts ESM module specifiers from token stream in normal code context.
 * Recognizes:
 * - import x from 'pkg'
 * - import { x } from 'pkg'
 * - import type { x } from 'pkg'
 * - import * as x from 'pkg'
 * - import 'pkg'
 * - export * from 'pkg'
 * - export { x } from 'pkg'
 * - export type { x } from 'pkg'
 * - export * as x from 'pkg'
 * - import('pkg')
 */
export function extractModuleSpecifiers(source) {
  const tokens = tokenize(source);
  const specifiers = [];
  const len = tokens.length;

  for (let i = 0; i < len; i++) {
    const t = tokens[i];

    // 1. Dynamic import: import ( 'pkg' )
    if (t.type === 'WORD' && t.value === 'import') {
      if (i + 1 < len && tokens[i + 1].type === 'PUNCT' && tokens[i + 1].value === '(') {
        if (i + 2 < len && tokens[i + 2].type === 'STRING') {
          specifiers.push(tokens[i + 2].value);
          i += 2;
          continue;
        }
      }

      // 2. Side-effect import: import 'pkg'
      if (i + 1 < len && tokens[i + 1].type === 'STRING') {
        specifiers.push(tokens[i + 1].value);
        i += 1;
        continue;
      }

      // 3. Static import with from: import ... from 'pkg'
      let j = i + 1;
      while (j < len && !(tokens[j].type === 'PUNCT' && tokens[j].value === ';')) {
        if (tokens[j].type === 'WORD' && tokens[j].value === 'from') {
          if (j + 1 < len && tokens[j + 1].type === 'STRING') {
            specifiers.push(tokens[j + 1].value);
            i = j + 1;
            break;
          }
        }
        if (tokens[j].type === 'WORD' && (tokens[j].value === 'import' || tokens[j].value === 'export')) {
          break;
        }
        j++;
      }
      continue;
    }

    // 4. Re-export with from: export ... from 'pkg'
    if (t.type === 'WORD' && t.value === 'export') {
      let j = i + 1;
      while (j < len && !(tokens[j].type === 'PUNCT' && tokens[j].value === ';')) {
        if (tokens[j].type === 'WORD' && tokens[j].value === 'from') {
          if (j + 1 < len && tokens[j + 1].type === 'STRING') {
            specifiers.push(tokens[j + 1].value);
            i = j + 1;
            break;
          }
        }
        if (tokens[j].type === 'WORD' && (tokens[j].value === 'import' || tokens[j].value === 'export')) {
          break;
        }
        j++;
      }
      continue;
    }
  }

  return specifiers;
}

export function checkCorePurity(rootDir = process.cwd()) {
  const corePkgPath = path.join(rootDir, 'packages', 'core', 'package.json');
  const coreTsconfigPath = path.join(rootDir, 'packages', 'core', 'tsconfig.json');
  const coreSrcDir = path.join(rootDir, 'packages', 'core', 'src');

  const errors = [];

  // 1. Check packages/core/package.json
  if (!fs.existsSync(corePkgPath)) {
    errors.push(`Missing packages/core/package.json at ${corePkgPath}`);
  } else {
    const pkg = JSON.parse(fs.readFileSync(corePkgPath, 'utf8'));
    const checkFields = ['dependencies', 'optionalDependencies', 'peerDependencies', 'devDependencies'];
    for (const field of checkFields) {
      if (pkg[field] && Object.keys(pkg[field]).length > 0) {
        errors.push(`packages/core/package.json must not have non-empty '${field}'. Found: ${JSON.stringify(pkg[field])}`);
      }
    }
  }

  // 2. Check packages/core/tsconfig.json
  if (!fs.existsSync(coreTsconfigPath)) {
    errors.push(`Missing packages/core/tsconfig.json at ${coreTsconfigPath}`);
  } else {
    const tsconfig = JSON.parse(fs.readFileSync(coreTsconfigPath, 'utf8'));
    const lib = tsconfig.compilerOptions?.lib || [];
    if (lib.some((l) => l.toUpperCase().includes('DOM'))) {
      errors.push(`packages/core/tsconfig.json must not include DOM lib. Found lib: ${JSON.stringify(lib)}`);
    }
    const types = tsconfig.compilerOptions?.types;
    if (!Array.isArray(types) || types.length > 0) {
      errors.push(`packages/core/tsconfig.json must configure "types": [] to prevent ambient Node typings. Found types: ${JSON.stringify(types)}`);
    }
  }

  // 3. Scan packages/core/src for prohibited imports
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const specifiers = extractModuleSpecifiers(content);
        for (const specifier of specifiers) {
          for (const pattern of PROHIBITED_MODULE_PATTERNS) {
            if (pattern.test(specifier)) {
              errors.push(`Prohibited import '${specifier}' found in ${path.relative(rootDir, fullPath)}`);
            }
          }
        }
      }
    }
  }

  scanDir(coreSrcDir);
  return errors;
}

// Direct execution entrypoint
const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  const errors = checkCorePurity();
  if (errors.length > 0) {
    console.error('CORE PURITY GATE FAILURES:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  } else {
    console.log('CORE PURITY GATE PASSED: packages/core has zero runtime/dev dependencies, no DOM lib, no Node ambient types, and zero prohibited framework imports.');
    process.exit(0);
  }
}
