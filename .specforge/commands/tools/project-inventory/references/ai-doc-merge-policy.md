# AI 文档采纳策略

> 当 `project-inventory` 检测到已有 AI 协作文档时的处理策略。

## 检测范围

- `AGENTS.md`（项目根目录）
- `CLAUDE.md`（项目根目录）
- `.cursor/rules/*.md`
- `.windsurf/rules/*.md`

## 交互模式（默认）

检测到任一 AI 文档时，逐文件展示三选一：

```
检测到已有 AI 协作文档：AGENTS.md（1823 行）

[1] 采纳（merge 要点到 context.md 对应段，原文件保留并在 inventory.md 引用）
[2] 忽略（本次不引用；后续可重新运行 project-inventory 重扫）
[3] 查看文件内容（展示后再决定）
```

### 采纳行为

- 提取文档中的技术栈、命名约定、架构规则等要点
- 以追加方式写入 `specforge/context/context.md` 对应段
- 在 `inventory.md` 中记录 `adopted: true` 与引用来源
- **不删除、不修改原文件**

### 忽略行为

- 在 `inventory.md` 中记录 `adopted: false`
- 不做任何文件操作

## 非交互模式（`--no-interactive` / `--json`）

- 所有 AI 文档的 `adopted` 字段写 `undefined`
- Markdown 渲染中以 ⚠️ 标红提示「未决：请以交互模式重新运行以处理 AI 文档」
- **不阻塞命令退出**

## 原则

1. **绝不默默覆盖**：用户已有的 AI 文档是其知识资产
2. **绝不强制采纳**：用户有权忽略
3. **可重复执行**：忽略后可随时重新运行 inventory 改变决定
