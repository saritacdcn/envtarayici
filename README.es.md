# envtarayici

[English](README.md) | [Türkçe](README.tr.md) | [Español](README.es.md) | [简体中文](README.zh-CN.md)

Linter estático de variables de entorno y contratos para Node.js / TypeScript.

```bash
npx envtarayici
```

Detecta discrepancias de variables de entorno entre tu `.env.example`, tu entorno local y tu código fuente antes de que se conviertan en un problema en tiempo de ejecución.

---

## ¿Qué Detecta?

Las variables de entorno en aplicaciones fullstack se desajustan fácilmente entre tres ubicaciones: tu contrato de ejemplo (`.env.example`), tus archivos de desarrollo local (`.env`, `.env.local`) y tu código real (`src/`).

Estos son los tres problemas más comunes que detecta **envtarayici**:

### 1. Código → Contrato (Documentación Faltante)

Un desarrollador añade una variable en el código fuente:

```typescript
// src/db.ts
const dbUrl = process.env.DATABASE_URL;
```

...pero olvida documentarla en `.env.example`. Es posible que otros desarrolladores no sepan que el código espera esta variable.

**envtarayici lo señala:**
```text
WARNINGS:
  ⚠️  DATABASE_URL (src/db.ts:2)
     Variable 'DATABASE_URL' is used in source code but missing from .env.example.
```

### 2. Contrato → Local (Variable Local Faltante)

Un compañero de equipo añade una nueva variable requerida a `.env.example`:

```text
DATABASE_URL=postgresql://localhost:5432/mydb
```

...pero tu archivo local `.env` o `.env.local` nunca fue actualizado.

**envtarayici lo señala:**
```text
ERRORS:
  ❌ DATABASE_URL (.env.example:1)
     Variable 'DATABASE_URL' is documented in .env.example but missing in local environment (.env).
```

### 3. Public Secret Exposure

Una clave secreta se nombra accidentalmente con un prefijo de empaquetado del lado del cliente (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, etc.):

```text
# .env.local
NEXT_PUBLIC_DATABASE_PASSWORD=supersecret
```

Los frameworks pueden exponer variables con prefijos públicos a los paquetes del lado del cliente (client-side bundles).

**envtarayici lo señala:**
```text
CRITICAL:
  🔴 NEXT_PUBLIC_DATABASE_PASSWORD (.env.local:1)
     Variable 'NEXT_PUBLIC_DATABASE_PASSWORD' uses public client prefix 'NEXT_PUBLIC_' but contains sensitive keyword 'PASSWORD'. Secrets must never be exposed to client bundles.
```

---

## ¿Qué Comprueba?

- **Verificación de Contrato (`MISSING_FROM_LOCAL` / ERROR):** Variables declaradas en `.env.example` (o `.env.sample`, `.env.template`) que faltan en los archivos locales `.env` y `.env.local`.
- **Cobertura en Código Fuente (`UNDOCUMENTED_IN_EXAMPLE` / WARNING):** Variables de entorno referenciadas estáticamente en el código fuente que no están documentadas en `.env.example`.
- **Exposición Pública de Secretos (`PUBLIC_SECRET_EXPOSURE` / CRITICAL):** Prefijos de cliente (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `GATSBY_`, `NUXT_PUBLIC_`, `EXPO_PUBLIC_`) combinados con términos de secretos inequívocos (`SECRET`, `PASSWORD`, `PRIVATE`, `DATABASE_URL`, `SERVICE_ROLE_KEY`, `CREDENTIALS`, etc.).
- **Exposición Potencial (`POTENTIAL_EXPOSURE` / WARNING):** Variables públicas que contienen identificadores ambiguos (`KEY`, `TOKEN`, `AUTH`) que no forman parte de la lista de permitidos legítimos (`ANON_KEY`, `PUBLISHABLE_KEY`, `CLIENT_ID`, etc.).
- **Rastreo en Git (`GIT_TRACKED` / CRITICAL):** Archivos locales `.env` o `.env.local` rastreados en el índice del repositorio Git.
- **Referencias Dinámicas (`DYNAMIC_ACCESS` / INFO):** Accesos a propiedades calculadas como `process.env[dynamicKey]` que no pueden verificarse estáticamente.

---

## Qué Hace y Qué No Hace

### Lo que hace
- **Comprobación estática de contratos:** Compara `.env.example`, `.env` y las referencias en el código fuente sin ejecutar tu aplicación.
- **Análisis con AST:** Utiliza el analizador Babel AST para identificar referencias reales en código ignorando cadenas de texto, markdown o comentarios.
- **Heurística de exposición en cliente:** Señala fugas comunes de credenciales mediante prefijos de cliente.
- **Cero configuración:** Funciona directamente ejecutando `npx envtarayici`.
- **Apto para CI:** Códigos de salida estandarizados (`0`, `1`, `2`) y salida JSON estructurada para herramientas de automatización.

### Lo que no hace
- **Sin dependencia de IA / LLM:** Análisis estático determinista ejecutado 100% en local.
- **Sin integración con la nube o gestores de secretos:** No se conecta a AWS Secrets Manager, HashiCorp Vault, Doppler, etc.
- **Sin resolución en runtime / producción:** No resuelve entornos de producción, proveedores en la nube ni precedencias de ejecución.
- **Sin corrección automática (`--fix`):** Nunca modifica ni sobrescribe tus archivos de código fuente o archivos `.env`.
- **Sin escaneo de historial de Git:** Solo inspecciona los archivos actuales y el índice de Git; no analiza el historial de commits anteriores (usa herramientas como Gitleaks para commits históricos).

---

## Inicio Rápido

Ejecuta en la raíz de cualquier proyecto Node.js / TypeScript:

```bash
npx envtarayici
```

### Opciones de CLI

```bash
# Salida en texto plano para registros de CI/CD
npx envtarayici --ci

# Salida en formato JSON legible por máquina
npx envtarayici --json

# Analizar un directorio específico
npx envtarayici --cwd ./apps/web

# Ver ayuda y versión
npx envtarayici --help
npx envtarayici --version
```

---

## Ejemplo de Salida

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

## Salida en Formato JSON

Usa `--json` para herramientas automáticas o scripts de CI personalizados:

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

## Códigos de Salida (Exit Codes)

| Código | Estado | Significado |
| :---: | :--- | :--- |
| `0` | **PASSED** | Todas las variables requeridas por el contrato están presentes localmente y no se detectaron problemas críticos de seguridad. (Las advertencias e informaciones no fallan la comprobación). |
| `1` | **FAILED** | Se detectaron una o más violaciones de seguridad `CRITICAL` o variables de contrato ausentes de nivel `ERROR`. |
| `2` | **FATAL** | Error de ejecución (p. ej., argumentos inválidos o archivos inaccesibles). |

---

## Sintaxis de Código Fuente Soportada

El analizador AST procesa archivos JavaScript, TypeScript y JSX/TSX en busca de referencias estáticas:

```javascript
// Acceso directo a propiedades y encadenamiento opcional
process.env.PORT
process.env?.PORT
process.env['PORT']
process.env["PORT"]
process.env[`PORT`] // Template literal estático sin expresiones

// Sintaxis Vite / ESM
import.meta.env.VITE_API_URL
import.meta.env?.VITE_API_URL
import.meta.env['VITE_API_URL']

// Desestructuración de objetos
const { PORT, DATABASE_URL } = process.env
const { API_KEY: myKey } = process.env

// Acceso dinámico (marcado como DYNAMIC_ACCESS / INFO)
process.env[dynamicKey]
process.env[`DB_${suffix}`]
```

---

## Seguridad y Manejo de Datos

- **Sin Retención de Valores:** Los valores de las variables de entorno nunca se almacenan en estructuras de datos en memoria (`KeyEntry`, `Finding`, `AnalysisResult`), no se registran en logs y jamás se incluyen en informes de terminal o JSON.
- **Lectura Transitoria:** El contenido sin procesar de los archivos `.env` se lee de forma transitoria por el proceso local de Node.js únicamente para analizar los nombres de las claves y comprobar la presencia de valores (`hasValue`). Los valores se descartan inmediatamente tras la extracción de líneas.
- **Ejecución Local:** Sin telemetría, sin peticiones de red externas y sin transferencia de datos a terceros.

---

## Integración en CI

Añade **envtarayici** a tu flujo de trabajo de GitHub Actions:

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

## Limitaciones Conocidas

1. **Objetos de Entorno con Alias:** Las referencias indirectas como `const env = process.env; env.FOO` no se resuelven para evitar un análisis de alcance excesivamente pesado.
2. **Claves Duplicadas:** Si un mismo archivo `.env` define la misma clave varias veces, se conserva el número de línea de la última entrada; no se emite un diagnóstico de duplicado independiente.
3. **Detección Heurística de Secretos:** Las comprobaciones de prefijos de cliente son heurísticas basadas en coincidencia de palabras clave y listas de permitidos estándar.
4. **Comprobación Local Basada en Presencia:** La herramienta comprueba que una clave exista en `.env` o `.env.local`, pero no intenta replicar la precedencia completa de ejecución de frameworks específicos.

---

## Requisitos

- **Node.js:** `>= 18.0.0`

---

## Desarrollo

```bash
npm run build      # Compilar con tsup
npm test           # Ejecutar la suite de tests con vitest
npm run typecheck  # Comprobar tipos con tsc
```

---

## Licencia

[MIT](LICENSE)
