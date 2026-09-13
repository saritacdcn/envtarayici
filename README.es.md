# envtarayici 🔍

[English](README.md) | [Türkçe](README.tr.md) | [Español](README.es.md) | [简体中文](README.zh-CN.md)

> Linter estático de variables de entorno y contratos para proyectos Node.js y TypeScript.

**envtarayici** audita tus contratos de entorno (`.env.example`), archivos de desarrollo local (`.env`, `.env.local`) y código fuente sin requerir modificaciones en el código ni dependencias de servicios externos.

---

## El Concepto de Contrato

En el desarrollo fullstack moderno, la configuración del entorno opera en tres capas diferenciadas:

1. **El Contrato (`.env.example`, `.env.sample`, `.env.template`):** La línea base declarada que define qué variables requiere la aplicación para ejecutarse.
2. **El Entorno Local (`.env`, `.env.local`):** Los archivos de entorno local del desarrollador que contienen valores de configuración local.
3. **El Código Fuente (`src/**/*.{ts,js,tsx,jsx}`):** Donde las variables se consumen efectivamente en tiempo de compilación o ejecución (`process.env.VAR`, `import.meta.env.VAR`).

**envtarayici** verifica que estas tres capas se mantengan sincronizadas:
- Detecta variables definidas en el contrato pero ausentes en el entorno local del desarrollador.
- Detecta variables utilizadas en el código fuente que nunca fueron documentadas en el contrato.
- Detecta secretos sensibles expuestos accidentalmente a paquetes del lado del cliente (client-side bundles) mediante prefijos públicos.
- Señala archivos de entorno local que fueron rastreados por error en el índice de Git.

---

## Qué hace y qué no hace envtarayici

### Incluido
- **Verificación de Contratos:** Garantiza que las variables de plantilla requeridas existan localmente.
- **Escaneo de Código Fuente con AST:** Identifica referencias estáticas a `process.env` e `import.meta.env` mediante Babel AST.
- **Heurísticas de Exposición en el Cliente:** Señala patrones inequívocos de secretos en `NEXT_PUBLIC_*`, `VITE_*` y otros prefijos de cliente.
- **Comprobación de Seguimiento en Git:** Identifica si los archivos `.env` locales están siendo rastreados en el índice del repositorio Git.
- **Informes en Terminal y JSON:** Resúmenes formateados legibles para humanos y salida JSON estructurada para herramientas de automatización.
- **Códigos de Salida Aptos para CI:** Códigos de salida estandarizados (`0`, `1`, `2`) para flujos de CI/CD y hooks de pre-commit.

### No Incluido (Fuera de Alcance)
- **Sin Dependencia de IA / LLM:** Análisis estático determinista puro ejecutado íntegramente en tu máquina local.
- **Sin Resolución de Producción / Nube:** No resuelve entornos de producción ni se conecta a gestores de secretos (AWS Secrets Manager, Vault, Doppler, etc.).
- **Sin Correcciones Automáticas (`--fix`):** Nunca modifica, sobrescribe ni reescribe tu código fuente o archivos `.env`.
- **Sin Escaneo de Secretos en el Historial de Git:** Solo inspecciona el árbol de trabajo actual y el índice de Git; no recorre commits históricos (utiliza herramientas dedicadas como Gitleaks para el historial de git).
- **Sin Resolución en Tiempo de Ejecución:** No ejecuta el código de tu aplicación ni evalúa variables de entorno en runtime.

---

## Inicio Rápido

Ejecuta directamente en cualquier proyecto Node.js / TypeScript sin necesidad de instalación previa:

```bash
npx envtarayici
```

### Opciones

```bash
# Salida en texto plano para flujos de CI/CD
npx envtarayici --ci

# Salida en formato JSON legible por máquina
npx envtarayici --json

# Analizar un directorio específico
npx envtarayici --cwd ./apps/web

# Ver ayuda o versión
npx envtarayici --help
npx envtarayici --version
```

---

## Ejemplo de Salida

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

## Reglas y Lógica de Detección

| Código de Regla | Severidad | Descripción |
| :--- | :--- | :--- |
| `PUBLIC_SECRET_EXPOSURE` | **CRITICAL** | Prefijo de cliente (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `GATSBY_`, `NUXT_PUBLIC_`, `EXPO_PUBLIC_`) combinado con términos inequívocos de secretos (`SECRET`, `PASSWORD`, `PRIVATE`, `DATABASE_URL`, `SERVICE_ROLE_KEY`, `CREDENTIALS`, etc.). |
| `GIT_TRACKED` | **CRITICAL** | Archivos locales `.env` o `.env.local` rastreados activamente en el índice del repositorio Git. |
| `MISSING_FROM_LOCAL` | **ERROR** | Una variable requerida definida en el contrato (`.env.example`, `.env.sample` o `.env.template`) no está presente en los archivos locales `.env` y `.env.local`. |
| `UNDOCUMENTED_IN_EXAMPLE` | **WARNING** | Una variable referenciada estáticamente en el código fuente no está documentada en `.env.example`. |
| `POTENTIAL_EXPOSURE` | **WARNING** | Una variable pública utiliza palabras clave ambiguas (`KEY`, `TOKEN`, `AUTH`) sin coincidir con un patrón explícito en la lista de permitidos. |
| `DYNAMIC_ACCESS` | **INFO** | Acceso a propiedades calculadas como `process.env[dynamicKey]` que no puede verificarse estáticamente. |

### Lista de Permitidos de Tokens Públicos (Allowlist)

Los tokens legítimos del lado del cliente (p. ej., `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN`, `*_CLIENT_ID`) están en la lista de permitidos y no generan advertencias de falso positivo.

---

## Modelo de Seguridad: Análisis Exclusivo de Metadatos

Los valores de las variables de entorno no se retienen, almacenan, registran ni se incluyen en hallazgos o informes:
1. **Valores Descartados:** Durante la extracción de líneas, los valores de las variables se descartan inmediatamente tras determinar su presencia (`hasValue`).
2. **Nunca Emitidos:** Los secretos en texto plano nunca entran en las estructuras de datos (`KeyEntry`, `Finding`, `AnalysisResult`) y jamás se imprimen en informes de terminal, mensajes de error, registros ni salidas JSON.

---

## Integración en CI / CD y Códigos de Salida

Agrega **envtarayici** a tus GitHub Actions o a tu flujo de trabajo de pre-commit:

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

### Códigos de Salida

- `0`: **CORRECTO (PASSED)** — Todas las variables requeridas por el contrato están presentes y no se detectaron problemas críticos de seguridad. (Las advertencias e información no fallan la compilación).
- `1`: **FALLIDO (FAILED)** — Se encontraron una o más violaciones de seguridad `CRITICAL` o variables del contrato ausentes de tipo `ERROR`.
- `2`: **FATAL** — Error de ejecución en runtime (p. ej., argumentos inválidos o problemas de permisos de archivos).

---

## Limitaciones Conocidas

1. **Acceso a Entorno con Alias:** Las referencias indirectas como `const env = process.env; env.FOO` no se rastrean para mantener el escaneo AST rápido y libre de dependencias complejas de análisis de alcance (scope analysis).
2. **Claves Duplicadas en un Solo Archivo:** Si un mismo archivo `.env` define la misma clave varias veces, se conserva el número de línea de la última entrada sin emitir un diagnóstico de duplicado.
3. **Rendimiento:** La duración del análisis está determinada por el tamaño del proyecto, el número de archivos y el rendimiento de E/S del disco.

---

## Licencia

[MIT](LICENSE)
