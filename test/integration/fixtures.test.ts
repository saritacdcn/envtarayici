import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve, join } from 'node:path';
import { mkdtemp, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { analyzeProject } from '../../src/core/analyzer.js';

describe('fixture projects integration', () => {
  const fixturesRoot = resolve(__dirname, '../fixtures');
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'env-doctor-fixture-run-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function prepareFixture(fixtureName: string): Promise<string> {
    const srcDir = resolve(fixturesRoot, fixtureName);
    const targetDir = join(tempDir, fixtureName);
    await cp(srcDir, targetDir, { recursive: true });
    return targetDir;
  }

  it('01-clean-project: passes cleanly with 0 findings', async () => {
    const cwd = await prepareFixture('01-clean-project');
    const result = await analyzeProject(cwd);

    expect(result.status).toBe('PASSED');
    expect(result.findings).toHaveLength(0);
    expect(result.summary.contractVariablesCount).toBe(2);
    expect(result.summary.localVariablesCount).toBe(2);
  });

  it('02-missing-vars: detects missing REDIS_URL and fails with ERROR', async () => {
    const cwd = await prepareFixture('02-missing-vars');
    const result = await analyzeProject(cwd);

    expect(result.status).toBe('FAILED');
    expect(result.summary.errorCount).toBe(1);
    const missing = result.findings.find((f) => f.variableName === 'REDIS_URL');
    expect(missing).toBeDefined();
    expect(missing?.code).toBe('MISSING_FROM_LOCAL');
    expect(missing?.severity).toBe('ERROR');
  });

  it('03-undocumented-vars: detects undocumented code variable with WARNING and passes', async () => {
    const cwd = await prepareFixture('03-undocumented-vars');
    const result = await analyzeProject(cwd);

    expect(result.status).toBe('PASSED');
    expect(result.summary.warningCount).toBe(1);
    const undoc = result.findings.find((f) => f.variableName === 'NEW_UNDOCUMENTED_FLAG');
    expect(undoc).toBeDefined();
    expect(undoc?.code).toBe('UNDOCUMENTED_IN_EXAMPLE');
    expect(undoc?.severity).toBe('WARNING');
  });

  it('04-public-leak: detects client bundle secret leak and fails with CRITICAL', async () => {
    const cwd = await prepareFixture('04-public-leak');
    const result = await analyzeProject(cwd);

    expect(result.status).toBe('FAILED');
    expect(result.summary.criticalCount).toBe(1);
    const leak = result.findings.find((f) => f.variableName === 'NEXT_PUBLIC_STRIPE_SECRET_KEY');
    expect(leak).toBeDefined();
    expect(leak?.code).toBe('PUBLIC_SECRET_EXPOSURE');
    expect(leak?.severity).toBe('CRITICAL');
  });

  it('05-edge-cases: accurately handles comments, string literals, destructuring, and dynamic access', async () => {
    const cwd = await prepareFixture('05-edge-cases');
    const result = await analyzeProject(cwd);

    expect(result.status).toBe('PASSED');

    // Destructuring and bracket access detected
    expect(result.summary.codeVariablesCount).toBe(3);

    // Commented and string literal keys MUST NOT be reported as undocumented or recognized
    const varNamesInFindings = result.findings.map((f) => f.variableName).filter(Boolean);
    expect(varNamesInFindings).not.toContain('COMMENTED_KEY');
    expect(varNamesInFindings).not.toContain('BLOCK_COMMENTED_KEY');
    expect(varNamesInFindings).not.toContain('STRING_LITERAL_KEY');

    // Dynamic access is identified as INFO
    const dynamicFinding = result.findings.find((f) => f.code === 'DYNAMIC_ACCESS');
    expect(dynamicFinding).toBeDefined();
    expect(dynamicFinding?.severity).toBe('INFO');
  });

  it('06-whitelist-project: treats allowed public tokens as legitimate and passes', async () => {
    const cwd = await prepareFixture('06-whitelist-project');
    const result = await analyzeProject(cwd);

    expect(result.status).toBe('PASSED');
    expect(result.findings).toHaveLength(0);
    expect(result.summary.criticalCount).toBe(0);
    expect(result.summary.warningCount).toBe(0);
  });
});
