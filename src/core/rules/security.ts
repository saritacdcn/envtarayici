import { Finding, KeyEntry } from '../types.js';

const CLIENT_PREFIXES = [
  'NEXT_PUBLIC_',
  'VITE_',
  'PUBLIC_',
  'GATSBY_',
  'NUXT_PUBLIC_',
  'EXPO_PUBLIC_',
];

// Unambiguous secret keywords that should NEVER be exposed to the client bundle
const UNAMBIGUOUS_SECRET_KEYWORDS = [
  'SECRET',
  'PASSWORD',
  'PRIVATE_KEY',
  'PRIVATE',
  'DATABASE_URL',
  'SERVICE_ROLE_KEY',
  'CREDENTIALS',
  'SIGNING_KEY',
  'AUTH_SECRET',
  'ENCRYPTION_KEY',
  'MASTER_KEY',
];

// Ambiguous keywords commonly used for both public identifiers and sensitive tokens
const AMBIGUOUS_KEYWORDS = ['KEY', 'TOKEN', 'AUTH'];

// Known legitimate public patterns that should not generate warnings or errors
const ALLOWLIST_SUBSTRINGS = [
  'ANON_KEY',
  'PUBLISHABLE_KEY',
  'PUBLIC_KEY',
  'PUBLIC_TOKEN',
  'CLIENT_ID',
];

/**
 * Evaluates whether a variable key violates client-side exposure conventions.
 * Employs tiered severity:
 * - CRITICAL for unambiguous secret keywords
 * - WARNING for ambiguous keywords (e.g. KEY, TOKEN)
 * - Safe/ignored for allowlisted public patterns (e.g. ANON_KEY, PUBLISHABLE_KEY)
 */
export function checkPublicExposure(entry: KeyEntry): Finding | null {
  const upperKey = entry.key.toUpperCase();

  const matchedPrefix = CLIENT_PREFIXES.find((prefix) => upperKey.startsWith(prefix));
  if (!matchedPrefix) {
    return null;
  }

  // Remove the prefix to analyze the meaningful variable name
  const nameWithoutPrefix = upperKey.slice(matchedPrefix.length);

  // 1. Check Allowlist: if variable clearly represents a legitimate public token, do not flag
  const isAllowlisted = ALLOWLIST_SUBSTRINGS.some((allowed) =>
    nameWithoutPrefix.includes(allowed)
  );
  if (isAllowlisted) {
    return null;
  }

  // 2. Check Unambiguous Secret Keywords -> CRITICAL
  const matchedSecret = UNAMBIGUOUS_SECRET_KEYWORDS.find((keyword) =>
    nameWithoutPrefix.includes(keyword)
  );
  if (matchedSecret) {
    return {
      code: 'PUBLIC_SECRET_EXPOSURE',
      severity: 'CRITICAL',
      variableName: entry.key,
      message: `Variable '${entry.key}' uses public client prefix '${matchedPrefix}' but contains sensitive keyword '${matchedSecret}'. Secrets must never be exposed to client bundles.`,
      location: { file: entry.sourceFile, line: entry.line },
    };
  }

  // 3. Check Ambiguous Keywords -> WARNING
  const matchedAmbiguous = AMBIGUOUS_KEYWORDS.find((keyword) =>
    nameWithoutPrefix.includes(keyword)
  );
  if (matchedAmbiguous) {
    return {
      code: 'POTENTIAL_EXPOSURE',
      severity: 'WARNING',
      variableName: entry.key,
      message: `Variable '${entry.key}' uses public client prefix '${matchedPrefix}' with identifier '${matchedAmbiguous}'. Review whether this token is intended to be publicly exposed to the browser.`,
      location: { file: entry.sourceFile, line: entry.line },
    };
  }

  return null;
}

/**
 * Checks a collection of environment variable entries for public exposure risks.
 */
export function checkAllPublicExposures(entries: Iterable<KeyEntry>): Finding[] {
  const findings: Finding[] = [];
  for (const entry of entries) {
    const finding = checkPublicExposure(entry);
    if (finding) {
      findings.push(finding);
    }
  }
  return findings;
}
