# 事故与复盘背景

- **Linear**：寻找标有 `incident`、`sev-*`、`postmortem-action-item`、`reliability` 的工单。
- **Slack**：在目标代码加入日期附近，搜索 `#sev-*` 和 `#incident-*` 频道。
- **Git**：提交消息中“修复事故”“增加防御检查”，或先“回退”随后“重新应用并……”等表述，都是强信号。
