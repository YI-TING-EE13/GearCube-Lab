import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';
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
 * Extracts ESM module specifiers using the TypeScript AST.
 * Static imports, re-exports, type imports, and literal dynamic imports are collected.
 */
export function extractModuleSpecifiers(source) {
  const sourceFile = ts.createSourceFile(
    'core-dependency-scan.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const specifiers = [];

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier.text);
      }
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteralLike(argument)) {
        specifiers.push(argument.text);
      }
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      specifiers.push(node.argument.literal.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
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
