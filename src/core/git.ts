import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Finding } from './types.js';

const execFileAsync = promisify(execFile);

/**
 * Checks whether any of the specified local environment files are currently
 * tracked by the Git repository index.
 * Gracefully handles non-git repositories or environments without git.
 */
export async function checkGitTrackedEnvFiles(files: string[], cwd: string): Promise<Finding[]> {
  if (files.length === 0) {
    return [];
  }

  try {
    const { stdout } = await execFileAsync('git', ['ls-files', ...files], {
      cwd,
      encoding: 'utf-8',
    });

    const trackedFiles = stdout
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const findings: Finding[] = [];

    for (const trackedFile of trackedFiles) {
      findings.push({
        code: 'GIT_TRACKED',
        severity: 'CRITICAL',
        message: `${trackedFile} is tracked in the Git index. Sensitive local environment files must not be committed to Git.`,
        location: { file: trackedFile },
      });
    }

    return findings;
  } catch {
    // Gracefully ignore git errors (e.g., git not installed or not a git repo)
    return [];
  }
}
