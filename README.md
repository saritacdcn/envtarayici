# envtarayici 🔍

> Static environment variable and contract linter for Node.js and TypeScript projects.

**envtarayici** audits your environment contracts (`.env.example`), local development files (`.env`, `.env.local`), and source code with zero code changes or external service dependencies.

---

## The Contract Concept

In modern fullstack development, environment configuration operates across three distinct layers:

1. **The Contract (`.env.example`, `.env.sample`, `.env.template`):** The declared baseline defining which variables the application requires to run.
2. **The Local Environment (`.env`, `.env.local`):** The developer's local environment files containing local configuration values.
3. **The Source Code (`src/**/*.{ts,js,tsx,jsx}`):** Where variables are actually consumed at build time or runtime (`process.env.VAR`, `import.meta.env.VAR`).

**envtarayici** verifies that these three layers stay in sync:
- Detects variables defined in the contract but missing from the developer's local environment.
- Detects variables used in source code that were never documented in the contract.
- Catches sensitive secrets accidentally exposed to client-side bundles via public prefixes.
- Flags local environment files that were mistakenly committed to the Git index.

---

## What envtarayici Does & Does Not Do

### Included
- **Contract Verification:** Ensures required template variables exist locally.
- **AST Source Code Scanning:** Identifies static `process.env` and `import.meta.env` references using Babel AST.
- **Client Exposure Heuristics:** Flags unambiguous secret patterns in `NEXT_PUBLIC_*`, `VITE_*`, and other client prefixes.
- **Git Index Tracking Checks:** Identifies whether local `.env` files are tracked in the Git repository index.
- **Terminal & JSON Reporters:** Human-readable formatted summaries and machine-readable JSON for tooling.
- **CI-Friendly Exit Codes:** Standardized exit codes (`0`, `1`, `2`) for CI/CD pipelines and pre-commit hooks.

### Not Included (Out of Scope)
- **No AI / LLM Dependency:** Pure deterministic static analysis running entirely on your machine.
- **No Production / Cloud Resolution:** Does not resolve production environments or connect to secret managers (AWS Secrets Manager, Vault, Doppler, etc.).
- **No Automatic Fixes (`--fix`):** Never modifies, overwrites, or rewrites your source code or `.env` files.
- **No Git History Secret Scanning:** Checks only the current working tree and Git index; does not crawl historical git commits (use dedicated tools like Gitleaks for git history).
- **No Runtime Resolution:** Does not execute your application code or evaluate runtime environment variables.

---

## Quick Start

Run directly in any Node.js / TypeScript project without installation:

```bash
npx envtarayici
```

### Options

```bash
# Plain-text output for CI/CD pipelines
npx envtarayici --ci

# Machine-readable JSON output
npx envtarayici --json

# Analyze a specific directory
npx envtarayici --cwd ./apps/web

# View help or version
npx envtarayici --help
npx envtarayici --version
```

---

## Example Output

```text
ENVTARAYICI
──────────────────────────────────────────────────
CRITICAL:
  🔴 NEXT_PUBLIC_STRIPE_SECRET_KEY (.env.local:12)
     Variable 'NEXT_PUBLIC_STRIPE_SECRET_KEY' uses public client prefix 'NEXT_PUBLIC_' but contains sensitive keyword 'SECRET'. Secrets must never be exposed to client bundles.

ERRORS:
  ❌ DATABASE_URL (.env.example:3)
     Variable 'DATABASE_URL' is documented in .env.example but missing in local environment (.env).

WARNINGS:
  ⚠️  NEW_FEATURE_FLAG (src/api/auth.ts:15)
     Variable 'NEW_FEATURE_FLAG' is used in source code but missing from .env.example.

INFO:
  ℹ️  Dynamic environment variable access detected. Static analysis cannot verify dynamic property names. (src/utils/env.ts:8)
──────────────────────────────────────────────────
Variables documented: 14 | Local variables: 13 | Code variables: 14
Files scanned: 28

Status: FAILED (1 Critical, 1 Error, 1 Warning)
```

---

## Rules & Detection Logic

| Rule Code | Severity | Description |
| :--- | :--- | :--- |
| `PUBLIC_SECRET_EXPOSURE` | **CRITICAL** | Client prefix (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `GATSBY_`, `NUXT_PUBLIC_`, `EXPO_PUBLIC_`) combined with unambiguous secret terms (`SECRET`, `PASSWORD`, `PRIVATE`, `DATABASE_URL`, `SERVICE_ROLE_KEY`, `CREDENTIALS`, etc.). |
| `GIT_TRACKED` | **CRITICAL** | Local `.env` or `.env.local` files are actively tracked in the Git repository index. |
| `MISSING_FROM_LOCAL` | **ERROR** | A required variable defined in the contract (`.env.example`, `.env.sample`, or `.env.template`) is missing from local `.env` and `.env.local`. |
| `UNDOCUMENTED_IN_EXAMPLE` | **WARNING** | A statically referenced variable in source code is not documented in `.env.example`. |
| `POTENTIAL_EXPOSURE` | **WARNING** | A public variable uses ambiguous keywords (`KEY`, `TOKEN`, `AUTH`) without an explicit allowlist pattern. |
| `DYNAMIC_ACCESS` | **INFO** | Computed property access such as `process.env[dynamicKey]` that cannot be statically verified. |

### Public Token Allowlist

Legitimate client-side tokens (e.g., `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN`, `*_CLIENT_ID`) are allowlisted and do not trigger false-positive warnings.

---

## Security Model: Metadata-Only Analysis

Environment values are not retained, stored, logged, or included in findings or reports:
1. **Values Discarded:** During line extraction, variable values are discarded immediately after determining presence (`hasValue`).
2. **Never Emitted:** Plaintext secrets never enter data structures (`KeyEntry`, `Finding`, `AnalysisResult`) and are never printed to terminal reports, error messages, logs, or JSON outputs.

---

## CI / CD Integration & Exit Codes

Add **envtarayici** to your GitHub Actions or pre-commit workflow:

```yaml
# .github/workflows/envtarayici.yml
name: Environment Contract Audit

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx envtarayici --ci
```

### Exit Codes

- `0`: **PASSED** — All required contract variables are present and no critical security issues were detected. (Warnings and Info do not fail the build).
- `1`: **FAILED** — One or more `CRITICAL` security violations or `ERROR` missing contract variables were found.
- `2`: **FATAL** — Runtime execution error (e.g. invalid arguments or file permission issues).

---

## Known Limitations

1. **Aliased Environment Access:** Indirect references such as `const env = process.env; env.FOO` are not traced to keep AST scanning fast and free of heavy scope-analysis dependencies.
2. **Single-File Duplicate Keys:** If a single `.env` file defines the same key multiple times, the last entry's line number is preserved without emitting a duplicate diagnostic.
3. **Performance:** Analysis duration is determined by project size, file count, and disk I/O performance.

---

## License

[MIT](LICENSE)
