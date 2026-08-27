import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as coreBootstrap from '@gearcube/core';
import { extractModuleSpecifiers, checkCorePurity, PROHIBITED_MODULE_PATTERNS } from '../scripts/check-core-deps.mjs';

void coreBootstrap;

describe('Phase 1A Infrastructure & Package Boundary Gate', () => {
  it('resolves @gearcube/core via package-name import without alias', async () => {
    const core = await import('@gearcube/core');
    expect(core).toBeDefined();
  });

  it('verifies @gearcube/core manifest identity and zero dependency invariant', () => {
    const corePkgPath = path.resolve(process.cwd(), 'packages/core/package.json');
    expect(fs.existsSync(corePkgPath)).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(corePkgPath, 'utf8'));
    expect(pkg.name).toBe('@gearcube/core');
    expect(pkg.version).toBe('0.0.0');
    expect(pkg.private).toBe(true);
    expect(pkg.type).toBe('module');
    expect(pkg.exports).toEqual({ '.': './src/index.ts' });

    expect(pkg.dependencies).toBeUndefined();
    expect(pkg.optionalDependencies).toBeUndefined();
    expect(pkg.peerDependencies).toBeUndefined();
    expect(pkg.devDependencies).toBeUndefined();
  });

  it('verifies @gearcube/web manifest dependency on exact @gearcube/core version', () => {
    const webPkgPath = path.resolve(process.cwd(), 'apps/web/package.json');
    expect(fs.existsSync(webPkgPath)).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf8'));
    expect(pkg.name).toBe('@gearcube/web');
    expect(pkg.version).toBe('0.0.0');
    expect(pkg.private).toBe(true);
    expect(pkg.dependencies['@gearcube/core']).toBe('0.0.0');
  });

  it('verifies core tsconfig strictly excludes DOM and ambient Node types', () => {
    const coreTsconfigPath = path.resolve(process.cwd(), 'packages/core/tsconfig.json');
    expect(fs.existsSync(coreTsconfigPath)).toBe(true);

    const tsconfig = JSON.parse(fs.readFileSync(coreTsconfigPath, 'utf8'));
    const lib = tsconfig.compilerOptions?.lib || [];
    expect(lib).toEqual(['ES2022']);
    expect(lib.some((l: string) => l.toUpperCase().includes('DOM'))).toBe(false);
    expect(tsconfig.compilerOptions?.types).toEqual([]);
  });

  it('verifies apps/web/vite.config.ts contains NO resolve.alias for @gearcube/core', () => {
    const viteConfigPath = path.resolve(process.cwd(), 'apps/web/vite.config.ts');
    expect(fs.existsSync(viteConfigPath)).toBe(true);

    const content = fs.readFileSync(viteConfigPath, 'utf8');
    expect(content.includes('resolve.alias')).toBe(false);
    expect(content.includes('alias:')).toBe(false);
  });

  it('verifies checkCorePurity passes on clean workspace', () => {
    const errors = checkCorePurity(process.cwd());
    expect(errors).toEqual([]);
  });

  describe('Core Purity Scanner Lexical Safety & Specifier Extraction Coverage', () => {
    it('detects static value imports (default and named)', () => {
      expect(extractModuleSpecifiers("import React from 'react';")).toEqual(['react']);
      expect(extractModuleSpecifiers("import { useState, useEffect } from 'react';")).toEqual(['react']);
      expect(extractModuleSpecifiers("import * as THREE from 'three';")).toEqual(['three']);
    });

    it('detects static type imports', () => {
      expect(extractModuleSpecifiers("import type { ReactNode } from 'react';")).toEqual(['react']);
      expect(extractModuleSpecifiers("import type React from 'react';")).toEqual(['react']);
    });

    it('detects side-effect imports', () => {
      expect(extractModuleSpecifiers("import 'react';")).toEqual(['react']);
      expect(extractModuleSpecifiers("import 'zustand';")).toEqual(['zustand']);
    });

    it('detects re-exports (wildcard, named, type, and namespace)', () => {
      expect(extractModuleSpecifiers("export * from 'react';")).toEqual(['react']);
      expect(extractModuleSpecifiers("export { useState } from 'react';")).toEqual(['react']);
      expect(extractModuleSpecifiers("export type { ReactNode } from 'react';")).toEqual(['react']);
      expect(extractModuleSpecifiers("export * as ThreeNamespace from 'three';")).toEqual(['three']);
    });

    it('detects dynamic imports', () => {
      expect(extractModuleSpecifiers("const r = await import('react');")).toEqual(['react']);
      expect(extractModuleSpecifiers("import('zustand')")).toEqual(['zustand']);
    });

    it('ignores import/export-like text inside ordinary single-quoted strings', () => {
      expect(extractModuleSpecifiers("const text = 'import React from \"react\"';")).toEqual([]);
      expect(extractModuleSpecifiers("const text = 'https://example.com';")).toEqual([]);
      expect(extractModuleSpecifiers("const text = '/* import \"react\" */';")).toEqual([]);
    });

    it('ignores import/export-like text inside ordinary double-quoted strings', () => {
      expect(extractModuleSpecifiers('const text = "import React from \'react\'";')).toEqual([]);
      expect(extractModuleSpecifiers('const text = " export * from \'three\'";')).toEqual([]);
    });

    it('ignores import/export-like text inside template literals', () => {
      expect(extractModuleSpecifiers('const text = `import React from "react"`;')).toEqual([]);
      expect(extractModuleSpecifiers('const text = `export * from "three"`;')).toEqual([]);
    });

    it('ignores line comments and block comments', () => {
      expect(extractModuleSpecifiers("// import 'react';")).toEqual([]);
      expect(extractModuleSpecifiers("/* export * from 'react'; */")).toEqual([]);
      expect(extractModuleSpecifiers("// https://example.com/import/react")).toEqual([]);
    });

    it('correctly detects real imports following URL strings', () => {
      const code = "const url = 'https://example.com';\nimport React from 'react';";
      expect(extractModuleSpecifiers(code)).toEqual(['react']);
    });

    it('correctly detects real exports following comment-like strings', () => {
      const code = "const text = '/* not comment */';\nexport * from 'three';";
      expect(extractModuleSpecifiers(code)).toEqual(['three']);
    });

    it('correctly detects real imports following import-like ordinary strings', () => {
      const code = 'const example = "import \'react\'";\nimport \'zustand\';';
      expect(extractModuleSpecifiers(code)).toEqual(['zustand']);
    });

    it('matches prohibited module patterns against extracted specifiers', () => {
      const isProhibited = (spec: string) => PROHIBITED_MODULE_PATTERNS.some((p) => p.test(spec));
      expect(isProhibited('react')).toBe(true);
      expect(isProhibited('react/jsx-runtime')).toBe(true);
      expect(isProhibited('react-dom')).toBe(true);
      expect(isProhibited('three')).toBe(true);
      expect(isProhibited('@react-three/fiber')).toBe(true);
      expect(isProhibited('zustand')).toBe(true);
      expect(isProhibited('../../apps/web')).toBe(true);
      expect(isProhibited('../../packages/renderer')).toBe(true);
      expect(isProhibited('../../packages/ui')).toBe(true);
      expect(isProhibited('./internal-helper.js')).toBe(false);
    });
  });
});

describe('Phase 4A Solvers Package Boundary & Architectural Invariants', () => {
  const solversRoot = path.resolve(process.cwd(), 'packages/solvers');
  const solversSrc = path.join(solversRoot, 'src');

  function collectTsFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...collectTsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it('resolves @gearcube/solvers via package-name import without alias', async () => {
    const solvers = await import('@gearcube/solvers');
    expect(solvers).toBeDefined();
  });

  it('verifies @gearcube/solvers manifest identity and dependencies contract', () => {
    const pkgPath = path.join(solversRoot, 'package.json');
    expect(fs.existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.name).toBe('@gearcube/solvers');
    expect(pkg.version).toBe('0.0.0');
    expect(pkg.private).toBe(true);
    expect(pkg.type).toBe('module');
    expect(pkg.exports).toEqual({ '.': './src/index.ts' });

    // Dependencies must be exactly @gearcube/core@0.0.0
    expect(pkg.dependencies).toEqual({ '@gearcube/core': '0.0.0' });
    expect(pkg.optionalDependencies).toBeUndefined();
    expect(pkg.peerDependencies).toBeUndefined();
  });

  it('verifies solvers tsconfig strictly excludes DOM and ambient Node types', () => {
    const tsconfigPath = path.join(solversRoot, 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);

    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    expect(tsconfig.extends).toBe('../../tsconfig.base.json');
    const lib = tsconfig.compilerOptions?.lib || [];
    expect(lib).toEqual(['ES2022']);
    expect(lib.some((l: string) => l.toUpperCase().includes('DOM'))).toBe(false);
    expect(tsconfig.compilerOptions?.types).toEqual([]);
    expect(tsconfig.include).toEqual(['src/**/*']);
  });

  it('verifies public barrel does NOT export rankState, unrankState, or inverseMove (solver-internal only)', async () => {
    const solvers = (await import('@gearcube/solvers')) as Record<string, unknown>;
    expect(solvers['rankState']).toBeUndefined();
    expect(solvers['unrankState']).toBeUndefined();
    expect(solvers['inverseMove']).toBeUndefined();
  });

  it('verifies all packages/solvers/src modules import ONLY @gearcube/core and package-internal relative paths', () => {
    const files = collectTsFiles(solversSrc);
    expect(files.length).toBeGreaterThan(0);

    const forbiddenImports: Array<{ file: string; spec: string; reason: string }> = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      const specs = extractModuleSpecifiers(content);

      for (const spec of specs) {
        if (spec === '@gearcube/core') {
          // Allowed external dependency
          continue;
        }

        if (spec.startsWith('./') || spec.startsWith('../')) {
          // Verify relative import resolves strictly within packages/solvers
          const resolvedPath = path.resolve(path.dirname(filePath), spec);
          const relativeToSolvers = path.relative(solversRoot, resolvedPath);
          if (relativeToSolvers.startsWith('..') || path.isAbsolute(relativeToSolvers)) {
            forbiddenImports.push({
              file: path.relative(process.cwd(), filePath),
              spec,
              reason: 'Relative import escapes packages/solvers directory boundary',
            });
          }
          continue;
        }

        // Any other external specifier is forbidden
        forbiddenImports.push({
          file: path.relative(process.cwd(), filePath),
          spec,
          reason: 'External import other than @gearcube/core is strictly forbidden in packages/solvers',
        });
      }
    }

    expect(forbiddenImports).toEqual([]);
  });
});

describe('Phase 4D Web Worker Infrastructure & Package Boundary Gate', () => {
  const webRoot = path.resolve(process.cwd(), 'apps/web');
  const webSrc = path.join(webRoot, 'src');

  function collectWebTsFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...collectWebTsFiles(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it('verifies @gearcube/web manifest dependency on exact @gearcube/solvers version', () => {
    const webPkgPath = path.join(webRoot, 'package.json');
    expect(fs.existsSync(webPkgPath)).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf8'));
    expect(pkg.dependencies['@gearcube/solvers']).toBe('0.0.0');
  });

  it('verifies browser Worker entry adapter exists at apps/web/src/workers/solver.worker.ts', () => {
    const workerPath = path.join(webSrc, 'workers', 'solver.worker.ts');
    expect(fs.existsSync(workerPath)).toBe(true);
  });

  it('verifies Worker construction occurs ONLY in useSolverWorker.ts', () => {
    const files = collectWebTsFiles(webSrc);
    const workerConstructionSites: string[] = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('new Worker(')) {
        workerConstructionSites.push(path.relative(process.cwd(), filePath).replace(/\\/g, '/'));
      }
    }

    expect(workerConstructionSites).toEqual(['apps/web/src/hooks/useSolverWorker.ts']);
  });

  it('verifies solver runtime functions (solveBfs, solveBidirectionalBfs, solveIdaStar) are imported ONLY by solver.worker.ts', () => {
    const files = collectWebTsFiles(webSrc);
    const solverRuntimeImportSites: string[] = [];
    const forbiddenSolverFunctions = ['solveBfs', 'solveBidirectionalBfs', 'solveIdaStar'];

    for (const filePath of files) {
      const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
      if (relPath === 'apps/web/src/workers/solver.worker.ts') {
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      for (const fn of forbiddenSolverFunctions) {
        // Match import of the function as a value or direct invocation
        const importRegex = new RegExp(`\\bimport\\s+[^;]*\\b${fn}\\b[^;]*from\\s+['"]@gearcube/solvers['"]`, 'g');
        const callRegex = new RegExp(`\\b${fn}\\s*\\(`, 'g');

        if (importRegex.test(content) || callRegex.test(content)) {
          solverRuntimeImportSites.push(`${relPath}: ${fn}`);
        }
      }
    }

    expect(solverRuntimeImportSites).toEqual([]);
  });
});

describe('Phase 5 Benchmark Package Boundary & Architectural Invariants', () => {
  const benchmarkRoot = path.resolve(process.cwd(), 'packages/benchmark');
  const benchmarkSrc = path.join(benchmarkRoot, 'src');

  function collectTsFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...collectTsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it('resolves @gearcube/benchmark via package-name import without alias', async () => {
    const benchmark = await import('@gearcube/benchmark');
    expect(benchmark).toBeDefined();
  });

  it('verifies @gearcube/benchmark manifest identity and dependencies contract', () => {
    const pkgPath = path.join(benchmarkRoot, 'package.json');
    expect(fs.existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.name).toBe('@gearcube/benchmark');
    expect(pkg.version).toBe('0.0.0');
    expect(pkg.private).toBe(true);
    expect(pkg.type).toBe('module');
    expect(pkg.exports).toEqual({ '.': './src/index.ts' });

    // Dependencies must be exactly @gearcube/core@0.0.0 and @gearcube/solvers@0.0.0
    expect(pkg.dependencies).toEqual({
      '@gearcube/core': '0.0.0',
      '@gearcube/solvers': '0.0.0',
    });
    expect(pkg.optionalDependencies).toBeUndefined();
    expect(pkg.peerDependencies).toBeUndefined();
    expect(pkg.devDependencies).toBeUndefined();
  });

  it('verifies benchmark tsconfig strictly excludes DOM, ambient Node types, and cli.ts', () => {
    const tsconfigPath = path.join(benchmarkRoot, 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);

    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    expect(tsconfig.extends).toBe('../../tsconfig.base.json');
    const lib = tsconfig.compilerOptions?.lib || [];
    expect(lib).toEqual(['ES2022']);
    expect(lib.some((l: string) => l.toUpperCase().includes('DOM'))).toBe(false);
    expect(tsconfig.compilerOptions?.types).toEqual([]);
    expect(tsconfig.include).toEqual(['src/**/*']);
    expect(tsconfig.exclude).toEqual(['src/cli.ts']);
  });

  it('verifies benchmark tsconfig.node.json enables ambient Node types for cli.ts', () => {
    const tsconfigNodePath = path.join(benchmarkRoot, 'tsconfig.node.json');
    expect(fs.existsSync(tsconfigNodePath)).toBe(true);

    const tsconfigNode = JSON.parse(fs.readFileSync(tsconfigNodePath, 'utf8'));
    expect(tsconfigNode.extends).toBe('../../tsconfig.base.json');
    expect(tsconfigNode.compilerOptions?.types).toEqual(['node']);
    expect(tsconfigNode.include).toEqual(['src/cli.ts']);
  });

  it('verifies all browser-safe packages/benchmark/src modules import ONLY @gearcube/core, @gearcube/solvers, and internal relative paths', () => {
    const files = collectTsFiles(benchmarkSrc).filter((f) => !f.endsWith('cli.ts'));
    expect(files.length).toBeGreaterThan(0);

    const forbiddenImports: Array<{ file: string; spec: string; reason: string }> = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      const specs = extractModuleSpecifiers(content);

      for (const spec of specs) {
        if (spec === '@gearcube/core' || spec === '@gearcube/solvers') {
          // Allowed workspace dependencies
          continue;
        }

        if (spec.startsWith('./') || spec.startsWith('../')) {
          // Verify relative import resolves strictly within packages/benchmark and does NOT import cli.ts
          if (spec.includes('cli')) {
            forbiddenImports.push({
              file: path.relative(process.cwd(), filePath),
              spec,
              reason: 'Browser-safe module must not import Node CLI adapter',
            });
            continue;
          }

          const resolvedPath = path.resolve(path.dirname(filePath), spec);
          const relativeToBenchmark = path.relative(benchmarkRoot, resolvedPath);
          if (relativeToBenchmark.startsWith('..') || path.isAbsolute(relativeToBenchmark)) {
            forbiddenImports.push({
              file: path.relative(process.cwd(), filePath),
              spec,
              reason: 'Relative import escapes packages/benchmark directory boundary',
            });
          }
          continue;
        }

        // Any other external specifier is forbidden
        forbiddenImports.push({
          file: path.relative(process.cwd(), filePath),
          spec,
          reason: 'External import other than @gearcube/core or @gearcube/solvers is strictly forbidden in browser-safe benchmark engine',
        });
      }
    }

    expect(forbiddenImports).toEqual([]);
  });

  it('verifies corpus.ts has NO runtime or type dependency on @gearcube/solvers, solver tests, apps/web, or Node built-ins', () => {
    const corpusPath = path.join(benchmarkSrc, 'corpus.ts');
    expect(fs.existsSync(corpusPath)).toBe(true);

    const content = fs.readFileSync(corpusPath, 'utf8');
    const specs = extractModuleSpecifiers(content);

    for (const spec of specs) {
      expect(spec).not.toBe('@gearcube/solvers');
      expect(spec.includes('solvers')).toBe(false);
      expect(spec.includes('apps/web')).toBe(false);
      expect(spec.startsWith('node:')).toBe(false);
    }
  });

  it('verifies sampler.ts contains NO Math.random, Date, or localeCompare calls', () => {
    const samplerPath = path.join(benchmarkSrc, 'sampler.ts');
    expect(fs.existsSync(samplerPath)).toBe(true);

    const content = fs.readFileSync(samplerPath, 'utf8');
    expect(content.includes('Math.random')).toBe(false);
    expect(content.includes('Date')).toBe(false);
    expect(content.includes('localeCompare')).toBe(false);
  });

  it('verifies benchmark root entry exports NO Node built-ins or CLI implementations', async () => {
    const rootIndex = path.join(benchmarkSrc, 'index.ts');
    expect(fs.existsSync(rootIndex)).toBe(true);

    const content = fs.readFileSync(rootIndex, 'utf8');
    expect(content.includes('node:fs')).toBe(false);
    expect(content.includes('node:path')).toBe(false);
    expect(content.includes('cli')).toBe(false);
  });

  it('PUBLIC_RUNNER_API_GATE: verifies root public API exports runBenchmarkSuite without corpus injection and exports BenchmarkConfigError', async () => {
    const benchmark = await import('@gearcube/benchmark');
    expect(typeof benchmark.runBenchmarkSuite).toBe('function');
    expect(benchmark.runBenchmarkSuite.length).toBeLessThanOrEqual(2);

    // Forbidden corpus override exports from root
    expect('RunBenchmarkSuiteOptions' in benchmark).toBe(false);
    expect('runBenchmarkSuiteWithCorpusForTesting' in benchmark).toBe(false);

    // Required BenchmarkConfigError export
    expect(benchmark.BenchmarkConfigError).toBeDefined();
    expect(typeof benchmark.BenchmarkConfigError).toBe('function');
  });

  it('CLI_IMPORT_BOUNDARY_GATE: verifies cli.ts does NOT import directly from @gearcube/core, @gearcube/solvers, ./sampler, ./hash, or ./prng', () => {
    const cliPath = path.join(benchmarkSrc, 'cli.ts');
    expect(fs.existsSync(cliPath)).toBe(true);

    const content = fs.readFileSync(cliPath, 'utf8');
    const specs = extractModuleSpecifiers(content);

    const forbiddenDirectCliImports = [
      '@gearcube/core',
      '@gearcube/solvers',
      './sampler',
      './sampler.js',
      './hash',
      './hash.js',
      './prng',
      './prng.js',
    ];

    for (const spec of specs) {
      expect(forbiddenDirectCliImports).not.toContain(spec);
    }
  });

  it('verifies root devDependencies includes pinned tsx@4.23.12 and @gearcube/benchmark does not depend on it', () => {
    const rootPkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
    expect(rootPkg.devDependencies?.tsx).toBe('4.23.12');

    const benchPkg = JSON.parse(fs.readFileSync(path.join(benchmarkRoot, 'package.json'), 'utf8'));
    expect(benchPkg.dependencies?.tsx).toBeUndefined();
    expect(benchPkg.devDependencies?.tsx).toBeUndefined();
  });
});
