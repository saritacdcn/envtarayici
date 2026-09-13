# envtarayici

[English](README.md) | [Türkçe](README.tr.md) | [Español](README.es.md) | [简体中文](README.zh-CN.md)

面向 Node.js / TypeScript 的静态环境变量与契约（Contract）检查工具。

```bash
npx envtarayici
```

在环境变量漂移（drift）演变成运行时故障之前，静态检测 `.env.example`、本地环境与源代码之间的不一致。

---

## 它能捕获哪些问题？

在全栈应用开发中，环境变量极易在三个位置之间发生漂移：示例契约文件（`.env.example`）、开发者本地环境文件（`.env`、`.env.local`）以及实际业务代码（`src/`）。

以下是 **envtarayici** 捕获的三个最常见场景：

### 1. 代码 → 契约（缺少文档）

开发者在源码中新增了一个环境变量：

```typescript
// src/db.ts
const dbUrl = process.env.DATABASE_URL;
```

...但忘记将其记录在 `.env.example` 中。其他开发者可能不知道代码依赖了此环境变量。

**envtarayici 将其标记为警告：**
```text
WARNINGS:
  ⚠️  DATABASE_URL (src/db.ts:2)
     Variable 'DATABASE_URL' is used in source code but missing from .env.example.
```

### 2. 契约 → 本地（缺少本地变量）

团队成员在 `.env.example` 中增加了一个必需的环境变量：

```text
DATABASE_URL=postgresql://localhost:5432/mydb
```

...但你的本地 `.env` 或 `.env.local` 尚未同步更新。

**envtarayici 将其标记为错误：**
```text
ERRORS:
  ❌ DATABASE_URL (.env.example:1)
     Variable 'DATABASE_URL' is documented in .env.example but missing in local environment (.env).
```

### 3. Public Secret Exposure

一个敏感密钥被错误地赋予了客户端打包前缀（`NEXT_PUBLIC_`、`VITE_`、`PUBLIC_` 等）：

```text
# .env.local
NEXT_PUBLIC_DATABASE_PASSWORD=supersecret
```

前端框架可能会将带有公开客户端前缀的变量暴露给客户端打包文件（client-side bundles）。

**envtarayici 将其标记为严重安全问题：**
```text
CRITICAL:
  🔴 NEXT_PUBLIC_DATABASE_PASSWORD (.env.local:1)
     Variable 'NEXT_PUBLIC_DATABASE_PASSWORD' uses public client prefix 'NEXT_PUBLIC_' but contains sensitive keyword 'PASSWORD'. Secrets must never be exposed to client bundles.
```

---

## 检查内容

- **契约验证（`MISSING_FROM_LOCAL` / ERROR）：** 在 `.env.example`（或 `.env.sample`、`.env.template`）中已声明但在本地 `.env` 和 `.env.local` 中缺失的变量。
- **源码覆盖率（`UNDOCUMENTED_IN_EXAMPLE` / WARNING）：** 在源代码中静态引用但未在 `.env.example` 中记录的环境变量。
- **客户端密钥暴露（`PUBLIC_SECRET_EXPOSURE` / CRITICAL）：** 客户端前缀（`NEXT_PUBLIC_`、`VITE_`、`PUBLIC_`、`GATSBY_`、`NUXT_PUBLIC_`、`EXPO_PUBLIC_`）与明确的敏感词（`SECRET`、`PASSWORD`、`PRIVATE`、`DATABASE_URL`、`SERVICE_ROLE_KEY`、`CREDENTIALS` 等）组合使用。
- **潜在暴露风险（`POTENTIAL_EXPOSURE` / WARNING）：** 包含模糊标识词（`KEY`、`TOKEN`、`AUTH`）且未命中合法白名单（`ANON_KEY`、`PUBLISHABLE_KEY`、`CLIENT_ID` 等）的公开前缀变量。
- **Git 跟踪排查（`GIT_TRACKED` / CRITICAL）：** 本地 `.env` 或 `.env.local` 文件被 Git 仓库索引跟踪。
- **动态引用提示（`DYNAMIC_ACCESS` / INFO）：** 类似 `process.env[dynamicKey]` 这种无法进行静态验证的计算属性访问。

---

## 功能与非功能范围

### 包含的功能
- **静态契约检查：** 无需运行应用程序即可对比 `.env.example`、`.env` 与源码引用。
- **AST 代码解析：** 使用 Babel AST 解析器识别真实的代码引用，自动忽略纯字符串、Markdown 和注释行。
- **客户端暴露启发式规则：** 标记带有常见客户端前缀的凭据泄漏风险。
- **零配置：** 无需安装，直接运行 `npx envtarayici`。
- **CI 友好：** 标准退出码（`0`、`1`、`2`）以及机器可读的 JSON 输出。

### 不包含的功能
- **无 AI / LLM 依赖：** 100% 在本地运行的确定性静态分析。
- **无云端或密钥管理服务集成：** 不连接 AWS Secrets Manager、HashiCorp Vault、Doppler 等外部服务。
- **无运行时 / 生产环境解析：** 不解析生产环境、云服务商或运行时配置优先级。
- **无自动修改代码功能（`--fix`）：** 绝不修改或覆盖您的源代码文件或 `.env` 文件。
- **无 Git 历史记录扫描：** 仅检查当前工作目录文件与 Git 索引；不遍历历史 commit（排查历史提交请使用 Gitleaks 等专用工具）。

---

## 快速上手

在任何 Node.js / TypeScript 项目根目录执行：

```bash
npx envtarayici
```

### CLI 选项

```bash
# 适用于 CI/CD 流程日志的纯文本输出
npx envtarayici --ci

# 机器可读的 JSON 输出
npx envtarayici --json

# 分析指定目录
npx envtarayici --cwd ./apps/web

# 查看帮助与版本信息
npx envtarayici --help
npx envtarayici --version
```

---

## 输出示例

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

## JSON 输出

使用 `--json` 生成可用于自动化流程或自定义 CI 脚本的结构化数据：

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

## 退出状态码（Exit Codes）

| 状态码 | 状态 | 含义 |
| :---: | :--- | :--- |
| `0` | **PASSED** | 契约中要求的所有变量在本地均已就绪，且未检测到严重安全风险。（警告和信息提示不会导致检查失败）。 |
| `1` | **FAILED** | 检测到一个或多个 `CRITICAL` 严重安全违规，或存在 `ERROR` 级别的必要契约变量缺失。 |
| `2` | **FATAL** | 执行故障（例如参数无效或文件不可读取）。 |

---

## 支持的源代码语法

AST 扫描器支持解析 JavaScript、TypeScript 和 JSX/TSX 文件中的静态引用模式：

```javascript
// 直接属性访问与可选链（optional chaining）
process.env.PORT
process.env?.PORT
process.env['PORT']
process.env["PORT"]
process.env[`PORT`] // 无表达式的静态模板字面量

// Vite / ESM 语法
import.meta.env.VITE_API_URL
import.meta.env?.VITE_API_URL
import.meta.env['VITE_API_URL']

// 对象解构赋值
const { PORT, DATABASE_URL } = process.env
const { API_KEY: myKey } = process.env

// 动态访问（标记为 DYNAMIC_ACCESS / INFO）
process.env[dynamicKey]
process.env[`DB_${suffix}`]
```

---

## 安全性与数据处理

- **不保留任何取值：** 环境变量的实际取值绝不会保存在内存数据结构（`KeyEntry`、`Finding`、`AnalysisResult`）中，绝不会记录在日志中，也绝不会包含在终端或 JSON 报告中。
- **瞬态读取：** 原始 `.env` 文件内容仅由本地 Node.js 进程临时读取，用于提取键名并确定是否存在取值（`hasValue`）。在逐行提取完成后，所有取值立即被丢弃。
- **纯本地执行：** 无任何遥测数据收集，不发起外部网络请求，绝不向任何第三方传输数据。

---

## CI 集成

将 **envtarayici** 添加到 GitHub Actions 工作流中：

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

## 已知局限性

1. **别名环境变量对象：** 为避免繁杂的作用域分析，间接引用如 `const env = process.env; env.FOO` 不会被追踪。
2. **重复键名：** 若单个 `.env` 文件多次定义了同一个键，仅保留最后一个条目的行号；不会作为单独的诊断项报错。
3. **启发式密钥检测：** 客户端前缀检测是基于关键词匹配与通用白名单的命名启发规则。
4. **基于存在性的本地检查：** 工具仅验证变量是否存在于 `.env` 或 `.env.local` 中，不会尝试复现特定前端/后端框架的完整运行时优先级规则。

---

## 环境要求

- **Node.js:** `>= 18.0.0`

---

## 本地开发

```bash
npm run build      # 使用 tsup 编译打包
npm test           # 使用 vitest 运行测试套件
npm run typecheck  # 使用 tsc 检查类型
```

---

## 许可证

[MIT](LICENSE)
