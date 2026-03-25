# FastCLI 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建一个 npm 全局 CLI 工具，支持命令别名和树状交互式工作流

**架构：** 单包 TypeScript 项目，使用 Commander.js 处理命令路由，@inquirer/prompts 处理交互式选择，核心模块包括 ConfigManager（配置管理）、TemplateEngine（变量替换）、WorkflowRunner（工作流引擎）、Executor（命令执行）

**技术栈：** Node.js 18+, TypeScript 5.x, pnpm, Commander.js, @inquirer/prompts, tsup, picocolors, vitest

**规格文档：** `docs/superpowers/specs/2026-03-25-fastcli-design.md`

---

## 文件结构

| 文件路径 | 职责 |
|----------|------|
| `package.json` | 项目配置、依赖、scripts |
| `tsconfig.json` | TypeScript 编译配置 |
| `tsup.config.ts` | 构建工具配置 |
| `src/types/index.ts` | 所有 TypeScript 类型定义 |
| `src/utils/logger.ts` | 彩色日志输出（info/success/error/preview） |
| `src/utils/path.ts` | 配置文件路径处理（跨平台 home 目录） |
| `src/core/template-engine.ts` | `{{var}}` 变量模板解析和替换 |
| `src/core/config-manager.ts` | 配置文件读/写/校验/初始化 |
| `src/core/name-resolver.ts` | 解析名称为 alias 或 workflow |
| `src/core/executor.ts` | Shell 命令执行、输出处理 |
| `src/core/workflow-runner.ts` | 工作流交互式步骤引擎 |
| `src/commands/config/init.ts` | `fastcli config init` 命令 |
| `src/commands/config/edit.ts` | `fastcli config edit` 命令 |
| `src/commands/config/show.ts` | `fastcli config show` 命令 |
| `src/commands/alias/add.ts` | `fastcli alias add` 命令 |
| `src/commands/alias/remove.ts` | `fastcli alias rm` 命令 |
| `src/commands/alias/list.ts` | `fastcli alias ls` 命令 |
| `src/commands/workflow/list.ts` | `fastcli workflow ls` 命令 |
| `src/commands/workflow/show.ts` | `fastcli workflow show` 命令 |
| `src/commands/run.ts` | 默认命令：运行别名或工作流 |
| `src/index.ts` | CLI 入口，Commander 程序定义 |
| `tests/core/template-engine.test.ts` | 模板引擎单元测试 |
| `tests/core/config-manager.test.ts` | 配置管理单元测试 |
| `tests/core/name-resolver.test.ts` | 名称解析单元测试 |
| `tests/core/workflow-runner.test.ts` | 工作流引擎单元测试 |
| `tests/commands/alias.test.ts` | 别名命令集成测试 |
| `tests/commands/config.test.ts` | 配置命令集成测试 |

---

## 任务 1：项目初始化

**文件：**
- 创建：`package.json`
- 创建：`tsconfig.json`
- 创建：`tsup.config.ts`
- 创建：`.gitignore`

- [ ] **步骤 1：初始化 pnpm 项目**

运行：
```bash
cd C:\wta\01-code\toolCode\fastcli
pnpm init
```

- [ ] **步骤 2：安装生产依赖**

运行：
```bash
pnpm add commander @inquirer/prompts picocolors
```

- [ ] **步骤 3：安装开发依赖**

运行：
```bash
pnpm add -D typescript tsup vitest @types/node
```

- [ ] **步骤 4：配置 package.json**

编辑 `package.json`：
```json
{
  "name": "fastcli",
  "version": "1.0.0",
  "description": "终端命令别名和交互式工作流管理工具",
  "type": "module",
  "bin": {
    "fastcli": "./dist/index.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "link": "pnpm build && pnpm link -g",
    "unlink": "pnpm unlink -g"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "cli",
    "alias",
    "workflow",
    "terminal",
    "command"
  ],
  "license": "MIT"
}
```

- [ ] **步骤 5：创建 tsconfig.json**

创建 `tsconfig.json`：
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **步骤 6：创建 tsup.config.ts**

创建 `tsup.config.ts`：
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  dts: true,
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

- [ ] **步骤 7：创建 .gitignore**

创建 `.gitignore`：
```
node_modules/
dist/
*.log
.DS_Store
coverage/
```

- [ ] **步骤 8：Commit 项目初始化**

运行：
```bash
git add .
git commit -m "chore: 初始化项目配置

- 配置 pnpm + TypeScript + tsup
- 添加 Commander.js, Inquirer, picocolors 依赖
- 配置 vitest 测试框架"
```

---

## 任务 2：类型定义

**文件：**
- 创建：`src/types/index.ts`
- 测试：无（纯类型定义）

- [ ] **步骤 1：创建目录结构**

运行：
```bash
mkdir -p src/types src/core src/commands/config src/commands/alias src/commands/workflow src/utils tests/core tests/commands
```

- [ ] **步骤 2：创建类型定义文件**

创建 `src/types/index.ts`：
```typescript
/**
 * 配置文件根结构
 */
export interface Config {
  aliases: Record<string, Alias>;
  workflows: Record<string, Workflow>;
}

/**
 * 命令别名
 */
export interface Alias {
  command: string;
  description?: string;
}

/**
 * 工作流定义
 */
export interface Workflow {
  description?: string;
  steps: WorkflowStep[];
}

/**
 * 工作流步骤
 */
export interface WorkflowStep {
  id: string;
  prompt: string;
  options: WorkflowOption[];
}

/**
 * 工作流选项
 */
export interface WorkflowOption {
  name: string;
  value?: string;
  next?: string;
  command?: string;
}

/**
 * 工作流运行时上下文
 */
export interface WorkflowContext {
  values: Record<string, string>;
}

/**
 * 名称解析结果
 */
export type ResolveResult =
  | { type: 'alias'; data: Alias }
  | { type: 'workflow'; data: Workflow };

/**
 * 命令执行结果
 */
export interface ExecResult {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * 配置校验结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 默认空配置
 */
export const DEFAULT_CONFIG: Config = {
  aliases: {},
  workflows: {},
};
```

- [ ] **步骤 3：Commit 类型定义**

运行：
```bash
git add .
git commit -m "feat(types): 添加核心类型定义

- Config, Alias, Workflow 数据结构
- WorkflowStep, WorkflowOption 工作流相关
- ResolveResult, ExecResult 运行时类型"
```

---

## 任务 3：工具函数 - Logger

**文件：**
- 创建：`src/utils/logger.ts`
- 测试：无（简单输出函数）

- [ ] **步骤 1：创建 logger.ts**

创建 `src/utils/logger.ts`：
```typescript
import pc from 'picocolors';

export const logger = {
  info(message: string): void {
    console.log(pc.blue('ℹ'), message);
  },

  success(message: string): void {
    console.log(pc.green('✓'), message);
  },

  error(message: string): void {
    console.error(pc.red('✗'), message);
  },

  warn(message: string): void {
    console.log(pc.yellow('⚠'), message);
  },

  preview(command: string): void {
    console.log(pc.cyan('→'), pc.dim('执行:'), command);
  },

  step(current: number, total: number, message: string): void {
    console.log(pc.dim(`[步骤 ${current}/${total}]`), message);
  },

  choice(message: string): void {
    console.log(pc.cyan('→'), pc.dim('选择:'), message);
  },
};
```

- [ ] **步骤 2：Commit logger**

运行：
```bash
git add src/utils/logger.ts
git commit -m "feat(utils): 添加彩色日志工具"
```

---

## 任务 4：工具函数 - Path

**文件：**
- 创建：`src/utils/path.ts`
- 测试：无（简单路径处理）

- [ ] **步骤 1：创建 path.ts**

创建 `src/utils/path.ts`：
```typescript
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * 获取配置目录路径
 * @returns ~/.fastcli/
 */
export function getConfigDir(): string {
  return join(homedir(), '.fastcli');
}

/**
 * 获取配置文件路径
 * @returns ~/.fastcli/config.json
 */
export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}
```

- [ ] **步骤 2：Commit path**

运行：
```bash
git add src/utils/path.ts
git commit -m "feat(utils): 添加配置路径工具"
```

---

## 任务 5：核心模块 - TemplateEngine (TDD)

**文件：**
- 创建：`src/core/template-engine.ts`
- 测试：`tests/core/template-engine.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `tests/core/template-engine.test.ts`：
```typescript
import { describe, it, expect } from 'vitest';
import { parseTemplate } from '../../src/core/template-engine.js';

describe('TemplateEngine', () => {
  describe('parseTemplate', () => {
    it('应该替换单个变量', () => {
      const result = parseTemplate('git add {{path}}', { path: 'src/' });
      expect(result).toBe('git add src/');
    });

    it('应该替换多个变量', () => {
      const result = parseTemplate(
        'git commit -m "{{type}}: {{message}}"',
        { type: 'feat', message: 'add feature' }
      );
      expect(result).toBe('git commit -m "feat: add feature"');
    });

    it('应该处理没有变量的模板', () => {
      const result = parseTemplate('git push', {});
      expect(result).toBe('git push');
    });

    it('应该处理缺失的变量（保留原样）', () => {
      const result = parseTemplate('git add {{path}}', {});
      expect(result).toBe('git add {{path}}');
    });

    it('应该处理带连字符的变量名', () => {
      const result = parseTemplate('{{select-account}}', { 'select-account': 'user1' });
      expect(result).toBe('user1');
    });
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm test tests/core/template-engine.test.ts`
预期：FAIL，报错 "Cannot find module"

- [ ] **步骤 3：编写最少实现代码**

创建 `src/core/template-engine.ts`：
```typescript
/**
 * 解析模板字符串，替换 {{variable}} 为上下文中的值
 * @param template - 包含 {{var}} 占位符的模板字符串
 * @param context - 变量名到值的映射
 * @returns 替换后的字符串
 */
export function parseTemplate(
  template: string,
  context: Record<string, string>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    return trimmedKey in context ? context[trimmedKey] : match;
  });
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test tests/core/template-engine.test.ts`
预期：PASS（5 个测试全部通过）

- [ ] **步骤 5：Commit**

运行：
```bash
git add src/core/template-engine.ts tests/core/template-engine.test.ts
git commit -m "feat(core): 添加模板引擎

- 支持 {{var}} 变量替换
- 支持多变量、连字符变量名
- 缺失变量保留原样"
```

---

## 任务 6：核心模块 - ConfigManager (TDD)

**文件：**
- 创建：`src/core/config-manager.ts`
- 测试：`tests/core/config-manager.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `tests/core/config-manager.test.ts`：
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadConfig,
  saveConfig,
  ensureConfigExists,
  validateConfig,
} from '../../src/core/config-manager.js';
import type { Config } from '../../src/types/index.js';

// 使用临时目录进行测试
const TEST_DIR = join(tmpdir(), 'fastcli-test-' + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, 'config.json');

describe('ConfigManager', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('ensureConfigExists', () => {
    it('应该创建默认配置文件', () => {
      ensureConfigExists(TEST_CONFIG_PATH);
      expect(existsSync(TEST_CONFIG_PATH)).toBe(true);
    });

    it('不应覆盖已存在的配置', () => {
      const existingConfig: Config = {
        aliases: { test: { command: 'echo test' } },
        workflows: {},
      };
      saveConfig(existingConfig, TEST_CONFIG_PATH);
      ensureConfigExists(TEST_CONFIG_PATH);

      const loaded = loadConfig(TEST_CONFIG_PATH);
      expect(loaded.aliases.test).toBeDefined();
    });
  });

  describe('loadConfig', () => {
    it('应该加载有效的配置文件', () => {
      const config: Config = {
        aliases: { gp: { command: 'git push' } },
        workflows: {},
      };
      saveConfig(config, TEST_CONFIG_PATH);

      const loaded = loadConfig(TEST_CONFIG_PATH);
      expect(loaded.aliases.gp.command).toBe('git push');
    });

    it('应该在文件不存在时抛出错误', () => {
      expect(() => loadConfig(TEST_CONFIG_PATH)).toThrow();
    });
  });

  describe('saveConfig', () => {
    it('应该保存配置并格式化 JSON', () => {
      const config: Config = {
        aliases: { test: { command: 'echo' } },
        workflows: {},
      };
      saveConfig(config, TEST_CONFIG_PATH);

      const loaded = loadConfig(TEST_CONFIG_PATH);
      expect(loaded).toEqual(config);
    });
  });

  describe('validateConfig', () => {
    it('应该验证有效配置', () => {
      const config: Config = {
        aliases: { gp: { command: 'git push' } },
        workflows: {
          test: {
            steps: [
              {
                id: 'step1',
                prompt: 'Select',
                options: [{ name: 'opt1', command: 'echo' }],
              },
            ],
          },
        },
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测名称冲突', () => {
      const config: Config = {
        aliases: { test: { command: 'echo' } },
        workflows: { test: { steps: [] } },
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('test');
    });
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm test tests/core/config-manager.test.ts`
预期：FAIL，报错 "Cannot find module"

- [ ] **步骤 3：编写实现代码**

创建 `src/core/config-manager.ts`：
```typescript
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getConfigPath } from '../utils/path.js';
import { DEFAULT_CONFIG, type Config, type ValidationResult } from '../types/index.js';

/**
 * 加载配置文件
 * @param configPath - 配置文件路径（默认使用标准路径）
 */
export function loadConfig(configPath: string = getConfigPath()): Config {
  if (!existsSync(configPath)) {
    throw new Error(`配置文件不存在: ${configPath}\n请运行 fastcli config init 初始化`);
  }

  const content = readFileSync(configPath, 'utf-8');
  try {
    return JSON.parse(content) as Config;
  } catch {
    throw new Error(`配置文件格式错误: ${configPath}`);
  }
}

/**
 * 保存配置文件
 * @param config - 配置对象
 * @param configPath - 配置文件路径（默认使用标准路径）
 */
export function saveConfig(
  config: Config,
  configPath: string = getConfigPath()
): void {
  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 确保配置文件存在，不存在则创建默认配置
 * @param configPath - 配置文件路径（默认使用标准路径）
 */
export function ensureConfigExists(configPath: string = getConfigPath()): void {
  if (!existsSync(configPath)) {
    saveConfig(DEFAULT_CONFIG, configPath);
  }
}

/**
 * 校验配置文件
 * @param config - 配置对象
 */
export function validateConfig(config: Config): ValidationResult {
  const errors: string[] = [];

  // 检查 aliases 和 workflows 名称冲突
  const aliasNames = Object.keys(config.aliases);
  const workflowNames = Object.keys(config.workflows);
  const conflicts = aliasNames.filter((name) => workflowNames.includes(name));

  if (conflicts.length > 0) {
    errors.push(`名称冲突: ${conflicts.join(', ')} 同时存在于 aliases 和 workflows 中`);
  }

  // 检查工作流步骤引用是否有效
  for (const [name, workflow] of Object.entries(config.workflows)) {
    const stepIds = new Set(workflow.steps.map((s) => s.id));
    for (const step of workflow.steps) {
      for (const option of step.options) {
        if (option.next && !stepIds.has(option.next)) {
          errors.push(`工作流 "${name}" 步骤 "${step.id}" 引用了不存在的步骤 "${option.next}"`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test tests/core/config-manager.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

运行：
```bash
git add src/core/config-manager.ts tests/core/config-manager.test.ts
git commit -m "feat(core): 添加配置管理器

- 支持加载/保存/初始化配置
- 校验名称冲突和步骤引用"
```

---

## 任务 7：核心模块 - NameResolver (TDD)

**文件：**
- 创建：`src/core/name-resolver.ts`
- 测试：`tests/core/name-resolver.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `tests/core/name-resolver.test.ts`：
```typescript
import { describe, it, expect } from 'vitest';
import { resolveName, isNameAvailable } from '../../src/core/name-resolver.js';
import type { Config } from '../../src/types/index.js';

const mockConfig: Config = {
  aliases: {
    gp: { command: 'git push' },
  },
  workflows: {
    deploy: {
      steps: [
        { id: 'env', prompt: '选择环境', options: [{ name: 'prod', command: 'deploy prod' }] },
      ],
    },
  },
};

describe('NameResolver', () => {
  describe('resolveName', () => {
    it('应该解析别名', () => {
      const result = resolveName('gp', mockConfig);
      expect(result?.type).toBe('alias');
      expect(result?.data.command).toBe('git push');
    });

    it('应该解析工作流', () => {
      const result = resolveName('deploy', mockConfig);
      expect(result?.type).toBe('workflow');
    });

    it('应该对不存在的名称返回 null', () => {
      const result = resolveName('unknown', mockConfig);
      expect(result).toBeNull();
    });
  });

  describe('isNameAvailable', () => {
    it('应该检测已使用的名称', () => {
      expect(isNameAvailable('gp', mockConfig)).toBe(false);
      expect(isNameAvailable('deploy', mockConfig)).toBe(false);
    });

    it('应该检测可用的名称', () => {
      expect(isNameAvailable('newname', mockConfig)).toBe(true);
    });
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm test tests/core/name-resolver.test.ts`
预期：FAIL

- [ ] **步骤 3：编写实现代码**

创建 `src/core/name-resolver.ts`：
```typescript
import type { Config, ResolveResult } from '../types/index.js';

/**
 * 解析名称，判断是别名还是工作流
 * @param name - 用户输入的名称
 * @param config - 配置对象
 * @returns 解析结果，不存在返回 null
 */
export function resolveName(name: string, config: Config): ResolveResult | null {
  if (name in config.aliases) {
    return { type: 'alias', data: config.aliases[name] };
  }

  if (name in config.workflows) {
    return { type: 'workflow', data: config.workflows[name] };
  }

  return null;
}

/**
 * 检查名称是否可用（未被 alias 或 workflow 占用）
 * @param name - 要检查的名称
 * @param config - 配置对象
 */
export function isNameAvailable(name: string, config: Config): boolean {
  return !(name in config.aliases) && !(name in config.workflows);
}

/**
 * 获取所有已使用的名称
 * @param config - 配置对象
 */
export function getAllNames(config: Config): string[] {
  return [...Object.keys(config.aliases), ...Object.keys(config.workflows)];
}

/**
 * 查找相似名称（用于错误提示）
 * @param name - 用户输入的名称
 * @param config - 配置对象
 */
export function findSimilarNames(name: string, config: Config): string[] {
  const allNames = getAllNames(config);
  return allNames.filter(
    (n) => n.includes(name) || name.includes(n) || levenshteinDistance(n, name) <= 2
  );
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test tests/core/name-resolver.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

运行：
```bash
git add src/core/name-resolver.ts tests/core/name-resolver.test.ts
git commit -m "feat(core): 添加名称解析器

- 支持解析别名和工作流
- 提供名称可用性检查
- 支持相似名称建议"
```

---

## 任务 8：核心模块 - Executor

**文件：**
- 创建：`src/core/executor.ts`
- 测试：无（涉及真实 shell 执行，集成测试覆盖）

- [ ] **步骤 1：创建 executor.ts**

创建 `src/core/executor.ts`：
```typescript
import { spawn } from 'node:child_process';
import { logger } from '../utils/logger.js';
import type { ExecResult } from '../types/index.js';

/**
 * 执行 shell 命令
 * @param command - 要执行的命令
 * @returns 执行结果
 */
export async function executeCommand(command: string): Promise<ExecResult> {
  logger.preview(command);

  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/sh';
    const shellArg = isWindows ? '/c' : '-c';

    const child = spawn(shell, [shellArg, command], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      const success = code === 0;
      if (success) {
        logger.success('执行完成');
      } else {
        logger.error(`执行失败 (退出码: ${code})`);
      }

      resolve({
        success,
        code: code ?? 1,
        stdout,
        stderr,
      });
    });

    child.on('error', (err) => {
      logger.error(`执行出错: ${err.message}`);
      resolve({
        success: false,
        code: 1,
        stdout,
        stderr: err.message,
      });
    });
  });
}
```

- [ ] **步骤 2：Commit**

运行：
```bash
git add src/core/executor.ts
git commit -m "feat(core): 添加命令执行器

- 支持跨平台 shell 执行
- 实时输出命令结果
- 返回执行状态和输出"
```

---

## 任务 9：核心模块 - WorkflowRunner (TDD)

**文件：**
- 创建：`src/core/workflow-runner.ts`
- 测试：`tests/core/workflow-runner.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `tests/core/workflow-runner.test.ts`：
```typescript
import { describe, it, expect } from 'vitest';
import { findStepById, buildFinalCommand, calculateTotalSteps } from '../../src/core/workflow-runner.js';
import type { Workflow } from '../../src/types/index.js';

const mockWorkflow: Workflow = {
  description: '测试工作流',
  steps: [
    {
      id: 'step1',
      prompt: '步骤1',
      options: [
        { name: '选项A', value: 'a', next: 'step2' },
        { name: '选项B', value: 'b', command: 'echo b' },
      ],
    },
    {
      id: 'step2',
      prompt: '步骤2',
      options: [{ name: '完成', command: 'echo {{step1}}' }],
    },
  ],
};

describe('WorkflowRunner', () => {
  describe('findStepById', () => {
    it('应该找到存在的步骤', () => {
      const step = findStepById(mockWorkflow, 'step1');
      expect(step?.prompt).toBe('步骤1');
    });

    it('应该对不存在的步骤返回 undefined', () => {
      const step = findStepById(mockWorkflow, 'nonexistent');
      expect(step).toBeUndefined();
    });
  });

  describe('buildFinalCommand', () => {
    it('应该替换变量', () => {
      const cmd = buildFinalCommand('echo {{step1}}', { step1: 'hello' });
      expect(cmd).toBe('echo hello');
    });
  });

  describe('calculateTotalSteps', () => {
    it('应该计算最短路径长度', () => {
      // step1 -> step2 = 2 步
      // step1 (选项B直接结束) = 1 步
      const total = calculateTotalSteps(mockWorkflow, 'step1');
      expect(total).toBeGreaterThanOrEqual(1);
    });
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm test tests/core/workflow-runner.test.ts`
预期：FAIL

- [ ] **步骤 3：编写实现代码**

创建 `src/core/workflow-runner.ts`：
```typescript
import { select } from '@inquirer/prompts';
import { logger } from '../utils/logger.js';
import { parseTemplate } from './template-engine.js';
import { executeCommand } from './executor.js';
import type { Workflow, WorkflowStep, WorkflowContext } from '../types/index.js';

/**
 * 根据 ID 查找步骤
 */
export function findStepById(workflow: Workflow, id: string): WorkflowStep | undefined {
  return workflow.steps.find((s) => s.id === id);
}

/**
 * 构建最终命令（替换变量）
 */
export function buildFinalCommand(
  command: string,
  context: Record<string, string>
): string {
  return parseTemplate(command, context);
}

/**
 * 计算从某步骤开始的最短路径长度（用于进度显示）
 */
export function calculateTotalSteps(workflow: Workflow, startId: string): number {
  const visited = new Set<string>();
  let minSteps = Infinity;

  function traverse(stepId: string, depth: number): void {
    if (visited.has(stepId)) return;
    visited.add(stepId);

    const step = findStepById(workflow, stepId);
    if (!step) return;

    for (const option of step.options) {
      if (option.command) {
        minSteps = Math.min(minSteps, depth);
      } else if (option.next) {
        traverse(option.next, depth + 1);
      }
    }

    visited.delete(stepId);
  }

  traverse(startId, 1);
  return minSteps === Infinity ? workflow.steps.length : minSteps;
}

/**
 * 运行工作流
 */
export async function runWorkflow(workflow: Workflow): Promise<void> {
  if (workflow.steps.length === 0) {
    logger.error('工作流没有步骤');
    return;
  }

  const context: WorkflowContext = { values: {} };
  let currentStep = workflow.steps[0];
  let stepIndex = 1;
  const estimatedTotal = calculateTotalSteps(workflow, currentStep.id);

  console.log();
  if (workflow.description) {
    logger.info(workflow.description);
  }

  while (true) {
    logger.step(stepIndex, estimatedTotal, currentStep.prompt);

    const choices = currentStep.options.map((opt, index) => ({
      name: `${index + 1}. ${opt.name}`,
      value: opt,
    }));

    try {
      const selected = await select({
        message: '请选择',
        choices,
      });

      // 记录选择的值
      const value = selected.value ?? selected.name;
      context.values[currentStep.id] = value;
      logger.choice(selected.name);

      // 如果有 command，执行并结束
      if (selected.command) {
        const finalCommand = buildFinalCommand(selected.command, context.values);
        console.log();
        await executeCommand(finalCommand);
        console.log();
        logger.success('工作流完成');
        return;
      }

      // 如果有 next，跳转到下一步
      if (selected.next) {
        const nextStep = findStepById(workflow, selected.next);
        if (!nextStep) {
          logger.error(`找不到步骤: ${selected.next}`);
          return;
        }
        currentStep = nextStep;
        stepIndex++;
        console.log();
      } else {
        // 既没有 command 也没有 next，工作流配置错误
        logger.error('工作流配置错误：选项缺少 command 或 next');
        return;
      }
    } catch {
      // 用户按 Ctrl+C 退出
      console.log();
      logger.warn('已取消');
      return;
    }
  }
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test tests/core/workflow-runner.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

运行：
```bash
git add src/core/workflow-runner.ts tests/core/workflow-runner.test.ts
git commit -m "feat(core): 添加工作流引擎

- 支持多步骤交互选择
- 支持条件分支跳转
- 支持变量模板替换
- 显示步骤进度"
```

---

## 任务 10：命令 - config init/edit/show

**文件：**
- 创建：`src/commands/config/init.ts`
- 创建：`src/commands/config/edit.ts`
- 创建：`src/commands/config/show.ts`
- 创建：`src/commands/config/index.ts`

- [ ] **步骤 1：创建 config/init.ts**

创建 `src/commands/config/init.ts`：
```typescript
import { existsSync } from 'node:fs';
import { getConfigPath } from '../../utils/path.js';
import { ensureConfigExists } from '../../core/config-manager.js';
import { logger } from '../../utils/logger.js';

export function configInit(): void {
  const configPath = getConfigPath();

  if (existsSync(configPath)) {
    logger.warn(`配置文件已存在: ${configPath}`);
    return;
  }

  ensureConfigExists(configPath);
  logger.success(`配置文件已创建: ${configPath}`);
}
```

- [ ] **步骤 2：创建 config/edit.ts**

创建 `src/commands/config/edit.ts`：
```typescript
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { getConfigPath } from '../../utils/path.js';
import { logger } from '../../utils/logger.js';

export function configEdit(): void {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.error(`配置文件不存在: ${configPath}`);
    logger.info('请先运行: fastcli config init');
    return;
  }

  const isWindows = process.platform === 'win32';
  const editor = process.env.EDITOR || (isWindows ? 'notepad' : 'vi');

  logger.info(`使用 ${editor} 打开配置文件...`);

  const child = spawn(editor, [configPath], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (err) => {
    logger.error(`无法打开编辑器: ${err.message}`);
  });
}
```

- [ ] **步骤 3：创建 config/show.ts**

创建 `src/commands/config/show.ts`：
```typescript
import { existsSync, readFileSync } from 'node:fs';
import { getConfigPath } from '../../utils/path.js';
import { logger } from '../../utils/logger.js';

export function configShow(): void {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.error(`配置文件不存在: ${configPath}`);
    logger.info('请先运行: fastcli config init');
    return;
  }

  logger.info(`配置文件路径: ${configPath}`);
  console.log();
  console.log(readFileSync(configPath, 'utf-8'));
}
```

- [ ] **步骤 4：创建 config/index.ts**

创建 `src/commands/config/index.ts`：
```typescript
export { configInit } from './init.js';
export { configEdit } from './edit.js';
export { configShow } from './show.js';
```

- [ ] **步骤 5：Commit**

运行：
```bash
git add src/commands/config/
git commit -m "feat(commands): 添加 config 命令组

- config init: 初始化配置文件
- config edit: 编辑配置文件
- config show: 显示配置内容"
```

---

## 任务 11：命令 - alias add/rm/ls

**文件：**
- 创建：`src/commands/alias/add.ts`
- 创建：`src/commands/alias/remove.ts`
- 创建：`src/commands/alias/list.ts`
- 创建：`src/commands/alias/index.ts`

- [ ] **步骤 1：创建 alias/add.ts**

创建 `src/commands/alias/add.ts`：
```typescript
import { loadConfig, saveConfig, ensureConfigExists } from '../../core/config-manager.js';
import { isNameAvailable } from '../../core/name-resolver.js';
import { logger } from '../../utils/logger.js';
import { getConfigPath } from '../../utils/path.js';

export function aliasAdd(
  name: string,
  command: string,
  options: { description?: string }
): void {
  const configPath = getConfigPath();
  ensureConfigExists(configPath);

  const config = loadConfig(configPath);

  if (!isNameAvailable(name, config)) {
    logger.error(`名称 "${name}" 已被使用`);
    return;
  }

  config.aliases[name] = {
    command,
    description: options.description,
  };

  saveConfig(config, configPath);
  logger.success(`别名已添加: ${name} → ${command}`);
}
```

- [ ] **步骤 2：创建 alias/remove.ts**

创建 `src/commands/alias/remove.ts`：
```typescript
import { loadConfig, saveConfig } from '../../core/config-manager.js';
import { logger } from '../../utils/logger.js';
import { getConfigPath } from '../../utils/path.js';
import { existsSync } from 'node:fs';

export function aliasRemove(name: string): void {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.error('配置文件不存在，请先运行: fastcli config init');
    return;
  }

  const config = loadConfig(configPath);

  if (!(name in config.aliases)) {
    logger.error(`别名 "${name}" 不存在`);
    return;
  }

  delete config.aliases[name];
  saveConfig(config, configPath);
  logger.success(`别名已删除: ${name}`);
}
```

- [ ] **步骤 3：创建 alias/list.ts**

创建 `src/commands/alias/list.ts`：
```typescript
import { existsSync } from 'node:fs';
import { loadConfig } from '../../core/config-manager.js';
import { logger } from '../../utils/logger.js';
import { getConfigPath } from '../../utils/path.js';
import pc from 'picocolors';

export function aliasList(): void {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.error('配置文件不存在，请先运行: fastcli config init');
    return;
  }

  const config = loadConfig(configPath);
  const aliases = Object.entries(config.aliases);

  if (aliases.length === 0) {
    logger.info('暂无别名');
    return;
  }

  console.log();
  console.log(pc.bold('别名列表:'));
  console.log();

  for (const [name, alias] of aliases) {
    console.log(`  ${pc.cyan(name)} → ${alias.command}`);
    if (alias.description) {
      console.log(`    ${pc.dim(alias.description)}`);
    }
  }
  console.log();
}
```

- [ ] **步骤 4：创建 alias/index.ts**

创建 `src/commands/alias/index.ts`：
```typescript
export { aliasAdd } from './add.js';
export { aliasRemove } from './remove.js';
export { aliasList } from './list.js';
```

- [ ] **步骤 5：Commit**

运行：
```bash
git add src/commands/alias/
git commit -m "feat(commands): 添加 alias 命令组

- alias add: 添加新别名
- alias rm: 删除别名
- alias ls: 列出所有别名"
```

---

## 任务 12：命令 - workflow ls/show

**文件：**
- 创建：`src/commands/workflow/list.ts`
- 创建：`src/commands/workflow/show.ts`
- 创建：`src/commands/workflow/index.ts`

- [ ] **步骤 1：创建 workflow/list.ts**

创建 `src/commands/workflow/list.ts`：
```typescript
import { existsSync } from 'node:fs';
import { loadConfig } from '../../core/config-manager.js';
import { logger } from '../../utils/logger.js';
import { getConfigPath } from '../../utils/path.js';
import pc from 'picocolors';

export function workflowList(): void {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.error('配置文件不存在，请先运行: fastcli config init');
    return;
  }

  const config = loadConfig(configPath);
  const workflows = Object.entries(config.workflows);

  if (workflows.length === 0) {
    logger.info('暂无工作流');
    return;
  }

  console.log();
  console.log(pc.bold('工作流列表:'));
  console.log();

  for (const [name, workflow] of workflows) {
    const stepCount = workflow.steps.length;
    console.log(`  ${pc.cyan(name)} (${stepCount} 步)`);
    if (workflow.description) {
      console.log(`    ${pc.dim(workflow.description)}`);
    }
  }
  console.log();
}
```

- [ ] **步骤 2：创建 workflow/show.ts**

创建 `src/commands/workflow/show.ts`：
```typescript
import { existsSync } from 'node:fs';
import { loadConfig } from '../../core/config-manager.js';
import { logger } from '../../utils/logger.js';
import { getConfigPath } from '../../utils/path.js';
import pc from 'picocolors';

export function workflowShow(name: string): void {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.error('配置文件不存在，请先运行: fastcli config init');
    return;
  }

  const config = loadConfig(configPath);

  if (!(name in config.workflows)) {
    logger.error(`工作流 "${name}" 不存在`);
    return;
  }

  const workflow = config.workflows[name];

  console.log();
  console.log(pc.bold(`工作流: ${name}`));
  if (workflow.description) {
    console.log(pc.dim(workflow.description));
  }
  console.log();

  for (const step of workflow.steps) {
    console.log(`${pc.cyan('●')} ${pc.bold(step.id)}: ${step.prompt}`);

    for (const option of step.options) {
      const arrow = option.next ? `→ ${pc.yellow(option.next)}` : '';
      const cmd = option.command ? `→ ${pc.green(option.command)}` : '';
      console.log(`  └─ ${option.name} ${arrow}${cmd}`);
    }
    console.log();
  }
}
```

- [ ] **步骤 3：创建 workflow/index.ts**

创建 `src/commands/workflow/index.ts`：
```typescript
export { workflowList } from './list.js';
export { workflowShow } from './show.js';
```

- [ ] **步骤 4：Commit**

运行：
```bash
git add src/commands/workflow/
git commit -m "feat(commands): 添加 workflow 命令组

- workflow ls: 列出所有工作流
- workflow show: 显示工作流结构"
```

---

## 任务 13：命令 - run (默认命令)

**文件：**
- 创建：`src/commands/run.ts`

- [ ] **步骤 1：创建 run.ts**

创建 `src/commands/run.ts`：
```typescript
import { existsSync } from 'node:fs';
import { loadConfig } from '../core/config-manager.js';
import { resolveName, findSimilarNames } from '../core/name-resolver.js';
import { executeCommand } from '../core/executor.js';
import { runWorkflow } from '../core/workflow-runner.js';
import { logger } from '../utils/logger.js';
import { getConfigPath } from '../utils/path.js';

export async function run(name: string): Promise<void> {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.error('配置文件不存在');
    logger.info('请先运行: fastcli config init');
    return;
  }

  const config = loadConfig(configPath);
  const result = resolveName(name, config);

  if (!result) {
    logger.error(`未找到: ${name}`);

    const similar = findSimilarNames(name, config);
    if (similar.length > 0) {
      logger.info(`你是否想要: ${similar.join(', ')}？`);
    }
    return;
  }

  if (result.type === 'alias') {
    console.log();
    await executeCommand(result.data.command);
  } else {
    await runWorkflow(result.data);
  }
}
```

- [ ] **步骤 2：Commit**

运行：
```bash
git add src/commands/run.ts
git commit -m "feat(commands): 添加 run 命令

- 统一入口运行别名或工作流
- 支持相似名称建议"
```

---

## 任务 14：CLI 入口

**文件：**
- 创建：`src/index.ts`

- [ ] **步骤 1：创建 index.ts**

创建 `src/index.ts`：
```typescript
import { Command } from 'commander';
import { configInit, configEdit, configShow } from './commands/config/index.js';
import { aliasAdd, aliasRemove, aliasList } from './commands/alias/index.js';
import { workflowList, workflowShow } from './commands/workflow/index.js';
import { run } from './commands/run.js';

const program = new Command();

program
  .name('fastcli')
  .description('终端命令别名和交互式工作流管理工具')
  .version('1.0.0');

// config 命令组
const configCmd = program.command('config').description('配置管理');

configCmd
  .command('init')
  .description('初始化配置文件')
  .action(configInit);

configCmd
  .command('edit')
  .description('编辑配置文件')
  .action(configEdit);

configCmd
  .command('show')
  .description('显示配置内容')
  .action(configShow);

// alias 命令组
const aliasCmd = program.command('alias').description('别名管理');

aliasCmd
  .command('add <name> <command>')
  .description('添加新别名')
  .option('-d, --description <desc>', '别名描述')
  .action(aliasAdd);

aliasCmd
  .command('rm <name>')
  .description('删除别名')
  .action(aliasRemove);

aliasCmd
  .command('ls')
  .description('列出所有别名')
  .action(aliasList);

// workflow 命令组
const workflowCmd = program.command('workflow').description('工作流管理');

workflowCmd
  .command('ls')
  .description('列出所有工作流')
  .action(workflowList);

workflowCmd
  .command('show <name>')
  .description('显示工作流结构')
  .action(workflowShow);

// 默认命令：运行别名或工作流
program
  .argument('[name]', '别名或工作流名称')
  .action(async (name?: string) => {
    if (!name) {
      program.help();
      return;
    }
    await run(name);
  });

program.parse();
```

- [ ] **步骤 2：Commit**

运行：
```bash
git add src/index.ts
git commit -m "feat: 添加 CLI 入口

- 注册所有子命令
- 配置 Commander.js 程序"
```

---

## 任务 15：构建和本地测试

**文件：** 无新增

- [ ] **步骤 1：构建项目**

运行：`pnpm build`
预期：dist/index.js 生成成功

- [ ] **步骤 2：本地全局安装**

运行：`pnpm link -g`
预期：fastcli 命令可用

- [ ] **步骤 3：测试 config init**

运行：`fastcli config init`
预期：创建 ~/.fastcli/config.json

- [ ] **步骤 4：测试 alias 命令**

运行：
```bash
fastcli alias add gp "git push" -d "推送代码"
fastcli alias ls
```
预期：显示添加的别名

- [ ] **步骤 5：测试运行别名**

运行：`fastcli gp`
预期：显示 "→ 执行: git push" 并执行

- [ ] **步骤 6：运行全部测试**

运行：`pnpm test`
预期：所有测试通过

- [ ] **步骤 7：最终 Commit**

运行：
```bash
git add .
git commit -m "feat: FastCLI v1.0.0 完成

- 命令别名功能
- 树状工作流引擎
- 交互式步骤选择
- 变量模板替换"
```

---

## 任务 16：文档

**文件：**
- 创建：`README.md`

- [ ] **步骤 1：创建 README.md**

创建 `README.md`：
```markdown
# FastCLI

终端命令别名和交互式工作流管理工具。

## 安装

```bash
npm install -g fastcli
```

## 快速开始

```bash
# 初始化配置
fastcli config init

# 添加别名
fastcli alias add gp "git push" -d "推送代码"

# 运行别名
fastcli gp

# 列出别名
fastcli alias ls
```

## 工作流

编辑配置文件添加工作流：

```bash
fastcli config edit
```

示例工作流配置：

```json
{
  "workflows": {
    "deploy": {
      "description": "部署流程",
      "steps": [
        {
          "id": "env",
          "prompt": "选择环境",
          "options": [
            { "name": "开发环境", "value": "dev", "next": "confirm" },
            { "name": "生产环境", "value": "prod", "next": "confirm" }
          ]
        },
        {
          "id": "confirm",
          "prompt": "确认部署",
          "options": [
            { "name": "部署", "command": "deploy --env={{env}}" },
            { "name": "取消" }
          ]
        }
      ]
    }
  }
}
```

运行工作流：

```bash
fastcli deploy
```

## 命令

| 命令 | 描述 |
|------|------|
| `fastcli <name>` | 运行别名或工作流 |
| `fastcli alias add <name> <cmd>` | 添加别名 |
| `fastcli alias rm <name>` | 删除别名 |
| `fastcli alias ls` | 列出别名 |
| `fastcli workflow ls` | 列出工作流 |
| `fastcli workflow show <name>` | 显示工作流结构 |
| `fastcli config init` | 初始化配置 |
| `fastcli config edit` | 编辑配置 |
| `fastcli config show` | 显示配置 |

## License

MIT
```

- [ ] **步骤 2：Commit**

运行：
```bash
git add README.md
git commit -m "docs: 添加 README"
```

---

## 检查点

完成所有任务后，验证：

1. [ ] `pnpm test` - 所有测试通过
2. [ ] `pnpm build` - 构建成功
3. [ ] `fastcli --help` - 显示帮助信息
4. [ ] `fastcli alias add test "echo test"` - 添加别名成功
5. [ ] `fastcli test` - 执行别名成功
6. [ ] 手动添加工作流配置，`fastcli <workflow>` - 交互式选择正常
