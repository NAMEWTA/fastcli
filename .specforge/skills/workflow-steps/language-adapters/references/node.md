# Node.js 项目约定（Node.js Conventions）

> 本文件作为 `language-adapters` SKILL 的 Node.js 适配补充。仅在主流程引用 language-adapters 并需要 Node.js 细节时按需阅读。

## 1. 包管理与运行时

| 工具         | 适用场景                         | 关键文件                         |
| ------------ | -------------------------------- | -------------------------------- |
| **pnpm**（推荐） | Monorepo、磁盘效率、严格幽灵依赖 | `package.json` + `pnpm-lock.yaml` |
| **npm**      | 默认工具，生态最广               | `package.json` + `package-lock.json` |
| **yarn (berry)** | PnP / 插件生态                  | `package.json` + `yarn.lock`     |
| **bun**      | 高性能新兴替代                   | `package.json` + `bun.lockb`     |

**约定：**

- 新项目默认 `pnpm`（lockfile 小、依赖树严格、Monorepo 原生支持 workspace）。
- `.nvmrc` / `engines.node` 固定 Node 版本，CI 中校验。
- **禁止**提交 `node_modules`；严禁在 CI 中使用 `--no-frozen-lockfile`。

## 2. 模块系统：优先 ESM

| 场景             | 配置                                     |
| ---------------- | ---------------------------------------- |
| 纯 ESM（推荐）   | `package.json` 的 `"type": "module"`；导入路径必须带扩展名（NodeNext） |
| 纯 CommonJS      | `"type": "commonjs"`（默认）              |
| 双格式库          | 产出 ESM + CJS 双发行（tsup/unbuild）     |

**约定：**

- **新项目必须 ESM + TypeScript + NodeNext**，import 路径带 `.js` 扩展名。
- 禁止混用 `require` 与 `import` 同一文件。
- 若必须兼容 CJS 下游，使用 `tsup` / `unbuild` 双产出。

## 3. package.json 推荐结构

```json
{
  "name": "my-app",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=20.11.0" },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc -p tsconfig.json",
    "test": "vitest --run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write .",
    "check": "pnpm lint && pnpm test && pnpm build"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "tsx": "^4.19.0",
    "vitest": "^2.1.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0"
  }
}
```

## 4. 项目结构约定

```
my-app/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js          # flat config
├── .prettierrc
├── src/
│   ├── index.ts              # 库入口
│   ├── cli/                  # CLI 入口（如适用）
│   ├── core/                 # 纯领域 / 类型
│   ├── services/             # 业务编排
│   ├── adapters/             # 外部依赖适配
│   └── utils/                # 工具函数
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── dist/                     # 构建产物
```

## 5. TypeScript 严格配置

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
```

**约定：**

- `strict: true` 是底线；条件允许时开启 `noUncheckedIndexedAccess` 和 `exactOptionalPropertyTypes`。
- 禁止 `any`；不得不用时必须写明 `// eslint-disable-next-line` 与理由。
- 公开 API 禁用 `// @ts-ignore`，只允许 `// @ts-expect-error <reason>`。

## 6. 测试约定

| 工具       | 职责                                |
| ---------- | ----------------------------------- |
| **Vitest** | 单元 + 集成测试（现代首选）         |
| **Jest**   | 存量项目维护                        |
| **Node test runner** | 零依赖；仅标准库即可            |
| **Playwright / Cypress** | E2E                         |
| **Testcontainers** | 真实依赖的集成测试               |

### Vitest 基本配置

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
    testTimeout: 10_000,
  },
});
```

**约定：**

- 默认 `vitest --run`（非 watch）；watch 仅开发时使用。
- 单元测试文件紧邻源码或集中在 `tests/unit/`；每个测试独立，互不依赖。
- 集成测试用 Testcontainers 启动真实依赖。
- 覆盖率阈值由 DESIGN.md 定义。

## 7. 质量工具链

| 工具                 | 职责                                      |
| -------------------- | ----------------------------------------- |
| **ESLint 9 (flat config)** | 语法 + 风格 + TypeScript 检查           |
| **Prettier 3**       | 格式化                                    |
| **typescript-eslint** | 利用类型信息的规则                        |
| **npm audit / pnpm audit / osv-scanner** | 依赖漏洞检查             |
| **lint-staged + husky**  | 提交前自动 lint/format                  |

**约定：**

- CI 必跑：`pnpm lint`、`pnpm test --run`、`pnpm build`。
- Prettier 与 ESLint 通过 `eslint-config-prettier` 避免冲突。
- 依赖安全：CI 集成 `pnpm audit --audit-level=high` 或 osv-scanner。

## 8. 异步与错误处理

- 禁止 `.then(...).catch(...)` 混用 `async/await`；统一 `try/catch + await`。
- 不要在顶层 `await` 之外「吞掉」Promise；所有 Promise 必须被 `await` 或挂上 handler。
- 错误使用显式 `Error` 实例或自定义错误类：

  ```ts
  export class ValidationError extends Error {
    constructor(
      message: string,
      public readonly field: string,
    ) {
      super(message);
      this.name = 'ValidationError';
    }
  }
  ```

- 使用 `AbortSignal` 控制超时与取消。
- Node 18+ 提供原生 `fetch`；大多数场景不再需要 `axios` / `node-fetch`。

## 9. 部署常见形态

| 场景              | 方式                                         |
| ----------------- | -------------------------------------------- |
| Web API           | Fastify / Hono / NestJS + Docker / Kubernetes |
| CLI 工具          | `bin` 字段 + shebang + `npm publish`         |
| Serverless        | AWS Lambda（Hono 适配器）/ Vercel / Netlify  |
| Worker            | BullMQ / Temporal / Inngest                  |
| Desktop           | Electron / Tauri（Tauri 更轻量）             |

### CLI 发布要点

- `bin` 字段指向**编译后**的 JS 文件（如 `./dist/cli/index.js`）。
- 入口文件第一行**必须**包含 `#!/usr/bin/env node`。
- `files` 字段发布 `dist` + 必要资源；不发布源码 `src/`。
- 发布前运行校验脚本：`node dist/cli/index.js --help` 能正常输出。

## 10. 常见反模式

| 反模式                            | 改进                                                                |
| --------------------------------- | ------------------------------------------------------------------- |
| 提交 `node_modules`               | `.gitignore` 永久忽略；CI 使用 lockfile                             |
| `console.log` 当生产日志          | 使用 `pino` / `winston` / 项目 logger，结构化 + 分级                |
| 直接 `process.env.X`              | 集中在 `config.ts`，用 zod 校验并类型化                             |
| 阻塞事件循环（同步 fs / 大循环）  | 用 `fs.promises` / 分块处理；CPU 密集任务放 Worker Threads          |
| 忽略未处理 rejection              | 监听 `process.on('unhandledRejection')` 并报警 / 退出                |
| ESM/CJS 混用踩坑                  | 项目内统一一种模块系统；发布库用双产出工具                          |
| 测试依赖执行顺序 / 共享状态       | 每个测试独立 setup / teardown                                       |
| 库产物未声明 `exports` 字段       | 显式声明 `main` / `module` / `types` / `exports`，避免下游入口歧义 |
