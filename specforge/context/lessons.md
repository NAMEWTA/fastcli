# 跨 Change 失败知识库

> 本文件记录跨 change 复用的失败教训。条目编号格式：`L-NNN`，状态为 `active`、`superseded-by:L-NNN` 或 `archived`。

## 索引

| 编号 | 标题 | 关键词 | 状态 |
|------|------|--------|------|
| L-001 | NodeNext ESM 下 import 必须带 `.js` 后缀 | NodeNext, ESM, import, `.js` | active |
| L-002 | Release workflow 必须先 build 再 test | GitHub Actions, release, dist, clean checkout | active |
| L-003 | docs-sync state 不得引用缺失文档 | docs-sync, tracked_docs, broken links, specforge | active |

## 条目详情

### L-001 · NodeNext ESM 下 import 必须带 `.js` 后缀

- **首发 change**：2026-05-11-flow-kit-integration
- **上次复核日期**：2026-05-22
- **适用栈**：Node.js >= 18 / TypeScript / ESM
- **状态**：`active`
- **关键词**：NodeNext, `.js` 后缀, ESM 解析, import 报错

#### 问题场景

在 `"type": "module"` 项目中，源码写 `import './foo'` 或 `import './foo.ts'`，构建后由 Node.js 原生运行时加载时可能报 `ERR_MODULE_NOT_FOUND`。

#### 当前推荐做法

所有相对路径 import 统一写 `.js` 后缀，即使源文件是 `.ts`：

```typescript
import { loadRegistry } from './core/registry.js';
```

#### 何时重新评估

当项目改用不同模块系统，或 Node.js 对 TypeScript 源码直接运行的稳定语义改变时重新评估。

### L-002 · Release workflow 必须先 build 再 test

- **首发 change**：2026-05-22-release-build-before-tests
- **上次复核日期**：2026-05-22
- **适用栈**：GitHub Actions / pnpm / tsup / Vitest
- **状态**：`active`
- **关键词**：release, build, test, dist, clean checkout

#### 问题场景

release workflow 在 clean checkout 中如果先运行 `pnpm test`，依赖 `dist/index.js` 的 CLI 集成测试会因为构建产物不存在而失败。

#### 当前推荐做法

release workflow 固定顺序：

```bash
pnpm build
pnpm test
pnpm publish --access public --no-git-checks
```

CI 的普通 push / pull_request workflow 可以保持 test 与 build 都运行，但 release workflow 必须先构建。

#### 何时重新评估

当 CLI 集成测试不再依赖 `dist`，或测试流程显式在用例内构建临时产物时重新评估。

### L-003 · docs-sync state 不得引用缺失文档

- **首发 change**：2026-05-22-docs-sync-baseline
- **上次复核日期**：2026-05-22
- **适用栈**：docs-sync / Markdown 文档 / git diff
- **状态**：`active`
- **关键词**：docs-sync, tracked_docs, specforge, broken links

#### 问题场景

`.docs-sync-state.json.tracked_docs` 仍引用某些文档，但这些文件在后续提交中被删除或移动。此时 AGENTS、README 或 state 会产生断链，下一次 docs-sync 也无法判断这些文档是应删除、恢复还是从 tracked docs 中移除。

#### 当前推荐做法

每次 docs-sync 都要检查：

```bash
jq -r '.tracked_docs[]' .docs-sync-state.json
```

对每个 tracked doc 确认文件存在。若文件被有意删除，必须在同一次同步中：

1. 从 `.docs-sync-state.json.tracked_docs` 移除它。
2. 删除 README / AGENTS / CHANGELOG / specforge 中的引用。
3. 在 CHANGELOG 中说明文档结构变化。

若文件仍属于项目公开记忆，必须恢复并更新内容。

#### 何时重新评估

当 docs-sync state schema 支持显式的 moved/removed 文档记录，或项目不再使用 tracked docs 列表时重新评估。
