import { join } from 'node:path';
import {
  discoverContractFile,
  discoverLocalEnvFiles,
  discoverSourceFiles,
  loadContract,
  loadLocalEnv,
} from './discovery.js';
import { checkGitTrackedEnvFiles } from './git.js';
import { checkAllPublicExposures } from './rules/security.js';
import { scanSourceCode } from './scanner.js';
import { readFile } from 'node:fs/promises';
import {
  AnalysisResult,
  AnalysisSummary,
  CodeReference,
  Finding,
} from './types.js';

/**
 * Runs complete static analysis on a project directory.
 */
export async function analyzeProject(cwd: string = process.cwd()): Promise<AnalysisResult> {
  const findings: Finding[] = [];

  // 1. Discover contract file (.env.example, .env.sample, .env.template)
  const contractFileName = await discoverContractFile(cwd);
  if (!contractFileName) {
    findings.push({
      code: 'MISSING_FROM_LOCAL',
      severity: 'ERROR',
      message: 'No environment contract file (.env.example, .env.sample, .env.template) found in project root.',
      location: { file: '.env.example' },
    });

    return {
      status: 'FAILED',
      findings,
      summary: {
        contractVariablesCount: 0,
        localVariablesCount: 0,
        codeVariablesCount: 0,
        filesScannedCount: 0,
        criticalCount: 0,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
      },
    };
  }

  // 2. Load contract and local environment
  const contract = await loadContract(contractFileName, cwd);
  const localEnvFiles = await discoverLocalEnvFiles(cwd);
  const localEnv = await loadLocalEnv(localEnvFiles, cwd);

  // 3. Check for Git index tracking of local environment files
  const gitFindings = await checkGitTrackedEnvFiles(localEnvFiles, cwd);
  findings.push(...gitFindings);

  // 4. Contract verification: Check for variables in .env.example missing in local env
  for (const [key, entry] of contract.keys) {
    if (!localEnv.keys.has(key)) {
      findings.push({
        code: 'MISSING_FROM_LOCAL',
        severity: 'ERROR',
        variableName: key,
        message: `Variable '${key}' is documented in ${contractFileName} but missing in local environment (${localEnvFiles.join(', ') || 'no local .env'}).`,
        location: { file: contractFileName, line: entry.line },
      });
    }
  }

  // 5. Discover and scan source files
  const sourceFiles = await discoverSourceFiles(cwd);
  const codeReferences: CodeReference[] = [];
  const codeVars = new Set<string>();
  const firstRefMap = new Map<string, CodeReference>();

  for (const relPath of sourceFiles) {
    const fullPath = join(cwd, relPath);
    try {
      const content = await readFile(fullPath, 'utf-8');
      const refs = scanSourceCode(content, relPath);
      for (const ref of refs) {
        codeReferences.push(ref);
        if (ref.isDynamic) {
          findings.push({
            code: 'DYNAMIC_ACCESS',
            severity: 'INFO',
            message: 'Dynamic environment variable access detected. Static analysis cannot verify dynamic property names.',
            location: ref.location,
          });
        } else if (ref.variableName) {
          codeVars.add(ref.variableName);
          if (!firstRefMap.has(ref.variableName)) {
            firstRefMap.set(ref.variableName, ref);
          }
        }
      }
    } catch {
      // Ignore unreadable files
    }
  }

  // 6. Code vs Contract: Undocumented variables in contract
  for (const varName of codeVars) {
    if (!contract.keys.has(varName)) {
      const ref = firstRefMap.get(varName);
      findings.push({
        code: 'UNDOCUMENTED_IN_EXAMPLE',
        severity: 'WARNING',
        variableName: varName,
        message: `Variable '${varName}' is used in source code but missing from ${contractFileName}.`,
        location: ref?.location,
      });
    }
  }

  // 7. Security analysis: Public client exposure on local env and contract
  const allEntries = new Map<string, (typeof contract.keys extends Map<string, infer V> ? V : never)>();
  for (const [k, v] of contract.keys) {
    allEntries.set(k, v);
  }
  for (const [k, v] of localEnv.keys) {
    allEntries.set(k, v);
  }

  const securityFindings = checkAllPublicExposures(allEntries.values());
  findings.push(...securityFindings);

  // 8. Calculate summary metrics
  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const errorCount = findings.filter((f) => f.severity === 'ERROR').length;
  const warningCount = findings.filter((f) => f.severity === 'WARNING').length;
  const infoCount = findings.filter((f) => f.severity === 'INFO').length;

  const status = criticalCount > 0 || errorCount > 0 ? 'FAILED' : 'PASSED';

  const summary: AnalysisSummary = {
    contractVariablesCount: contract.keys.size,
    localVariablesCount: localEnv.keys.size,
    codeVariablesCount: codeVars.size,
    filesScannedCount: sourceFiles.length,
    criticalCount,
    errorCount,
    warningCount,
    infoCount,
  };

  return {
    status,
    findings,
    summary,
  };
}
