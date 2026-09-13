import { access, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { glob } from 'tinyglobby';
import { extractEnvKeys } from './extractor.js';
import { EnvContract, KeyEntry, LocalEnv } from './types.js';

const CONTRACT_CANDIDATES = ['.env.example', '.env.sample', '.env.template'];
const LOCAL_ENV_CANDIDATES = ['.env', '.env.local'];

const SOURCE_PATTERNS = ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'];
const IGNORED_DIRS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/out/**',
  '**/.git/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/.nuxt/**',
  '**/.svelte-kit/**',
];

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Finds the contract template file (.env.example, .env.sample, .env.template) in priority order.
 */
export async function discoverContractFile(cwd: string): Promise<string | null> {
  for (const candidate of CONTRACT_CANDIDATES) {
    const fullPath = join(cwd, candidate);
    if (await fileExists(fullPath)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Finds local development environment files (.env, .env.local) if they exist.
 */
export async function discoverLocalEnvFiles(cwd: string): Promise<string[]> {
  const existingFiles: string[] = [];
  for (const candidate of LOCAL_ENV_CANDIDATES) {
    const fullPath = join(cwd, candidate);
    if (await fileExists(fullPath)) {
      existingFiles.push(candidate);
    }
  }
  return existingFiles;
}

/**
 * Loads and extracts keys from the contract file.
 */
export async function loadContract(contractFile: string, cwd: string): Promise<EnvContract> {
  const fullPath = join(cwd, contractFile);
  const content = await readFile(fullPath, 'utf-8');
  const keys = extractEnvKeys(content, contractFile);

  return {
    contractFile,
    keys,
  };
}

/**
 * Loads and merges local environment files (.env and .env.local).
 * NOTE: Used solely to verify variable presence in the local environment.
 * Does not resolve runtime precedence.
 */
export async function loadLocalEnv(envFiles: string[], cwd: string): Promise<LocalEnv> {
  const mergedKeys = new Map<string, KeyEntry>();

  for (const file of envFiles) {
    const fullPath = join(cwd, file);
    try {
      const content = await readFile(fullPath, 'utf-8');
      const fileKeys = extractEnvKeys(content, file);
      for (const [key, entry] of fileKeys) {
        mergedKeys.set(key, entry);
      }
    } catch {
      // Ignore if cannot read file
    }
  }

  return {
    loadedFiles: envFiles,
    keys: mergedKeys,
  };
}

/**
 * Discovers JS/TS source files in the project, strictly ignoring build directories, node_modules,
 * and non-source files (e.g. .md, .txt, .json).
 */
export async function discoverSourceFiles(cwd: string): Promise<string[]> {
  const files = await glob(SOURCE_PATTERNS, {
    cwd,
    ignore: IGNORED_DIRS,
    dot: false,
  });

  return files.map((file) => relative(cwd, join(cwd, file)).replace(/\\/g, '/'));
}
