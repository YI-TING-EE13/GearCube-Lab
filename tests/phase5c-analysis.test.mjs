import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { commitDerivedOutputs } from '../scripts/analyze-phase5c.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const analyzerPath = path.join(repoRoot, 'scripts', 'analyze-phase5c.mjs');
const rawFiles = [
  'structural-depth1.json',
  'structural-depth2-8.json',
  'timing-r1.json',
  'timing-r2.json',
  'timing-r3.json',
];
const csvFiles = [
  'structural-depth1.csv',
  'structural-depth2-8.csv',
  'timing-r1.csv',
  'timing-r2.csv',
  'timing-r3.csv',
];
const configFiles = [
  'structural-depth1.json',
  'structural-depth2-8.json',
  'timing.json',
];
const canonicalOutputNames = [
  'structural-by-depth.csv',
  'timing-by-depth.csv',
  'reproducibility-check.json',
];
const oldOutputs = {
  structuralCsvContent: 'old structural output\n',
  timingCsvContent: 'old timing output\n',
  reproContent: '{"old":true}\n',
};
const newOutputs = {
  structuralCsvContent: 'new structural output\n',
  timingCsvContent: 'new timing output\n',
  reproContent: '{"new":true}\n',
};

const temporaryRoots = [];

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gearcube-phase5c-test-'));
  temporaryRoots.push(root);

  const rawDir = path.join(root, 'docs', 'research', 'phase5c', 'raw');
  const configDir = path.join(root, 'docs', 'research', 'phase5c', 'configs');
  const derivedDir = path.join(root, 'docs', 'research', 'phase5c', 'derived');
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(derivedDir, { recursive: true });

  for (const relativePath of rawFiles
    .concat(csvFiles)
    .map((filename) => path.join('docs', 'research', 'phase5c', 'raw', filename))) {
    const targetPath = path.join(root, relativePath);
    const blob = spawnSync('git', ['cat-file', 'blob', `HEAD:${relativePath.replaceAll(path.sep, '/')}`], {
      cwd: repoRoot,
      encoding: 'buffer',
    });
    if (blob.status !== 0) throw new Error(`Unable to read canonical Git blob: ${relativePath}`);
    fs.writeFileSync(targetPath, blob.stdout);
  }
  for (const relativePath of configFiles
    .map((filename) => path.join('docs', 'research', 'phase5c', 'configs', filename))) {
    const targetPath = path.join(root, relativePath);
    const blob = spawnSync('git', ['cat-file', 'blob', `HEAD:${relativePath.replaceAll(path.sep, '/')}`], {
      cwd: repoRoot,
      encoding: 'buffer',
    });
    if (blob.status !== 0) throw new Error(`Unable to read canonical Git blob: ${relativePath}`);
    fs.writeFileSync(targetPath, blob.stdout);
  }

  return { root, rawDir, configDir, derivedDir };
}

function runAnalyzer(root) {
  return spawnSync(process.execPath, [analyzerPath], {
    cwd: root,
    encoding: 'utf8',
  });
}

function outputPaths(derivedDir) {
  return canonicalOutputNames.map((filename) => path.join(derivedDir, filename));
}

function writeOutputs(derivedDir, outputs) {
  fs.mkdirSync(derivedDir, { recursive: true });
  fs.writeFileSync(path.join(derivedDir, 'structural-by-depth.csv'), outputs.structuralCsvContent, 'utf8');
  fs.writeFileSync(path.join(derivedDir, 'timing-by-depth.csv'), outputs.timingCsvContent, 'utf8');
  fs.writeFileSync(path.join(derivedDir, 'reproducibility-check.json'), outputs.reproContent, 'utf8');
}

function readOutputSet(derivedDir) {
  return outputPaths(derivedDir).map((filePath) => fs.readFileSync(filePath));
}

function expectOutputSet(derivedDir, outputs) {
  expect(readOutputSet(derivedDir)).toEqual([
    Buffer.from(outputs.structuralCsvContent),
    Buffer.from(outputs.timingCsvContent),
    Buffer.from(outputs.reproContent),
  ]);
  expect(fs.readdirSync(derivedDir).filter((name) => name.startsWith('.phase5c-transaction-'))).toEqual([]);
}

function makeFilesystemDouble({ failWrite = false, failInstallAt = 0 } = {}) {
  let installCount = 0;

  return {
    existsSync: fs.existsSync,
    mkdtempSync: fs.mkdtempSync,
    mkdirSync: fs.mkdirSync,
    writeFileSync(filePath, content, encoding) {
      if (failWrite && filePath.includes(`${path.sep}staged${path.sep}`)) {
        throw new Error('injected staged-write failure');
      }
      return fs.writeFileSync(filePath, content, encoding);
    },
    renameSync(sourcePath, targetPath) {
      const result = fs.renameSync(sourcePath, targetPath);
      if (sourcePath.includes(`${path.sep}staged${path.sep}`)) {
        installCount += 1;
        if (installCount === failInstallAt) {
          throw new Error(`injected install failure ${installCount}`);
        }
      }
      return result;
    },
    unlinkSync: fs.unlinkSync,
    rmSync: fs.rmSync,
  };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 5C artifact analysis', () => {
  it('accepts the canonical config, raw JSON, and raw CSV hash baseline', () => {
    const fixture = createFixture();
    const inputSnapshots = [
      ...rawFiles.map((filename) => path.join(fixture.rawDir, filename)),
      ...csvFiles.map((filename) => path.join(fixture.rawDir, filename)),
      ...configFiles.map((filename) => path.join(fixture.configDir, filename)),
    ].map((filePath) => fs.readFileSync(filePath));

    const result = runAnalyzer(fixture.root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('PHASE5C_ANALYSIS_COMPLETE');
    expect(inputSnapshots).toEqual([
      ...rawFiles.map((filename) => path.join(fixture.rawDir, filename)),
      ...csvFiles.map((filename) => path.join(fixture.rawDir, filename)),
      ...configFiles.map((filename) => path.join(fixture.configDir, filename)),
    ].map((filePath) => fs.readFileSync(filePath)));
  }, 30_000);

  it.each([
    ['config', path.join('docs', 'research', 'phase5c', 'configs', 'timing.json'), 'config SHA256 mismatch'],
    ['raw JSON', path.join('docs', 'research', 'phase5c', 'raw', 'timing-r1.json'), 'raw JSON SHA256 mismatch'],
    ['raw CSV', path.join('docs', 'research', 'phase5c', 'raw', 'timing-r1.csv'), 'raw CSV SHA256 mismatch'],
  ])('rejects a mutated %s before touching canonical outputs', (_label, relativePath, expectedMessage) => {
    const fixture = createFixture();
    writeOutputs(fixture.derivedDir, oldOutputs);
    fs.appendFileSync(path.join(fixture.root, relativePath), Buffer.from('x'));

    const result = runAnalyzer(fixture.root);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(expectedMessage);
    expectOutputSet(fixture.derivedDir, oldOutputs);
  });
});

describe('Phase 5C output transaction', () => {
  it('replaces all outputs as one clean set on success', () => {
    const fixture = createFixture();
    writeOutputs(fixture.derivedDir, oldOutputs);

    commitDerivedOutputs(newOutputs, fixture.derivedDir);

    expectOutputSet(fixture.derivedDir, newOutputs);
  });

  it('preserves the complete old set when staging fails before replacement', () => {
    const fixture = createFixture();
    writeOutputs(fixture.derivedDir, oldOutputs);

    expect(() => commitDerivedOutputs(newOutputs, fixture.derivedDir, makeFilesystemDouble({ failWrite: true })))
      .toThrow('injected staged-write failure');

    expectOutputSet(fixture.derivedDir, oldOutputs);
  });

  it.each([1, 2])('restores the complete old set when replacement fails after install %i', (failInstallAt) => {
    const fixture = createFixture();
    writeOutputs(fixture.derivedDir, oldOutputs);

    expect(() => commitDerivedOutputs(
      newOutputs,
      fixture.derivedDir,
      makeFilesystemDouble({ failInstallAt }),
    )).toThrow(`injected install failure ${failInstallAt}`);

    expectOutputSet(fixture.derivedDir, oldOutputs);
  });
});
