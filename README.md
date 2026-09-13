# envtarayici

[English](README.md) | [Türkçe](README.tr.md) | [Español](README.es.md) | [简体中文](README.zh-CN.md)

Static environment variable & contract linter for Node.js / TypeScript.

```bash
npx envtarayici
```

Catch environment variable drift between your `.env.example`, local environment, and source code before it becomes a runtime problem.

---

## What Does It Catch?

Environment variables in fullstack applications easily drift across three locations: your example contract (`.env.example`), your developer files (`.env`, `.env.local`), and your actual code (`src/`).

Here are the three most common problems **envtarayici** detects:

### 1. Code → Contract (Missing Documentation)

A developer adds a variable in source code:

```typescript
// src/db.ts
const dbUrl = process.env.DATABASE_URL;
```

...but forgets to document it in `.env.example`. Other developers may not know that the code expects this variable.

**envtarayici flags this:**
```text
WARNINGS:
  ⚠️  DATABASE_URL (src/db.ts:2)
     Variable 'DATABASE_URL' is used in source code but missing from .env.example.
```

### 2. Contract → Local (Missing Local Variable)

A teammate adds a new required variable to `.env.example`:

```text
DATABASE_URL=postgresql://localhost:5432/mydb
```

...but your local `.env` or `.env.local` was never updated.

**envtarayici flags this:**
```text
ERRORS:
  ❌ DATABASE_URL (.env.example:1)
     Variable 'DATABASE_URL' is documented in .env.example but missing in local environment (.env).
```

### 3. Public Secret Exposure

A secret key is accidentally prefixed with a client-side bundle prefix (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, etc.):

```text
# .env.local
NEXT_PUBLIC_DATABASE_PASSWORD=supersecret
```

Frameworks can expose variables with public client prefixes to client-side bundles.

**envtarayici flags this:**
```text
CRITICAL:
  🔴 NEXT_PUBLIC_DATABASE_PASSWORD (.env.local:1)
     Variable 'NEXT_PUBLIC_DATABASE_PASSWORD' uses public client prefix 'NEXT_PUBLIC_' but contains sensitive keyword 'PASSWORD'. Secrets must never be exposed to client bundles.
```

---

## What It Checks

- **Contract Verification (`MISSING_FROM_LOCAL` / ERROR):** Variables declared in `.env.example` (or `.env.sample`, `.env.template`) that are missing from local `.env` and `.env.local`.
- **Source Code Coverage (`UNDOCUMENTED_IN_EXAMPLE` / WARNING):** Environment variables statically referenced in source code that are missing from `.env.example`.
- **Public Secret Exposure (`PUBLIC_SECRET_EXPOSURE` / CRITICAL):** Client prefixes (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `GATSBY_`, `NUXT_PUBLIC_`, `EXPO_PUBLIC_`) combined with unambiguous secret terms (`SECRET`, `PASSWORD`, `PRIVATE`, `DATABASE_URL`, `SERVICE_ROLE_KEY`, `CREDENTIALS`, etc.).
- **Potential Exposure (`POTENTIAL_EXPOSURE` / WARNING):** Public variables containing ambiguous identifiers (`KEY`, `TOKEN`, `AUTH`) that are not on the legitimate public allowlist (`ANON_KEY`, `PUBLISHABLE_KEY`, `CLIENT_ID`, etc.).
- **Git Tracking (`GIT_TRACKED` / CRITICAL):** Local `.env` or `.env.local` files tracked in the Git repository index.
- **Dynamic References (`DYNAMIC_ACCESS` / INFO):** Computed property accesses like `process.env[dynamicKey]` that cannot be statically verified.

---

## What It Does & Does Not Do

### What It Does
- **Static contract checking:** Compares `.env.example`, `.env`, and source code references without running your app.
- **AST parsing:** Uses Babel AST parser to identify real code references while ignoring strings, markdown, and comments.
- **Client exposure heuristics:** Flags common client prefix credential leaks.
- **Zero configuration:** Works out of the box with `npx envtarayici`.
- **CI-friendly:** Standard exit codes (`0`, `1`, `2`) and machine-readable JSON output.

### What It Does Not Do
- **No AI / LLM dependency:** Deterministic static analysis running 100% locally.
- **No cloud or secret manager integration:** Does not connect to AWS Secrets Manager, HashiCorp Vault, Doppler, etc.
- **No runtime / production resolution:** Does not resolve production environments, cloud providers, or runtime precedence.
- **No auto-fixing (`--fix`):** Never modifies or overwrites your source files or `.env` files.
- **No Git history scanning:** Only inspects current files and the Git index; does not crawl past commit history (use dedicated tools like Gitleaks for historical commits).

---

## Quick Start

Run in any Node.js / TypeScript project root:

```bash
npx envtarayici
```

### CLI Options

```bash
# Plain text output for CI/CD logs
npx envtarayici --ci

# Machine-readable JSON output
npx envtarayici --json

# Analyze a specific directory
npx envtarayici --cwd ./apps/web

# View help and version
npx envtarayici --help
npx envtarayici --version
```

---

## Example Output

```text
ENVTARAYICI
──────────────────────────────────────────────────
CRITICAL:
  🔴 NEXT_PUBLIC_DATABASE_PASSWORD (.env.local:1)
     Variable 'NEXT_PUBLIC_DATABASE_PASSWORD' uses public client prefix 'NEXT_PUBLIC_' but contains sensitive keyword 'PASSWORD'. Secrets must never be exposed to client bundles.

ERRORS:
  ❌ DATABASE_URL (.env.example:2)
     Variable 'DATABASE_URL' is documented in .env.example but missing in local environment (.env).

WARNINGS:
  ⚠️  PORT (src/index.ts:15)
     Variable 'PORT' is used in source code but missing from .env.example.

INFO:
  ℹ️  Dynamic environment variable access detected. Static analysis cannot verify dynamic property names. (src/config.ts:8)
──────────────────────────────────────────────────
Variables documented: 14 | Local variables: 13 | Code variables: 14
Files scanned: 28

Status: FAILED (1 Critical, 1 Error, 1 Warning)
```

---

## JSON Output

Use `--json` for automated tooling or custom CI scripts:

```bash
npx envtarayici --json
```

```json
{
  "status": "FAILED",
  "findings": [
    {
      "code": "PUBLIC_SECRET_EXPOSURE",
      "severity": "CRITICAL",
      "variableName": "NEXT_PUBLIC_DATABASE_PASSWORD",
      "message": "Variable 'NEXT_PUBLIC_DATABASE_PASSWORD' uses public client prefix 'NEXT_PUBLIC_' but contains sensitive keyword 'PASSWORD'. Secrets must never be exposed to client bundles.",
      "location": {
        "file": ".env.local",
        "line": 1
      }
    },
    {
      "code": "MISSING_FROM_LOCAL",
      "severity": "ERROR",
      "variableName": "DATABASE_URL",
      "message": "Variable 'DATABASE_URL' is documented in .env.example but missing in local environment (.env).",
      "location": {
        "file": ".env.example",
        "line": 2
      }
    }
  ],
  "summary": {
    "contractVariablesCount": 14,
    "localVariablesCount": 13,
    "codeVariablesCount": 14,
    "filesScannedCount": 28,
    "criticalCount": 1,
    "errorCount": 1,
    "warningCount": 0,
    "infoCount": 0
  }
}
```

---

## Exit Codes

| Code | Status | Meaning |
| :---: | :--- | :--- |
| `0` | **PASSED** | All required contract variables are present locally, and no critical security issues were detected. (Warnings and Info do not fail the check). |
| `1` | **FAILED** | One or more `CRITICAL` security violations or `ERROR` missing contract variables were detected. |
| `2` | **FATAL** | Execution error (e.g. invalid arguments or unreadable files). |

---

## Supported Source Syntax

The AST scanner parses JavaScript, TypeScript, and JSX/TSX files for static references:

```javascript
// Direct property access & optional chaining
process.env.PORT
process.env?.PORT
process.env['PORT']
process.env["PORT"]
process.env[`PORT`] // Static template literal without expressions

// Vite / ESM syntax
import.meta.env.VITE_API_URL
import.meta.env?.VITE_API_URL
import.meta.env['VITE_API_URL']

// Object destructuring
const { PORT, DATABASE_URL } = process.env
const { API_KEY: myKey } = process.env

// Dynamic access (flagged as DYNAMIC_ACCESS / INFO)
process.env[dynamicKey]
process.env[`DB_${suffix}`]
```

---

## Security & Data Handling

- **No Value Retention:** Environment variable values are never stored in memory structures (`KeyEntry`, `Finding`, `AnalysisResult`), never logged, and never included in terminal or JSON reports.
- **Transient Reading:** Raw `.env` file contents are read transiently by the local Node.js process solely to parse key names and verify value presence (`hasValue`). Values are discarded immediately after line extraction.
- **Local Execution:** No telemetry, no external network requests, and no third-party data transmission.

---

## CI Integration

Add **envtarayici** to your GitHub Actions workflow:

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
      - name: Run envtarayici
        run: npx envtarayici --ci
```

---

## Known Limitations

1. **Aliased Environment Objects:** Indirect references such as `const env = process.env; env.FOO` are not resolved to avoid heavy scope analysis.
2. **Duplicate Keys:** If a single `.env` file defines the same key multiple times, the line number of the last entry is kept; it is not reported as a separate finding.
3. **Heuristic Secret Detection:** Client prefix checks are naming heuristics based on keyword matching and common allowlists.
4. **Presence-Based Local Check:** The tool verifies that a key exists in `.env` or `.env.local`, but does not attempt to replicate the full runtime precedence of specific frameworks.

---

## Requirements

- **Node.js:** `>= 18.0.0`

---

## Development

```bash
npm run build      # Build with tsup
npm test           # Run vitest test suite
npm run typecheck  # Type check with tsc
```

---

## License

[MIT](LICENSE)
