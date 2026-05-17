# 7 类信号详表

> 本文档定义 `project-inventory` 扫描产出的 7 类信号字段与边界约束。

## 1. 技术栈（techStack）

| 字段 | 类型 | 说明 |
|------|------|------|
| ecosystem | enum | `node` / `python` / `go` / `rust` / `java` / `other` |
| manifest | string | 清单文件路径（如 `package.json`） |
| runtime | string? | 运行时版本约束（如 `Node >= 24`） |
| packageManager | string? | 包管理器（如 `pnpm`） |

支持多生态系统共存（monorepo 场景）。

## 2. 命名约定（naming）

| 字段 | 类型 | 说明 |
|------|------|------|
| filename | enum | `kebab-case` / `snake_case` / `camelCase` / `PascalCase` / `mixed` |
| identifier | enum | 同上 |
| sampleSize | number | 采样文件数（上限 50） |

判定规则：占比 > 60% 的风格为主流；否则标记 `mixed`。

## 3. 既有抽象索引（existingAbstractions）

| 字段 | 类型 | 说明 |
|------|------|------|
| kind | enum | `service` / `controller` / `repo` / `util` / `model` / `other` |
| name | string | 模块名称 |
| path | string | 相对路径 |

上限 200 条。超出时按目录深度优先截断并在产物中标注 `[truncated]`。

## 4. AI 文档（aiDocs）

| 字段 | 类型 | 说明 |
|------|------|------|
| path | string | 文件相对路径 |
| adopted | boolean? | `true`=已采纳 / `false`=已忽略 / `undefined`=未决 |

检测路径：`AGENTS.md`、`CLAUDE.md`、`.cursor/rules/*.md`、`.windsurf/rules/*.md`。

## 5. 目录结构（directoryLayout）

字符串数组，记录根目录前两层非忽略目录。忽略列表：`node_modules`、`.git`、`dist`、`build`、`__pycache__`、`target`。

## 6. 测试框架（testFrameworks）

字符串数组，记录检测到的测试框架名称。如 `["vitest", "playwright"]`。

## 7. 禁动清单（forbidden）

字符串数组，初始为空。由 `codebase-health` 发现未用依赖经用户确认后回填。格式为路径或包名。
