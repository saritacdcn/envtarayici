export type Severity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';

export type FindingCode =
  | 'PUBLIC_SECRET_EXPOSURE'   // CRITICAL: Client prefix with unambiguous secret keywords (SECRET, PASSWORD, etc.)
  | 'POTENTIAL_EXPOSURE'       // WARNING: Client prefix with ambiguous keywords (KEY, TOKEN, etc.)
  | 'GIT_TRACKED'              // CRITICAL: .env / .env.local tracked in git index
  | 'MISSING_FROM_LOCAL'       // ERROR: Defined in contract (.env.example) but absent in local env files
  | 'UNDOCUMENTED_IN_EXAMPLE'  // WARNING: Referenced in source code but missing from contract (.env.example)
  | 'DYNAMIC_ACCESS';          // INFO: process.env[dynamicKey] dynamic access cannot be statically verified

export interface FileLocation {
  file: string;
  line?: number;
}

export interface Finding {
  code: FindingCode;
  severity: Severity;
  variableName?: string;
  message: string;
  location?: FileLocation;
}

/**
 * Represents metadata of an environment variable key.
 * NOTE: Environment variable values are NOT stored here to prevent secret exposure.
 */
export interface KeyEntry {
  key: string;
  line: number;
  sourceFile: string;
  hasValue: boolean;
}

export interface EnvContract {
  contractFile: string;
  keys: Map<string, KeyEntry>;
}

export interface LocalEnv {
  loadedFiles: string[];
  keys: Map<string, KeyEntry>;
}

export interface CodeReference {
  variableName?: string;
  isDynamic: boolean;
  location: FileLocation;
}

export interface AnalysisSummary {
  contractVariablesCount: number;
  localVariablesCount: number;
  codeVariablesCount: number;
  filesScannedCount: number;
  criticalCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface AnalysisResult {
  status: 'PASSED' | 'FAILED';
  findings: Finding[];
  summary: AnalysisSummary;
}

export interface CliOptions {
  ci?: boolean;
  json?: boolean;
  cwd?: string;
}
