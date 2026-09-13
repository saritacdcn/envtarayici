import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  discoverContractFile,
  discoverLocalEnvFiles,
  loadContract,
  loadLocalEnv,
  discoverSourceFiles,
} from '../../src/core/discovery.js';

describe('discovery', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'env-doctor-discovery-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('discovers contract file following priority: .env.example > .env.sample > .env.template', async () => {
    expect(await discoverContractFile(tempDir)).toBeNull();

    await writeFile(join(tempDir, '.env.template'), 'FOO=bar');
    expect(await discoverContractFile(tempDir)).toBe('.env.template');

    await writeFile(join(tempDir, '.env.sample'), 'FOO=bar');
    expect(await discoverContractFile(tempDir)).toBe('.env.sample');

    await writeFile(join(tempDir, '.env.example'), 'FOO=bar');
    expect(await discoverContractFile(tempDir)).toBe('.env.example');
  });

  it('discovers local env files (.env, .env.local)', async () => {
    expect(await discoverLocalEnvFiles(tempDir)).toEqual([]);

    await writeFile(join(tempDir, '.env'), 'VAR_A=1');
    expect(await discoverLocalEnvFiles(tempDir)).toEqual(['.env']);

    await writeFile(join(tempDir, '.env.local'), 'VAR_B=2');
    expect(await discoverLocalEnvFiles(tempDir)).toEqual(['.env', '.env.local']);
  });

  it('loads contract and local env with merged keys', async () => {
    await writeFile(join(tempDir, '.env.example'), 'PORT=3000\nDATABASE_URL=\n');
    await writeFile(join(tempDir, '.env'), 'PORT=3000\n');
    await writeFile(join(tempDir, '.env.local'), 'DATABASE_URL=postgres://...\n');

    const contract = await loadContract('.env.example', tempDir);
    expect(contract.keys.size).toBe(2);
    expect(contract.keys.has('PORT')).toBe(true);
    expect(contract.keys.has('DATABASE_URL')).toBe(true);

    const localEnv = await loadLocalEnv(['.env', '.env.local'], tempDir);
    expect(localEnv.keys.size).toBe(2);
    expect(localEnv.keys.has('PORT')).toBe(true);
    expect(localEnv.keys.has('DATABASE_URL')).toBe(true);
    expect(localEnv.loadedFiles).toEqual(['.env', '.env.local']);
  });

  it('discovers JS/TS source files while ignoring node_modules, dist, and markdown files', async () => {
    await mkdir(join(tempDir, 'src'), { recursive: true });
    await mkdir(join(tempDir, 'node_modules', 'some-pkg'), { recursive: true });
    await mkdir(join(tempDir, 'dist'), { recursive: true });

    await writeFile(join(tempDir, 'src', 'index.ts'), 'console.log(1);');
    await writeFile(join(tempDir, 'src', 'App.tsx'), 'export const App = () => null;');
    await writeFile(join(tempDir, 'README.md'), '# Docs');
    await writeFile(join(tempDir, 'package.json'), '{}');
    await writeFile(join(tempDir, 'dist', 'bundle.js'), 'code');
    await writeFile(join(tempDir, 'node_modules', 'some-pkg', 'index.js'), 'code');

    const files = await discoverSourceFiles(tempDir);

    expect(files).toContain('src/index.ts');
    expect(files).toContain('src/App.tsx');
    expect(files.some((f) => f.endsWith('.md'))).toBe(false);
    expect(files.some((f) => f.endsWith('.json'))).toBe(false);
    expect(files.some((f) => f.includes('node_modules'))).toBe(false);
    expect(files.some((f) => f.includes('dist'))).toBe(false);
  });
});
