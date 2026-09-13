# ENV Doctor 🩺

> Static environment variable and contract linter for Node.js and TypeScript projects.

**ENV Doctor** audits your environment contracts (`.env.example`), local configuration (`.env`, `.env.local`), and source code in under a second—with zero code changes and zero secret value exposure.

---

## Why ENV Doctor?

- **Prevent Onboarding Friction:** Ensures all required environment variables documented in `.env.example` are present in developers' local setups.
- **Stop Secret Leaks to Client Bundles:** Detects dangerous patterns where secrets (e.g. `STRIPE_SECRET_KEY`, `DATABASE_URL`) are inadvertently prefixed with client-exposed tags like `NEXT_PUBLIC_` or `VITE_`.
- **Catch Contract Drift:** Identifies new `process.env` or `import.meta.env` references introduced into source code that were not added to `.env.example`.
- **Catch Git Tracking Violations:** Flags whether sensitive `.env` files were accidentally committed to the Git index.

---

## Quick Start

Run instantly in any Node.js / TypeScript project without installing:

```bash
npx env-doctor
```

### Options

```bash
# Plain-text output for CI pipelines
npx env-doctor --ci

# Machine-readable JSON output
npx env-doctor --json

# Specify a custom directory
npx env-doctor --cwd ./apps/web

# View help or version
npx env-doctor --help
npx env-doctor --version
```

---

## Example Output

```text
ENV DOCTOR
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
| `MISSING_FROM_LOCAL` | **ERROR** | A required variable defined in the contract (`.env.example`, `.env.sample`, or `.env.template`) is missing from `.env` and `.env.local`. |
| `UNDOCUMENTED_IN_EXAMPLE` | **WARNING** | A statically referenced variable in source code is not documented in `.env.example`. |
| `POTENTIAL_EXPOSURE` | **WARNING** | A public variable uses ambiguous keywords (`KEY`, `TOKEN`, `AUTH`) without an explicit allowlist pattern. |
| `DYNAMIC_ACCESS` | **INFO** | Computed property access such as `process.env[dynamicKey]` that cannot be statically verified. |

### Public Token Allowlist

Legitimate client-side tokens (e.g., `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN`, `*_CLIENT_ID`) are allowlisted and do not trigger false-positive warnings.

---

## Security Model: Metadata-Only Analysis

ENV Doctor adheres to a strict zero-retention policy regarding environment values:
1. **Values Discarded:** The parser extracts only variable names (`KEY`), line numbers, and file paths. Values are discarded immediately.
2. **Never Stored or Printed:** Plaintext secrets never enter data structures (`KeyEntry`, `Finding`, `AnalysisResult`) and are never written to stdout, stderr, logs, or JSON outputs.

---

## CI / CD Integration & Exit Codes

Add ENV Doctor as a step in your GitHub Actions or pre-commit workflow:

```yaml
# .github/workflows/env-doctor.yml
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
      - run: npx env-doctor --ci
```

### Exit Codes

- `0`: **PASSED** — All required variables are present and no critical security issues were detected. (Warnings/Info do not fail the build).
- `1`: **FAILED** — One or more `CRITICAL` security violations or `ERROR` missing contract variables were found.
- `2`: **FATAL** — Runtime execution error (e.g. invalid arguments or file permission issues).

---

## License

[MIT](LICENSE)
