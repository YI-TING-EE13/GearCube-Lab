import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import type { EnvironmentProvenance } from './types.js';
import { BenchmarkConfigError } from './config.js';
import { runBenchmarkSuite } from './runner.js';
import { serializeBenchmarkReportCsv, serializeBenchmarkReportJson } from './export.js';

interface CliArgs {
  readonly configPath: string;
  readonly jsonPath?: string;
  readonly csvPath?: string;
}

function parseCliArgs(args: readonly string[]): { parsed?: CliArgs; error?: string } {
  let configPath: string | undefined;
  let jsonPath: string | undefined;
  let csvPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--config') {
      if (i + 1 >= args.length) return { error: 'Missing argument for --config' };
      configPath = args[++i];
    } else if (arg === '--json') {
      if (i + 1 >= args.length) return { error: 'Missing argument for --json' };
      jsonPath = args[++i];
    } else if (arg === '--csv') {
      if (i + 1 >= args.length) return { error: 'Missing argument for --csv' };
      csvPath = args[++i];
    } else {
      return { error: `Unknown or unexpected CLI option: ${arg}` };
    }
  }

  if (!configPath) {
    return { error: 'Missing required option: --config <path>' };
  }

  return {
    parsed: {
      configPath,
      ...(jsonPath !== undefined ? { jsonPath } : {}),
      ...(csvPath !== undefined ? { csvPath } : {}),
    },
  };
}

function getEnvironmentProvenance(): EnvironmentProvenance {
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model;
  return {
    platform: 'node',
    executionTimestamp: new Date().toISOString(),
    os: os.platform(),
    architecture: os.arch(),
    nodeVersion: globalThis.process.version,
    ...(cpuModel !== undefined ? { cpuModel } : {}),
    logicalCores: cpus.length,
  };
}

/**
 * Runs one headless benchmark suite from CLI arguments.
 *
 * The adapter reads and validates the JSON configuration, executes the suite,
 * and writes optional JSON/CSV files; without file output it writes the JSON
 * report to stdout. Usage, file-read, JSON-parse, and configuration-validation
 * failures are written to stderr and return exit code 2. Benchmark execution
 * and export failures return 1; success returns 0.
 *
 * @param args Command-line arguments after the executable name
 * @returns Process exit code (`0` success, `1` execution/export error, `2` usage/config error)
 */
export async function runCli(args: readonly string[]): Promise<number> {
  const { parsed, error } = parseCliArgs(args);
  if (error || !parsed) {
    globalThis.process.stderr.write(`Error: ${error}\nUsage: npm run benchmark -- --config <config.json> [--json <out.json>] [--csv <out.csv>]\n`);
    return 2;
  }

  let rawConfigStr: string;
  try {
    rawConfigStr = await fs.readFile(parsed.configPath, 'utf8');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    globalThis.process.stderr.write(`Failed to read config file at "${parsed.configPath}": ${msg}\n`);
    return 2;
  }

  let configObj: unknown;
  try {
    configObj = JSON.parse(rawConfigStr);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    globalThis.process.stderr.write(`Failed to parse config JSON: ${msg}\n`);
    return 2;
  }

  const environment = getEnvironmentProvenance();

  let report;
  try {
    report = runBenchmarkSuite(configObj, environment);
  } catch (err: unknown) {
    if (err instanceof BenchmarkConfigError) {
      globalThis.process.stderr.write(`Configuration validation error: ${err.message}\n`);
      return 2;
    }
    const msg = err instanceof Error ? err.message : String(err);
    globalThis.process.stderr.write(`Benchmark execution error: ${msg}\n`);
    return 1;
  }

  const hasFileOutput = parsed.jsonPath !== undefined || parsed.csvPath !== undefined;

  try {
    if (parsed.jsonPath) {
      const jsonContent = serializeBenchmarkReportJson(report) + '\n';
      await fs.mkdir(path.dirname(path.resolve(parsed.jsonPath)), { recursive: true });
      await fs.writeFile(parsed.jsonPath, jsonContent, 'utf8');
    }

    if (parsed.csvPath) {
      const csvContent = serializeBenchmarkReportCsv(report);
      await fs.mkdir(path.dirname(path.resolve(parsed.csvPath)), { recursive: true });
      await fs.writeFile(parsed.csvPath, csvContent, 'utf8');
    }

    if (!hasFileOutput) {
      globalThis.process.stdout.write(serializeBenchmarkReportJson(report) + '\n');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    globalThis.process.stderr.write(`Export write error: ${msg}\n`);
    return 1;
  }

  return 0;
}

// Auto-run if executed directly as entrypoint
const entryArg = globalThis.process.argv[1];
const isDirectRun =
  entryArg !== undefined &&
  path.resolve(entryArg) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  runCli(globalThis.process.argv.slice(2))
    .then((code) => {
      globalThis.process.exitCode = code;
    })
    .catch((err) => {
      globalThis.process.stderr.write(`Fatal error: ${err}\n`);
      globalThis.process.exitCode = 1;
    });
}
