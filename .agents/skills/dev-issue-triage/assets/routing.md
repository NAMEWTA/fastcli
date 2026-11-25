# 分流映射示例

把本文件复制到技能安装包之外，例如 `.agents/dev/project/issue-automation/routing.md`，并替换每个占位符。让 `routing.map_path` 指向该副本。更新技能包时不得覆盖它。

分诊技能把它当作数据。路由需要报告或原因追踪中的证据。仅有关键词匹配并不够。

```yaml
routes:
  - name: "账单示例"
    match:
      product_areas:
        - "账单领域占位符"
      code_paths:
        - "账单代码路径占位符"
      error_signatures:
        - "账单错误占位符"
    destination:
      source_destination: "账单团队已核实接收位置"
      tracker_team: "账单团队占位符"
    owners:
      - "账单负责人占位符"
    allow_feature_owner_ping: false

  - name: "桌面端示例"
    match:
      product_areas:
        - "桌面端领域占位符"
      code_paths:
        - "桌面端代码路径占位符"
      error_signatures:
        - "桌面端错误占位符"
    destination:
      source_destination: "桌面端团队已核实接收位置"
      tracker_team: "桌面端团队占位符"
    owners:
      - "桌面端负责人占位符"
    allow_feature_owner_ping: false

fallback:
  destination: ""
  owners: []
  allow_feature_owner_ping: false

ping_policy:
  default: "off"
  allow:
    - "configured-feature-owner"
    - "confirmed-regression-author"
  deny:
    - "broad-on-call-group"
    - "unverified-owner"
```

## 规则

- 除非某个团队接受所有未匹配报告，否则将 `fallback.destination` 留空。
- 使用稳定的产品领域、代码路径和错误特征。
- 不要在公开副本中包含私人数据。
- 不要把原始用户或频道 ID 粘贴进将要发布的示例。
- 在目标团队同意之前，保持功能负责人提醒关闭。
- 转交只是告诉报告者应去哪里。自动化不跨容器或接收者发帖。
