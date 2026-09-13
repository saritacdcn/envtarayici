# envtarayici 🔍

[English](README.md) | [Türkçe](README.tr.md) | [Español](README.es.md) | [简体中文](README.zh-CN.md)

> 面向 Node.js 和 TypeScript 项目的静态环境变量与契约（Contract）检查工具。

**envtarayici** 能够在无需修改任何代码且无任何外部服务依赖的情况下，对您的环境契约（`.env.example`）、本地开发文件（`.env`、`.env.local`）以及源代码进行审计。

---

## 契约（Contract）理念

在现代全栈开发中，环境配置通常分布在三个不同的层级：

1. **契约（`.env.example`、`.env.sample`、`.env.template`）：** 声明应用程序运行所需变量的基础规范。
2. **本地环境（`.env`、`.env.local`）：** 包含开发者本地配置值的本地环境文件。
3. **源代码（`src/**/*.{ts,js,tsx,jsx}`）：** 在构建时或运行时实际消费这些变量的地方（`process.env.VAR`、`import.meta.env.VAR`）。

**envtarayici** 验证这三个层级是否保持同步：
- 检测在契约中已定义但开发者本地环境中缺失的变量。
- 检测在源代码中已使用但从未在契约中记录的变量。
- 捕获因使用公开前缀而意外暴露给客户端打包文件（client-side bundles）的敏感密钥。
- 标记被错误提交到 Git 索引中的本地环境文件。

---

## envtarayici 的功能与非功能范围

### 包含的功能
- **契约验证：** 确保模板中声明的必要变量在本地存在。
- **AST 源码扫描：** 使用 Babel AST 识别静态的 `process.env` 与 `import.meta.env` 引用。
- **客户端暴露启发式检测：** 标记 `NEXT_PUBLIC_*`、`VITE_*` 等客户端前缀中明确的敏感词模式。
- **Git 索引跟踪检查：** 检查本地 `.env` 文件是否被 Git 仓库索引跟踪。
- **终端与 JSON 报告：** 提供人类可读的格式化终端摘要以及供自动化工具使用的机器可读 JSON 输出。
- **适用于 CI 的退出码：** 为 CI/CD 流程和 pre-commit 钩子提供标准化的退出状态码（`0`、`1`、`2`）。

### 不包含（超出范围）
- **无 AI / LLM 依赖：** 完全在本地机器上运行的确定性静态分析。
- **无生产环境 / 云端解析：** 不解析生产环境，也不连接任何密钥管理服务（AWS Secrets Manager、Vault、Doppler 等）。
- **无自动修复（`--fix`）：** 绝不修改、覆盖或重写您的源代码或 `.env` 文件。
- **无 Git 历史记录敏感信息扫描：** 仅检查当前工作区和 Git 索引；不遍历历史 git commit（如需排查历史提交，请使用 Gitleaks 等专用工具）。
- **无运行时解析：** 不执行您的应用程序代码，也不评估运行时环境变量。

---

## 快速上手

可在任何 Node.js / TypeScript 项目中直接运行，无需安装：

```bash
npx envtarayici
```

### 选项

```bash
# 适用于 CI/CD 流程的纯文本输出
npx envtarayici --ci

# 机器可读的 JSON 输出
npx envtarayici --json

# 分析指定目录
npx envtarayici --cwd ./apps/web

# 查看帮助或版本信息
npx envtarayici --help
npx envtarayici --version
```

---

## 输出示例

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

## 规则与检测逻辑

| 规则代码 | 严重级别 | 描述 |
| :--- | :--- | :--- |
| `PUBLIC_SECRET_EXPOSURE` | **CRITICAL** | 客户端前缀（`NEXT_PUBLIC_`、`VITE_`、`PUBLIC_`、`GATSBY_`、`NUXT_PUBLIC_`、`EXPO_PUBLIC_`）与明确的敏感词（`SECRET`、`PASSWORD`、`PRIVATE`、`DATABASE_URL`、`SERVICE_ROLE_KEY`、`CREDENTIALS` 等）组合使用。 |
| `GIT_TRACKED` | **CRITICAL** | 本地 `.env` 或 `.env.local` 文件已被 Git 仓库索引跟踪。 |
| `MISSING_FROM_LOCAL` | **ERROR** | 契约（`.env.example`、`.env.sample` 或 `.env.template`）中定义的必要变量在本地 `.env` 和 `.env.local` 中缺失。 |
| `UNDOCUMENTED_IN_EXAMPLE` | **WARNING** | 源代码中静态引用的变量未在 `.env.example` 中记录。 |
| `POTENTIAL_EXPOSURE` | **WARNING** | 公开变量包含模糊关键词（`KEY`、`TOKEN`、`AUTH`），且未匹配显式白名单模式。 |
| `DYNAMIC_ACCESS` | **INFO** | 如 `process.env[dynamicKey]` 等无法进行静态验证的计算属性访问。 |

### 公开 Token 白名单（Allowlist）

合法的客户端 Token（例如 `NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`、`NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN`、`*_CLIENT_ID`）已被列入白名单，不会触发误报警告。

---

## 安全模型：仅元数据分析

环境变量的实际取值绝不会被保留、存储、记录，也不会包含在任何检测结果或报告中：
1. **即时丢弃取值：** 在逐行提取过程中，变量的值在确定是否存在（`hasValue`）后立即被丢弃。
2. **绝不输出明文：** 明文敏感数据绝不会进入数据结构（`KeyEntry`、`Finding`、`AnalysisResult`），也绝不会打印到终端报告、错误消息、日志或 JSON 输出中。

---

## CI / CD 集成与退出码

将 **envtarayici** 添加到您的 GitHub Actions 或 pre-commit 工作流中：

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

### 退出码

- `0`: **通过（PASSED）** — 契约中要求的所有变量均已就绪，且未检测到严重安全问题。（警告与信息提示不会导致构建失败）。
- `1`: **失败（FAILED）** — 检测到一个或多个 `CRITICAL` 严重安全违规，或存在 `ERROR` 级别的契约变量缺失。
- `2`: **严重错误（FATAL）** — 运行时执行错误（例如参数无效或文件权限问题）。

---

## 已知局限性

1. **别名环境变量访问：** 为确保 AST 扫描的高效性并避免引入繁杂的作用域分析（scope analysis）依赖，类似 `const env = process.env; env.FOO` 的间接引用不会被追踪。
2. **单文件重复键：** 如果单个 `.env` 文件多次定义了同一个键，将保留最后一个条目的行号，而不会发出重复项诊断。
3. **性能：** 分析耗时取决于项目规模、文件数量以及磁盘 I/O 性能。

---

## 许可证

[MIT](LICENSE)
