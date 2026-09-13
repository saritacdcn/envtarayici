import pc from 'picocolors';
import { AnalysisResult, Finding } from '../core/types.js';

function formatLocation(loc?: { file: string; line?: number }): string {
  if (!loc) return '';
  if (loc.line !== undefined) {
    return `${loc.file}:${loc.line}`;
  }
  return loc.file;
}

/**
 * Formats analysis results into a clean, developer-friendly terminal output.
 * NEVER prints environment variable values.
 */
export function formatTerminalReport(result: AnalysisResult, isCi = false): string {
  const lines: string[] = [];

  const title = isCi ? 'ENV DOCTOR' : pc.bold(pc.cyan('ENV DOCTOR'));
  const divider = pc.dim('─'.repeat(50));

  lines.push('');
  lines.push(title);
  lines.push(divider);

  const criticals = result.findings.filter((f) => f.severity === 'CRITICAL');
  const errors = result.findings.filter((f) => f.severity === 'ERROR');
  const warnings = result.findings.filter((f) => f.severity === 'WARNING');
  const infos = result.findings.filter((f) => f.severity === 'INFO');

  if (criticals.length > 0) {
    lines.push(isCi ? 'CRITICAL:' : pc.bold(pc.red('CRITICAL:')));
    for (const f of criticals) {
      const locStr = formatLocation(f.location);
      const header = f.variableName ? `🔴 ${f.variableName}` : '🔴 Critical Issue';
      const locPart = locStr ? pc.dim(` (${locStr})`) : '';
      lines.push(`  ${isCi ? header : pc.bold(header)}${locPart}`);
      lines.push(`     ${f.message}`);
    }
    lines.push('');
  }

  if (errors.length > 0) {
    lines.push(isCi ? 'ERRORS:' : pc.bold(pc.red('ERRORS:')));
    for (const f of errors) {
      const locStr = formatLocation(f.location);
      const header = f.variableName ? `❌ ${f.variableName}` : '❌ Error';
      const locPart = locStr ? pc.dim(` (${locStr})`) : '';
      lines.push(`  ${isCi ? header : pc.bold(header)}${locPart}`);
      lines.push(`     ${f.message}`);
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push(isCi ? 'WARNINGS:' : pc.bold(pc.yellow('WARNINGS:')));
    for (const f of warnings) {
      const locStr = formatLocation(f.location);
      const header = f.variableName ? `⚠️  ${f.variableName}` : '⚠️  Warning';
      const locPart = locStr ? pc.dim(` (${locStr})`) : '';
      lines.push(`  ${isCi ? header : pc.yellow(header)}${locPart}`);
      lines.push(`     ${f.message}`);
    }
    lines.push('');
  }

  if (infos.length > 0) {
    lines.push(isCi ? 'INFO:' : pc.bold(pc.blue('INFO:')));
    for (const f of infos) {
      const locStr = formatLocation(f.location);
      const locPart = locStr ? pc.dim(` (${locStr})`) : '';
      lines.push(`  ℹ️  ${f.message}${locPart}`);
    }
    lines.push('');
  }

  lines.push(divider);

  const { summary } = result;
  lines.push(
    `Variables documented: ${summary.contractVariablesCount} | Local variables: ${summary.localVariablesCount} | Code variables: ${summary.codeVariablesCount}`
  );
  lines.push(`Files scanned: ${summary.filesScannedCount}`);

  lines.push('');
  if (result.status === 'FAILED') {
    const statusText = `Status: FAILED (${summary.criticalCount} Critical, ${summary.errorCount} Error, ${summary.warningCount} Warning)`;
    lines.push(isCi ? statusText : pc.bold(pc.red(statusText)));
  } else {
    const warningSuffix = summary.warningCount > 0 ? ` with ${summary.warningCount} Warning(s)` : '';
    const statusText = `Status: PASSED${warningSuffix}`;
    lines.push(isCi ? statusText : pc.bold(pc.green(statusText)));
  }
  lines.push('');

  return lines.join('\n');
}
