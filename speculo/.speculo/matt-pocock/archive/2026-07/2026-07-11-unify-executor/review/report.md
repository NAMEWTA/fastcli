# 代码审查报告 — 统一 Executor 重构

**固定点**: `0cc1408` → `dbf76fe`
**审查的文件**: `src/core/executor.ts`, `tests/core/executor.test.ts`, `src/cli/commands/run.ts`, `src/cli/menu.ts`

---

## 标准轴

### 硬性违规

**无。** 所有 CLAUDE.md 已记录标准均被遵守：
- 相对导入保留显式 `.js` 扩展名 ✓
- `commands` 值为 `string[]` ✓
- `src/core` 无 CLI/web 层依赖 ✓
- 调用方签名不变 ✓

### 判断性调用（Fowler 异味）

**1. Mysterious Name** — `tests/core/executor.test.ts:321`

测试名 `'n=1 时 n=0 返回 totalSteps: 0'` 实际测试 `executeCommandChain([])`（n=0），非 n=1 路径。名称误导。

**2. 需求 7.1 架构弱化** — `src/core/executor.ts`

`spawnOnce` 将命令打印责任委托给调用方（JSDoc："调用方负责在调用前打印命令"）。旧 `executeCommand` 在自身内部强制执行打印（不可绕过），新结构将不变量从原语层面降为模块内部约定。当前所有三条路径均正确打印，低严重性判断调用。

### 正向项

- 消除 ~40 行重复（Duplicated Code → 已修复）
- POSIX n>1 路径修复了从未打印命令清单的遗漏

**标准轴发现**: 0 硬性违规，2 判断性调用

---

## 规范轴

### 缺失或不完整

**1. n=1 statePath 防御性测试缺失**

规范测试决策要求验证「n=1 路径不创建临时 statePath 文件」，验收标准第 3 条重申。5 个 n=1 新增测试均未 mock `tmpdir()`/`randomUUID()`/`unlink()` 来验证。代码实现正确（n=1 分支不创建 statePath），但缺少防御性测试。

**2. spawnOnce 签名字段遗漏**

规范决策 2 定义签名为二参数 `spawnOnce(command, spawnImpl)`，实际实现为三参数 `spawnOnce(command, spawnImpl, language)`。`language` 为 ENOENT 错误 i18n 所必需，规范未登记。

### 超出范围

无。`run.ts`/`menu.ts` 注释修正属于必要的同步维护。

### 实现方式错误

无。所有分支正确汇聚于 `spawnOnce`，Windows 回退不再经过已删除的 `executeCommand`。

**规范轴发现**: 2 缺失（1 测试覆盖缺口 + 1 文档偏差），0 超出范围，0 实现错误

---

## 总结

| 轴 | 发现数 | 最严重问题 |
|----|--------|-----------|
| 标准 | 2（均为判断性调用） | 需求 7.1 不变量从原语层面弱化为约定 |
| 规范 | 2（测试缺口 + 文档偏差） | n=1 statePath 测试缺失 |

**下一步**: 两项均为低严重性，可在 finalize 前快速修复或记录为已知限制。未经要求不实施修复。
