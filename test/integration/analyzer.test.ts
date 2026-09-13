import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeProject } from '../../src/core/analyzer.js';

describe('analyzer integration', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'env-doctor-project-'));
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it('fails when no contract file (.env.example) exists in the project', async () => {
    const result = await analyzeProject(projectDir);

    expect(result.status).toBe('FAILED');
    expect(result.summary.errorCount).toBe(1);
    expect(result.findings[0].code).toBe('MISSING_FROM_LOCAL');
    expect(result.findings[0].message).toContain('No environment contract file');
  });

  it('passes on a clean project where contract, local env, and code references match', async () => {
    await writeFile(join(projectDir, '.env.example'), 'PORT=3000\nDATABASE_URL=\n');
    await writeFile(join(projectDir, '.env'), 'PORT=3000\nDATABASE_URL=postgres://localhost:5432\n');
    await mkdir(join(projectDir, 'src'), { recursive: true });
    await writeFile(
      join(projectDir, 'src', 'index.ts'),
      'const port = process.env.PORT;\nconst db = process.env.DATABASE_URL;\n'
    );

    const result = await analyzeProject(projectDir);

    expect(result.status).toBe('PASSED');
    expect(result.findings).toHaveLength(0);
    expect(result.summary.contractVariablesCount).toBe(2);
    expect(result.summary.localVariablesCount).toBe(2);
    expect(result.summary.codeVariablesCount).toBe(2);
    expect(result.summary.criticalCount).toBe(0);
    expect(result.summary.errorCount).toBe(0);
  });

  it('flags missing local environment variables as ERROR and sets status to FAILED', async () => {
    await writeFile(join(projectDir, '.env.example'), 'PORT=3000\nREDIS_URL=\n');
    await writeFile(join(projectDir, '.env'), 'PORT=3000\n'); // REDIS_URL missing

    const result = await analyzeProject(projectDir);

    expect(result.status).toBe('FAILED');
    expect(result.summary.errorCount).toBe(1);
    const missingFinding = result.findings.find((f) => f.code === 'MISSING_FROM_LOCAL');
    expect(missingFinding).toBeDefined();
    expect(missingFinding?.variableName).toBe('REDIS_URL');
    expect(missingFinding?.severity).toBe('ERROR');
  });

  it('resolves variable presence by merging .env and .env.local', async () => {
    await writeFile(join(projectDir, '.env.example'), 'PORT=3000\nSECRET_KEY=\n');
    await writeFile(join(projectDir, '.env'), 'PORT=3000\n');
    await writeFile(join(projectDir, '.env.local'), 'SECRET_KEY=local_val\n');

    const result = await analyzeProject(projectDir);

    expect(result.status).toBe('PASSED');
    expect(result.summary.errorCount).toBe(0);
  });

  it('flags undocumented variables in code as WARNING without failing status', async () => {
    await writeFile(join(projectDir, '.env.example'), 'PORT=3000\n');
    await writeFile(join(projectDir, '.env'), 'PORT=3000\n');
    await mkdir(join(projectDir, 'src'), { recursive: true });
    await writeFile(
      join(projectDir, 'src', 'api.ts'),
      'const port = process.env.PORT;\nconst token = process.env.UNDOCUMENTED_FEATURE_FLAG;\n'
    );

    const result = await analyzeProject(projectDir);

    expect(result.status).toBe('PASSED');
    expect(result.summary.warningCount).toBe(1);
    const undoc = result.findings.find((f) => f.code === 'UNDOCUMENTED_IN_EXAMPLE');
    expect(undoc).toBeDefined();
    expect(undoc?.variableName).toBe('UNDOCUMENTED_FEATURE_FLAG');
    expect(undoc?.severity).toBe('WARNING');
  });

  it('flags public secret exposure as CRITICAL and sets status to FAILED', async () => {
    await writeFile(join(projectDir, '.env.example'), 'NEXT_PUBLIC_STRIPE_SECRET_KEY=\n');
    await writeFile(join(projectDir, '.env'), 'NEXT_PUBLIC_STRIPE_SECRET_KEY=val\n');

    const result = await analyzeProject(projectDir);

    expect(result.status).toBe('FAILED');
    expect(result.summary.criticalCount).toBe(1);
    const critical = result.findings.find((f) => f.code === 'PUBLIC_SECRET_EXPOSURE');
    expect(critical).toBeDefined();
    expect(critical?.severity).toBe('CRITICAL');
  });

  it('flags ambiguous public token as WARNING', async () => {
    await writeFile(join(projectDir, '.env.example'), 'NEXT_PUBLIC_MAPBOX_TOKEN=\n');
    await writeFile(join(projectDir, '.env'), 'NEXT_PUBLIC_MAPBOX_TOKEN=val\n');

    const result = await analyzeProject(projectDir);

    expect(result.status).toBe('PASSED');
    const warning = result.findings.find((f) => f.code === 'POTENTIAL_EXPOSURE');
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe('WARNING');
  });

  it('does not flag allowlisted public keys', async () => {
    await writeFile(join(projectDir, '.env.example'), 'NEXT_PUBLIC_SUPABASE_ANON_KEY=\n');
    await writeFile(join(projectDir, '.env'), 'NEXT_PUBLIC_SUPABASE_ANON_KEY=val\n');

    const result = await analyzeProject(projectDir);

    expect(result.status).toBe('PASSED');
    expect(result.summary.criticalCount).toBe(0);
    expect(result.summary.warningCount).toBe(0);
  });

  it('reports dynamic access as INFO without failing status', async () => {
    await writeFile(join(projectDir, '.env.example'), 'PORT=3000\n');
    await writeFile(join(projectDir, '.env'), 'PORT=3000\n');
    await mkdir(join(projectDir, 'src'), { recursive: true });
    await writeFile(
      join(projectDir, 'src', 'dynamic.ts'),
      'const k = "PORT"; const val = process.env[k];\n'
    );

    const result = await analyzeProject(projectDir);

    expect(result.status).toBe('PASSED');
    expect(result.summary.infoCount).toBe(1);
    const dynamicFinding = result.findings.find((f) => f.code === 'DYNAMIC_ACCESS');
    expect(dynamicFinding).toBeDefined();
    expect(dynamicFinding?.severity).toBe('INFO');
  });

  it('guarantees that NO secret values exist in findings or result objects', async () => {
    const sensitiveValue = 'super_secret_password_12345';
    await writeFile(join(projectDir, '.env.example'), 'DB_PASS=\n');
    await writeFile(join(projectDir, '.env'), `DB_PASS=${sensitiveValue}\n`);

    const result = await analyzeProject(projectDir);

    const jsonString = JSON.stringify(result);
    expect(jsonString.includes(sensitiveValue)).toBe(false);
  });
});
