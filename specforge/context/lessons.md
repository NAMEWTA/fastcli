# 跨 Change 失败知识库（LESSONS）

> 本文件是项目级常驻知识的 **LESSONS 层**，记录跨 change 的失败教训与经验沉淀。
> 由 `specforge init` 首建模板；后续由 `evolution-retrospect` Step 2.3 提名新增条目。
> 条目编号格式：`L-NNN`（三位数字补零，单调递增，跨 change 共享编号空间）。
> 新增条目需通过 4 条件过滤：调试时间 > 30 分钟 ∧ 错因不局限本任务 ∧ 6 个月内可能再遇 ∧ 非 ADR 能记。

---

## 索引

| 编号 | 标题 | 关键词 | 状态 |
|------|------|--------|------|
| L-001 | NodeNext ESM 下 import 必须带 .js 后缀 | NodeNext, .js 后缀, ESM 解析, import 报错 | active |

---

## 条目详情

### L-001 · NodeNext ESM 下 import 必须带 .js 后缀

- **首发 change**：2026-05-11-flow-kit-integration
- **上次复核日期**：2026-05-11
- **适用栈**：Node.js ≥ 18 / TypeScript moduleResolution: NodeNext / ESM
- **状态**：`active`
- **关键词**：NodeNext, .js 后缀, ESM 解析, import 报错

#### 问题场景

在 `tsconfig.json` 设置 `"moduleResolution": "NodeNext"` 且 `"type": "module"` 的项目中，TypeScript 源码中 `import './foo'` 或 `import './foo.ts'` 在编译后运行时报 `ERR_MODULE_NOT_FOUND`。IDE 无红线提示，tsc 编译也不报错，但 `node dist/index.js` 启动即崩溃。

#### 当时尝试的方案

1. 在 `tsconfig.json` 中切换 `moduleResolution` 为 `bundler` 模式
2. 在 `package.json` 中移除 `"type": "module"` 改回 CJS
3. 使用 `ts-node --esm` 直接运行 `.ts` 源文件绕过编译

#### 为什么不行

- 方案 1：`bundler` 模式下 Node.js 原生运行时仍然要求显式后缀，只是 tsc 不再报错而已，运行时问题依旧
- 方案 2：回退 CJS 会破坏已有的 top-level await 和 ESM-only 依赖（如 `chalk@5`、`execa@7`）
- 方案 3：`ts-node --esm` 在 Node.js ≥ 20 存在兼容性问题且不适合生产部署

#### 当前推荐做法

所有相对路径 import 统一带 `.js` 后缀（即使源文件是 `.ts`）：

```typescript
// ✅ 正确写法
import { logger } from './utils/logger.js';
import { ScaffoldService } from './services/scaffold-service.js';

// ❌ 错误写法（运行时 ERR_MODULE_NOT_FOUND）
import { logger } from './utils/logger';
import { ScaffoldService } from './services/scaffold-service.ts';
```

配合 ESLint 规则 `import/extensions: ['error', 'always']` 在 CI 阶段拦截遗漏。

#### 何时重新评估

当 Node.js 原生支持 TypeScript 文件直接 import（如 `--experimental-strip-types` 稳定化）或 `moduleResolution: "NodeNext"` 语义变更不再要求显式后缀时，重新评估本条目是否应标记为 `archived`。

---

<!-- 新增条目请遵循以下模板：

### L-NNN · <标题>

- **首发 change**：<change-id>
- **上次复核日期**：<YYYY-MM-DD>
- **适用栈**：<运行时 / 语言 / 框架版本>
- **状态**：`active` | `superseded-by:L-NNN` | `archived`
- **关键词**：<关键词1>, <关键词2>, ...

#### 问题场景
<触发条件；能被未来 grep 命中>

#### 当时尝试的方案
1. <方案 A：具体动作>
2. <方案 B：具体动作>

#### 为什么不行
- <方案 A 失败原因>
- <方案 B 失败原因>

#### 当前推荐做法
<具体做法；最好含代码片段或引用到 ADR>

#### 何时重新评估
<触发重新评估的信号>

-->
