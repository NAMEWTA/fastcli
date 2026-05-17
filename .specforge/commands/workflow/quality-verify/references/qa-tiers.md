# QA 三层测试详解（Quick / Standard / Exhaustive）

> 本文是 quality-verify Step 3 的展开参考，按需阅读。

## 1. 选择启发（Tier Selection Heuristics）

### 1.1 由变更属性自动建议

| 变更属性 | 信号 | 建议层级 |
|---------|------|---------|
| 仅修改文档 / 注释 | 改动行数中代码占比 < 10% | quick |
| Hotfix / 修复线上明确 bug | bug 已有重现步骤 + 修复测试 | quick |
| 普通功能 | 改动 < 200 行 / 单模块 | standard |
| 跨模块改动 | 触及 ≥ 3 个模块或 layer | exhaustive |
| 数据库 schema 变更 | 含 migration 文件 | exhaustive |
| 安全敏感（auth / authz / 数据流出） | 触及认证/授权/敏感字段 | exhaustive |
| 性能敏感（关键路径） | 涉及 hot path / 索引 / 缓存 | exhaustive |
| Release 前最终验证 | release-deploy 前一步 | exhaustive |

### 1.2 由用户显式指定

- preamble 中读 `QA_LEVEL` 环境变量；缺省为 `standard`
- 命令行参数：`--qa-level quick|standard|exhaustive`（如使用脚本封装）

## 2. 各层覆盖范围

### 2.1 Quick（< 2 min）

**目标**：抓住"会让用户立即崩溃"的问题。

- ✅ P0 任务相关单元测试
- ✅ 启动 / 烟雾测试（应用能起来、首屏能加载）
- ✅ 关键 API 端点 200 OK
- ✅ Linter（参见 language-adapters）
- ❌ 不跑完整集成 / 端到端
- ❌ 不做性能 / 安全扫描

**触发"升级到 standard"的信号**：
- Quick 层 1 项失败 → 修复后**至少**重跑 standard
- Quick 层无失败但改动跨多个模块 → 仍建议补 standard

### 2.2 Standard（< 10 min）— 默认

**目标**：覆盖"中等概率漏掉"的问题。

- ✅ Quick 全部
- ✅ P1 任务相关测试
- ✅ 集成测试（API ↔ 数据库 / 外部 mock）
- ✅ 主要回归套件
- ✅ 至少一遍 build（参见 language-adapters）
- ❌ 不做长尾边界 / 性能 / 安全深扫

**触发"升级到 exhaustive"的信号**：
- Standard 出现 Critical 反馈
- 改动涉及 schema / 安全 / 性能
- Release-deploy 前的最后一道关

### 2.3 Exhaustive（< 30 min）

**目标**：覆盖"低概率高代价"的问题。

- ✅ Standard 全部
- ✅ 边界条件（empty / max / 并发 / 重试 / 重复提交）
- ✅ 性能基线（响应时间 / 内存 / 并发上限）
- ✅ 安全扫描（SQL 注入 / XSS / SSRF / 越权）
- ✅ 数据迁移演练（如适用）
- ✅ 兼容性矩阵（多浏览器 / 多版本 / 多 OS，如适用）

## 3. 修复循环节奏（Fix Loop）

```
[运行 Quick]
  ├─ PASS → 评估是否升级到 standard
  └─ FAIL → 修复 → 重跑 Quick → ... → 进入 standard
[运行 Standard]
  ├─ PASS → 评估是否升级到 exhaustive
  └─ FAIL → 修复 → 重跑 Standard → ... → 进入 exhaustive
[运行 Exhaustive]
  ├─ PASS → Step 4 三维验证
  └─ FAIL → 修复 → 重跑 Exhaustive
```

**每次失败后必须重跑当前层**，不允许跳过到下一层。

## 4. 时间预算（参考）

| 层级 | 90% 项目目标 | 上限 |
|------|-------------|------|
| quick | < 2 min | 5 min（超出说明项目测试结构需要重构） |
| standard | < 10 min | 20 min |
| exhaustive | < 30 min | 60 min |

超出上限：考虑测试拆分 / 并行化 / Mock 化外部依赖。

## 5. 反规避

| 借口 | 现实 |
|------|------|
| "Quick 通过就能发布" | Quick 仅是冒烟，未跑回归 |
| "时间紧只跑 Quick 也凑合" | 改动跨模块时 Quick 漏掉的概率极高 |
| "Exhaustive 太慢，跳过" | 跳过 Exhaustive 的代价是线上事故，不是 30 分钟 |
| "上次跑过，这次免了" | 必须基于最新 diff 重新评估层级 |
