import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { analyzeProject } from './core/analyzer.js';
import { formatJsonReport } from './reporters/json.js';
import { formatTerminalReport } from './reporters/terminal.js';

const VERSION = '0.1.0';

export const HELP_TEXT = `
ENV DOCTOR (v${VERSION})
Static environment variable & contract linter for Node.js / TypeScript.

USAGE:
  $ npx env-doctor [options]

OPTIONS:
  --ci          Run in CI mode (plain text output)
  --json        Output results as machine-readable JSON
  --cwd <path>  Target directory to analyze (default: current directory)
  -h, --help    Show this help message
  -v, --version Show version number

EXIT CODES:
  0  All required environment variables are present and secure
  1  Missing variables or security issues detected
  2  Fatal execution error
`;

/**
 * Executes the CLI with given arguments. Returns the exit code.
 */
export async function runCli(
  rawArgs: string[],
  stdout: (text: string) => void = (t) => process.stdout.write(t),
  stderr: (text: string) => void = (t) => process.stderr.write(t)
): Promise<number> {
  try {
    const { values } = parseArgs({
      args: rawArgs,
      options: {
        ci: { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        cwd: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
      },
      allowPositionals: false,
    });

    if (values.help) {
      stdout(HELP_TEXT.trim() + '\n');
      return 0;
    }

    if (values.version) {
      stdout(`v${VERSION}\n`);
      return 0;
    }

    const targetCwd = values.cwd || process.cwd();
    const result = await analyzeProject(targetCwd);

    if (values.json) {
      stdout(formatJsonReport(result) + '\n');
    } else {
      stdout(formatTerminalReport(result, values.ci) + '\n');
    }

    return result.status === 'PASSED' ? 0 : 1;
  } catch (err: any) {
    stderr(`\nFATAL ERROR: ${err?.message || err}\n`);
    return 2;
  }
}

// Auto-run if executed directly
const isDirectExecution =
  process.argv[1] &&
  (import.meta.url === pathToFileURL(process.argv[1]).href ||
    process.argv[1].endsWith('cli.js') ||
    process.argv[1].endsWith('cli.ts'));

if (isDirectExecution) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exit(code);
  });
}
