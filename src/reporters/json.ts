import { AnalysisResult } from '../core/types.js';

/**
 * Formats analysis results as formatted JSON for machine consumption or CI piping.
 * Guarantees zero secret values are exposed.
 */
export function formatJsonReport(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}
