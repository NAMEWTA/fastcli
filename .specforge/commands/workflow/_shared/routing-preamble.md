# 路由声明六要素模板

> workflow command 的 L2 正文开头必须包含以下六要素注释块。
> `doctor --check-disclosure` 使用正则校验六要素齐全性。

## 格式样板

```markdown
<!-- route-statement
路由：<command-name>
Change-ID：{{changeId}}
已加载：
  - <文件路径> (行数/起止行)
未加载（后续按需）：
  - <文件路径>（预算 N 行）
第一动作：<具体下一步>
Token 预算估算：约 <N> tokens
-->
```

## 说明

- 本文件为模板骨架，非 L3 引用（不计入 `checkL3LoadBudget`）
- 各 command 根据自身职责填写具体值
- `Change-ID` 使用 `{{changeId}}` 占位符，运行时由上下文替换
- `已加载` / `未加载` 根据 command 实际引用的 references 填写
- `Token 预算估算` 根据 L2 正文 + 首轮 L3 加载量估算
