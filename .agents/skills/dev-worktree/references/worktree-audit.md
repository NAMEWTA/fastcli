# 工作树审计

需要 Node.js 22.14+ 和支持 `worktree list --porcelain -z` 的 Git。可选 PR 查询需要已认证的 Origin 或 `gh`，查询失败时保留本地证据。只有显式传入 `--transcripts` 或配置了 `SKILLS_HUB_TRANSCRIPTS_DIR` 才检索指定记录目录。新变量未设置时兼容 `SKILLS_WTA_TRANSCRIPTS_DIR`，新变量为空时禁用环境变量来源。`SKILL_DIR` 是本技能的安装目录。

[审计脚本](../scripts/worktree-audit.mjs)默认只读取本地已有 Git 引用，不执行 `fetch`。只有明确加 `--with-pr` 才查询托管平台，只有明确给对话目录才搜索该目录：

```bash
node "$SKILL_DIR/scripts/worktree-audit.mjs" --base main "/path/to/project"
node "$SKILL_DIR/scripts/worktree-audit.mjs" --base origin/main --with-pr "/path/to/project"
node "$SKILL_DIR/scripts/worktree-audit.mjs" --base main --transcripts "/path/to/chosen-transcripts" "/path/to/project"
```

输出按工作树大小降序排列，跳过主工作树。列的含义是：`SIZE` 大小，`AGE` 距离头提交的天数，`MERGED` 是否为基础引用的祖先，`DIRTY` 是否存在已跟踪修改或未跟踪文件，`REMOTE` 与本地远程引用的关系，`PR` 关联状态，`LAST_CHAT` 明确搜索范围内的最近记录，`BUCKET` 建议分组，`WORKTREE` 真实目录。路径中的制表符和换行在表格中转义，空格保留。

目录大小不跟随符号链接，并对同一工作树中的硬链接去重；文件系统提供分配块数时使用分配大小，否则使用逻辑字节数。聊天关联只遍历显式目录中的普通文本文件，跳过隐藏路径、符号链接和二进制文件；按内容中的工作树绝对路径查找关联，不读取其他目录，也不依赖 Git 忽略规则。

| 分组 | 后续判断 |
|---|---|
| `hold-wip` | 有已跟踪修改，或无法可靠读取状态；先保存和核对，不能清理。 |
| `hold-open-pr` | 仍有关联的打开 PR；确认工作去向。 |
| `verify-recent-chat` | 在明确指定的记录目录发现 4 天内相关工作；先核对交接。 |
| `safe` | 本地祖先关系或实际 `merged` PR 提供了可进一步评估回收的证据；仍需检查未跟踪文件、独有提交和用户授权。 |
| `review` | 证据不足，逐项审查。关闭但未合并的 PR 归在这里。 |

`MERGED` 只反映本地引用；未抓取时可能过期。Squash 合并不能只用祖先关系识别。PR 查询只读取当前账户的最近最多 1000 条 PR，无匹配不等于没有 PR。`REMOTE` 的 `aheadN` 是相对本地远程引用的可达提交数，不单独证明两侧没有分叉。`scratch:N` 只说明有 N 个未跟踪条目，不能据此断言它们可丢弃。

脚本不会执行任何删除；需要清理时先阅读[工作树清理方法](worktree-cleanup.md)，按照本次明确目标处理候选。审计结果过期或目录仍在使用时，先更新事实。
