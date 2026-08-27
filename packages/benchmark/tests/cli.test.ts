import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runCli } from '../src/cli.js';

const execFileAsync = promisify(execFile);

describe('Phase 5B Node CLI Adapter Gates', () => {
  let tempDir: string;
  let validConfigPath: string;
  let invalidConfigPath: string;
  let limitConfigPath: string;

  const baseValidConfig = {
    schemaVersion: '1',
    suiteId: 'cli-test-suite',
    seed: 'cli-seed-01',
    exactDepths: [1, 2],
    casesPerDepth: 1,
    algorithms: ['BFS'],
    warmupRuns: 0,
    measuredRuns: 1,
  };

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gearcube-cli-test-'));

    validConfigPath = path.join(tempDir, 'valid-config.json');
    await fs.writeFile(validConfigPath, JSON.stringify(baseValidConfig, null, 2), 'utf8');

    invalidConfigPath = path.join(tempDir, 'invalid-config.json');
    await fs.writeFile(
      invalidConfigPath,
      JSON.stringify({ schemaVersion: '2', suiteId: 'cli-invalid' }, null, 2),
      'utf8',
    );

    limitConfigPath = path.join(tempDir, 'limit-config.json');
    await fs.writeFile(
      limitConfigPath,
      JSON.stringify(
        {
          ...baseValidConfig,
          exactDepths: [2],
          limits: { maxDepth: 0 },
        },
        null,
        2,
      ),
      'utf8',
    );
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  describe('CLI_INVALID_CONFIG_EXIT_MATRIX: Configuration Error Classification', () => {
    async function writeTempConfig(cfg: unknown): Promise<string> {
      const p = path.join(tempDir, `cfg-${Math.random().toString(36).slice(2)}.json`);
      await fs.writeFile(p, JSON.stringify(cfg), 'utf8');
      return p;
    }

    it('returns exit code 2 when --config option is missing', async () => {
      expect(await runCli([])).toBe(2);
    });

    it('returns exit code 2 when config file does not exist', async () => {
      expect(await runCli(['--config', path.join(tempDir, 'non-existent.json')])).toBe(2);
    });

    it('returns exit code 2 on wrong schemaVersion', async () => {
      const cfgPath = await writeTempConfig({ ...baseValidConfig, schemaVersion: '2' });
      expect(await runCli(['--config', cfgPath])).toBe(2);
    });

    it('returns exit code 2 on empty suiteId', async () => {
      const cfgPath = await writeTempConfig({ ...baseValidConfig, suiteId: '' });
      expect(await runCli(['--config', cfgPath])).toBe(2);
    });

    it('returns exit code 2 on non-string seed', async () => {
      const cfgPath = await writeTempConfig({ ...baseValidConfig, seed: 12345 });
      expect(await runCli(['--config', cfgPath])).toBe(2);
    });

    it('returns exit code 2 on invalid exactDepth', async () => {
      const cfgPath = await writeTempConfig({ ...baseValidConfig, exactDepths: [9] });
      expect(await runCli(['--config', cfgPath])).toBe(2);
    });

    it('returns exit code 2 on casesPerDepth = 0', async () => {
      const cfgPath = await writeTempConfig({ ...baseValidConfig, casesPerDepth: 0 });
      expect(await runCli(['--config', cfgPath])).toBe(2);
    });

    it('returns exit code 2 on empty algorithms', async () => {
      const cfgPath = await writeTempConfig({ ...baseValidConfig, algorithms: [] });
      expect(await runCli(['--config', cfgPath])).toBe(2);
    });

    it('returns exit code 2 on unsupported algorithm', async () => {
      const cfgPath = await writeTempConfig({ ...baseValidConfig, algorithms: ['UNKNOWN_ALG'] });
      expect(await runCli(['--config', cfgPath])).toBe(2);
    });

    it('returns exit code 2 on duplicate algorithm', async () => {
      const cfgPath = await writeTempConfig({ ...baseValidConfig, algorithms: ['BFS', 'BFS'] });
      expect(await runCli(['--config', cfgPath])).toBe(2);
    });

    it('returns exit code 2 on warmupRuns = -1', async () => {
      const cfgPath = await writeTempConfig({ ...baseValidConfig, warmupRuns: -1 });
      expect(await runCli(['--config', cfgPath])).toBe(2);
    });

    it('returns exit code 2 on measuredRuns = 0', async () => {
      const cfgPath = await writeTempConfig({ ...baseValidConfig, measuredRuns: 0 });
      expect(await runCli(['--config', cfgPath])).toBe(2);
    });

    it('returns exit code 2 on invalid maxNodes', async () => {
      const cfgPath = await writeTempConfig({ ...baseValidConfig, limits: { maxNodes: 0 } });
      expect(await runCli(['--config', cfgPath])).toBe(2);
    });

    it('returns exit code 2 on invalid maxDepth', async () => {
      const cfgPath = await writeTempConfig({ ...baseValidConfig, limits: { maxDepth: -1 } });
      expect(await runCli(['--config', cfgPath])).toBe(2);
    });

    it('returns exit code 2 on corpus capacity overflow (casesPerDepth > available bucket states)', async () => {
      const cfgPath = await writeTempConfig({ ...baseValidConfig, exactDepths: [1], casesPerDepth: 99999 });
      expect(await runCli(['--config', cfgPath])).toBe(2);
    });
  });

  describe('CLI_OPERATIONAL_FAILURE_GATE: Operational & Filesystem Export Failure', () => {
    it('returns exit code 1 when file export fails due to invalid destination path (target is existing directory)', async () => {
      // Writing to an existing directory path causes fs.writeFile to throw EISDIR / operational failure
      const exitCode = await runCli([
        '--config',
        validConfigPath,
        '--json',
        tempDir,
      ]);
      expect(exitCode).toBe(1);
    });
  });

  describe('CLI Execution & Formatting Interface', () => {
    it('returns exit code 0 and writes JSON & CSV outputs on valid execution', async () => {
      const outJson = path.join(tempDir, 'out.json');
      const outCsv = path.join(tempDir, 'out.csv');

      const exitCode = await runCli([
        '--config',
        validConfigPath,
        '--json',
        outJson,
        '--csv',
        outCsv,
      ]);

      expect(exitCode).toBe(0);

      const jsonStr = await fs.readFile(outJson, 'utf8');
      const parsedJson = JSON.parse(jsonStr);
      expect(parsedJson.schemaVersion).toBe('1');
      expect(parsedJson.cases.length).toBe(2);
      expect(parsedJson.trials.length).toBe(2);

      const csvStr = await fs.readFile(outCsv, 'utf8');
      const csvLines = csvStr.trim().split('\n');
      expect(csvLines.length).toBe(3); // Header + 2 trials
      expect(csvLines[0]).toBe(
        'schemaVersion,suiteId,seed,caseId,exactDepth,algorithm,repetitionIndex,status,solutionDepth,solutionMoves,nodesExpanded,nodesGenerated,limitReason,elapsedMs',
      );
    });

    it('returns exit code 0 for LIMIT_REACHED trial results', async () => {
      const outJson = path.join(tempDir, 'limit-out.json');
      const exitCode = await runCli(['--config', limitConfigPath, '--json', outJson]);
      expect(exitCode).toBe(0);

      const jsonStr = await fs.readFile(outJson, 'utf8');
      const parsed = JSON.parse(jsonStr);
      expect(parsed.trials[0]?.status).toBe('LIMIT_REACHED');
      expect(parsed.trials[0]?.limitReason).toBe('MAX_DEPTH');
    });
  });

  describe('CLI_REAL_SUBPROCESS_GATE: Subprocess Acceptance', () => {
    it('executes the real root npm run benchmark script in a subprocess', async () => {
      const subOutJson = path.join(tempDir, 'sub-out.json');
      const subOutCsv = path.join(tempDir, 'sub-out.csv');

      const isWindows = process.platform === 'win32';
      const npmCmd = isWindows ? 'npm.cmd' : 'npm';

      const { stdout, stderr } = await execFileAsync(
        npmCmd,
        [
          'run',
          'benchmark',
          '--',
          '--config',
          validConfigPath,
          '--json',
          subOutJson,
          '--csv',
          subOutCsv,
        ],
        { cwd: process.cwd(), timeout: 30000, shell: true },
      );

      const jsonExists = await fs
        .access(subOutJson)
        .then(() => true)
        .catch(() => false);
      const csvExists = await fs
        .access(subOutCsv)
        .then(() => true)
        .catch(() => false);

      expect(jsonExists).toBe(true);
      expect(csvExists).toBe(true);

      const jsonContent = await fs.readFile(subOutJson, 'utf8');
      const parsed = JSON.parse(jsonContent);
      expect(parsed.schemaVersion).toBe('1');
      expect(parsed.trials.length).toBe(2);
    }, 40000);
  });
});