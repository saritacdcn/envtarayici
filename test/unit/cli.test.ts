import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runCli } from '../../src/cli.js';

describe('runCli', () => {
  let tempDir: string;
  let stdoutLogs: string[];
  let stderrLogs: string[];

  const mockStdout = (msg: string) => {
    stdoutLogs.push(msg);
  };
  const mockStderr = (msg: string) => {
    stderrLogs.push(msg);
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'envtarayici-cli-'));
    stdoutLogs = [];
    stderrLogs = [];
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('prints help text and returns exit code 0 for --help', async () => {
    const code = await runCli(['--help'], mockStdout, mockStderr);

    expect(code).toBe(0);
    expect(stdoutLogs.join('')).toContain('ENVTARAYICI');
    expect(stdoutLogs.join('')).toContain('USAGE:');
  });

  it('prints version and returns exit code 0 for --version', async () => {
    const code = await runCli(['-v'], mockStdout, mockStderr);

    expect(code).toBe(0);
    expect(stdoutLogs.join('')).toContain('v0.1.0');
  });

  it('returns exit code 2 on invalid arguments', async () => {
    const code = await runCli(['--unknown-flag'], mockStdout, mockStderr);

    expect(code).toBe(2);
    expect(stderrLogs.join('')).toContain('FATAL ERROR');
  });

  it('returns exit code 0 when project analysis passes', async () => {
    await writeFile(join(tempDir, '.env.example'), 'PORT=3000\n');
    await writeFile(join(tempDir, '.env'), 'PORT=3000\n');

    const code = await runCli(['--cwd', tempDir, '--ci'], mockStdout, mockStderr);

    expect(code).toBe(0);
    expect(stdoutLogs.join('')).toContain('Status: PASSED');
  });

  it('returns exit code 1 when project analysis fails (missing variable)', async () => {
    await writeFile(join(tempDir, '.env.example'), 'DATABASE_URL=\n');
    await writeFile(join(tempDir, '.env'), '');

    const code = await runCli(['--cwd', tempDir, '--ci'], mockStdout, mockStderr);

    expect(code).toBe(1);
    expect(stdoutLogs.join('')).toContain('Status: FAILED');
    expect(stdoutLogs.join('')).toContain('DATABASE_URL');
  });

  it('outputs valid JSON when --json flag is used', async () => {
    await writeFile(join(tempDir, '.env.example'), 'PORT=3000\n');
    await writeFile(join(tempDir, '.env'), 'PORT=3000\n');

    const code = await runCli(['--cwd', tempDir, '--json'], mockStdout, mockStderr);

    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutLogs.join(''));
    expect(parsed.status).toBe('PASSED');
    expect(parsed.summary.contractVariablesCount).toBe(1);
  });
});
