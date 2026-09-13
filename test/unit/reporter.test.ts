import { describe, it, expect } from 'vitest';
import { formatTerminalReport } from '../../src/reporters/terminal.js';
import { formatJsonReport } from '../../src/reporters/json.js';
import { AnalysisResult } from '../../src/core/types.js';

describe('reporters', () => {
  const mockFailedResult: AnalysisResult = {
    status: 'FAILED',
    findings: [
      {
        code: 'PUBLIC_SECRET_EXPOSURE',
        severity: 'CRITICAL',
        variableName: 'NEXT_PUBLIC_SECRET_KEY',
        message: 'Secret key leaked in client bundle',
        location: { file: '.env.local', line: 12 },
      },
      {
        code: 'MISSING_FROM_LOCAL',
        severity: 'ERROR',
        variableName: 'DATABASE_URL',
        message: 'Missing in local environment',
        location: { file: '.env.example', line: 3 },
      },
      {
        code: 'UNDOCUMENTED_IN_EXAMPLE',
        severity: 'WARNING',
        variableName: 'SENTRY_DSN',
        message: 'Used in code but not documented',
        location: { file: 'src/index.ts', line: 15 },
      },
      {
        code: 'DYNAMIC_ACCESS',
        severity: 'INFO',
        message: 'Dynamic access found',
        location: { file: 'src/dynamic.ts', line: 5 },
      },
    ],
    summary: {
      contractVariablesCount: 2,
      localVariablesCount: 1,
      codeVariablesCount: 2,
      filesScannedCount: 4,
      criticalCount: 1,
      errorCount: 1,
      warningCount: 1,
      infoCount: 1,
    },
  };

  const mockPassedResult: AnalysisResult = {
    status: 'PASSED',
    findings: [],
    summary: {
      contractVariablesCount: 2,
      localVariablesCount: 2,
      codeVariablesCount: 2,
      filesScannedCount: 3,
      criticalCount: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
    },
  };

  it('formats terminal output with correct sections and failed status', () => {
    const output = formatTerminalReport(mockFailedResult, true);

    expect(output).toContain('ENV DOCTOR');
    expect(output).toContain('CRITICAL:');
    expect(output).toContain('NEXT_PUBLIC_SECRET_KEY');
    expect(output).toContain('ERRORS:');
    expect(output).toContain('DATABASE_URL');
    expect(output).toContain('WARNINGS:');
    expect(output).toContain('SENTRY_DSN');
    expect(output).toContain('INFO:');
    expect(output).toContain('Status: FAILED (1 Critical, 1 Error, 1 Warning)');
  });

  it('formats terminal output for passed status', () => {
    const output = formatTerminalReport(mockPassedResult, true);

    expect(output).toContain('ENV DOCTOR');
    expect(output).toContain('Status: PASSED');
    expect(output).not.toContain('CRITICAL:');
    expect(output).not.toContain('ERRORS:');
  });

  it('formats JSON report as valid, parsable JSON structure', () => {
    const jsonStr = formatJsonReport(mockFailedResult);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.status).toBe('FAILED');
    expect(parsed.findings).toHaveLength(4);
    expect(parsed.summary.criticalCount).toBe(1);
  });
});
