# 领域文档

工程 skills 在探索代码库时应如何使用该仓库的领域文档。

## 布局：单上下文

本文件描述的路径均为相对于 `{state_root}/knowledge/` 的逻辑路径，实际读写由 persistence 层映射到状态命名空间（`speculo/.speculo/<workflow>/knowledge/`）下，绝不写入项目根目录。

```
knowledge/
├── CONTEXT.md
├── adr/
│   └── NNNN-<slug>.md
└── ...
```

## 在探索之前，阅读这些

- **`CONTEXT.md`**（位于 knowledge/ 命名空间内，由 domain-modeling skill 创建）— 如果存在，使用其中定义的术语。
- **`adr/`** — 阅读涉及你要工作区域的 ADR。

如果这些文件都不存在，**静默继续**。不要标记它们的缺失；不要预先建议创建它们。`/domain-modeling` skill（通过 `/grill-with-docs` 和 `/improve-codebase-architecture` 到达）在术语或决策实际被确定时延迟创建它们。

## 使用术语表的词汇

当你的输出中命名了一个领域概念（在 issue 标题、重构提案、假设、测试名称中），使用 `CONTEXT.md` 中定义的术语。不要偏离到术语表明确避免的同义词。

如果你需要的概念尚未在术语表中，这是一个信号 — 要么你在发明项目不使用的语言（重新考虑），要么确实存在缺口（记录给 `/domain-modeling`）。

## 标记 ADR 冲突

如果你的输出与现有 ADR 矛盾，明确提出而不是默默覆盖：

> _与 ADR-NNNN（<标题>）矛盾 — 但值得重新讨论，因为……_
