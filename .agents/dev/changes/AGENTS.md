# 当前变更

- 活跃任务在 `./<YYYY-MM-DD-slug>/` 保存目标、规格和进展，各阶段沿用原记录。原件放项目根 `temp/dev/`，不进 Git。
- 出票即建 `evidences/` 下与 `tasks/` 完全同名的一份普通 `.md`，初始标「未验证」。目录只含同名报告，失败和复验更新原文件；整体验收后才写 Change 根 `evidence.md`。
- 原型用 `prototype/index.html` 及资源；`prototype-review.md` 记实际走查、版本与用户确认范围。资源变化后重核受影响确认，不由 Agent 代签。
- 完成交付或明确不实施后，由 `dev-archive` 将长期知识提炼到 `../notes/`，把 Change 分类归入 `../archive/changes/`。
