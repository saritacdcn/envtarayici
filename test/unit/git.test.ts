import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { checkGitTrackedEnvFiles } from '../../src/core/git.js';

const execFileAsync = promisify(execFile);

describe('checkGitTrackedEnvFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'envtarayici-git-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns empty findings in a non-git directory without throwing', async () => {
    await writeFile(join(tempDir, '.env'), 'SECRET=123');
    const findings = await checkGitTrackedEnvFiles(['.env'], tempDir);
    expect(findings).toEqual([]);
  });

  it('returns empty findings when .env is untracked in a git repo', async () => {
    await execFileAsync('git', ['init'], { cwd: tempDir });
    await writeFile(join(tempDir, '.env'), 'SECRET=123');

    const findings = await checkGitTrackedEnvFiles(['.env'], tempDir);
    expect(findings).toEqual([]);
  });

  it('detects tracked .env file and produces CRITICAL finding', async () => {
    await execFileAsync('git', ['init'], { cwd: tempDir });
    await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd: tempDir });
    await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempDir });

    await writeFile(join(tempDir, '.env'), 'SECRET=123');
    await execFileAsync('git', ['add', '.env'], { cwd: tempDir });

    const findings = await checkGitTrackedEnvFiles(['.env'], tempDir);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toEqual({
      code: 'GIT_TRACKED',
      severity: 'CRITICAL',
      message: '.env is tracked in the Git index. Sensitive local environment files must not be committed to Git.',
      location: { file: '.env' },
    });
  });
});
