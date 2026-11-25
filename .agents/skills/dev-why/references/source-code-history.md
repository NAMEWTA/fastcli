# 代码考古（git 与仓库内部）

## 这个来源包含什么

- 提交历史（消息、日期、作者、差异）
- PR 描述、评审评论和讨论串（通过 `gh`）
- 行内代码注释、TODO、FIXME、弃用说明
- ADR（架构决策记录），如果仓库维护这类资料
- 测试，其名称和断言常常记录促成变更的边界情况
- 在同一提交中修改的相关文件（共同变更信号）
- 仓库中的 CHANGELOG 条目与发布说明
- 提交消息与 PR 正文中的问题／工单 ID

这是最可信、与代码直接关联、也最完整的来源。凡是经过仓库的内容，都应该能在这里找到。

## 如何搜索

扩展初始提交列表：

```bash
# 追踪文件重命名之前的历史
git log --follow --oneline -- <file>

# Pickaxe：添加或删除了这段精确文本的提交
git log -S '<exact_string_from_code>' -- <file>

# 或者按模式匹配：
git log -G '<regex>' -- <file>

# 每一行由谁在何时编写
git blame -L <start>,<end> <file>

# 某个提交的完整差异
git show <hash>

# 两个时间点之间影响该文件的提交
git log <old>..<new> -p -- <file>
```

查找代码之外的说明文档：

```bash
# ADR 通常位于 docs/adr/ 或类似位置
rg -l -i 'architecture.decision' --glob '*.md'

# 目标附近的 TODO 和 FIXME
rg -n -C2 '(TODO|FIXME|HACK|XXX|NOTE)' <target_file>

# 相关测试
rg -l '<symbol>' --glob '*test*'
```
