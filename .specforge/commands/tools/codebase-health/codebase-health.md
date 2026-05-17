---
name: 'codebase-health'
type: 'tool-command'
description: '周期性健康巡检；产出 context/health/YYYY-MM-DD-report.md；未用依赖经确认写禁动清单。'
version: '1.0.0'
author: 'specforge'
---

<!-- preamble:bash
# 技能注入 — 匹配健康巡检相关技能
specforge list --skills --triggers=health,巡检,debt,技术债,冗余 --format=json

# 前置产物检测 — 检查是否已有 inventory（巡检依赖入场扫描）
specforge status --check-artifacts=inventory --quiet

# 环境检测
specforge doctor --check-node --check-deps --quiet

# 上下文加载 — 读取项目配置与既有禁动清单
if [ -f "specforge/config.yaml" ]; then
  echo "=== 项目配置 ==="
  grep -A 3 "^techStack:" specforge/config.yaml || echo "未定义技术栈"
fi
if [ -f "specforge/context/context.md" ]; then
  echo "=== 禁动清单 ==="
  grep -A 10 "禁动清单" specforge/context/context.md || echo "暂无禁动条目"
fi
-->

# 代码库健康巡检（Codebase Health）

关键原则：**巡检只产报告与建议，不直接改代码。** 改动由用户确认后走正式 change 流程。

## Iron Law

> **探针缺失不阻塞巡检。** 任何外部探针不可用时回退基线，确保每次巡检都有产出。

## 快速开始

```
specforge codebase-health              # 标准交互模式
specforge codebase-health --json       # 结构化输出（CI 集成）
specforge codebase-health --probes jscpd,knip  # 仅跑指定探针
specforge codebase-health --no-interactive     # 跳过交互（未用依赖仅记录）
```

---

## CLI 用法

| 标志 | 作用 |
|------|------|
| `--json` | 向 stdout 输出符合 `HealthReport` schema 的 JSON |
| `--probes <list>` | 逗号分隔的探针名，仅运行列出的探针 |
| `--no-interactive` | 禁用交互询问；未用依赖仅记录在报告中 |

---

## 执行流程

```
codebase-health
  │
  ├─ Phase 1: 探针可用性检测
  │   ├─ jscpd（字面重复块）
  │   ├─ knip（未用导出 / 未用依赖 / 孤立文件）
  │   ├─ vulture（Python 死代码）
  │   ├─ staticcheck（Go 死代码）
  │   └─ 缺失探针 → 记录 fallbackReason，继续
  │
  ├─ Phase 2: 探针执行
  │   ├─ 可用探针 → 执行并收集结果
  │   ├─ 不可用探针 → available: false
  │   └─ 全部不可用 → baseline 兜底
  │
  ├─ Phase 3: 结果汇总
  │   ├─ 计算各探针 score（0-100）
  │   ├─ 加权平均 → overallScore
  │   └─ 生成 recommendations
  │
  ├─ Phase 4: 未用依赖处理
  │   ├─ unusedDependencies 非空？
  │   │   ├─ interactive → 三选一交互
  │   │   └─ non-interactive → 仅记录
  │   └─ 选「写入禁动清单」→ upsert context.md
  │
  └─ Phase 5: 产物输出
      ├─ specforge/context/health/YYYY-MM-DD-report.md
      └─ --json → stdout JSON
```

---

## Phase 1: 探针可用性检测

→ **探针详情：** 读取 `references/probe-matrix.md`

对每个探针执行 `<probe> --version`，判定是否可用：

| 探针 | 检测目标 | 适用语言 |
|------|---------|---------|
| jscpd | 字面重复块 | 全语言 |
| knip | 未用导出 / 未用依赖 / 孤立文件 | TypeScript / JavaScript |
| vulture | 死代码 | Python |
| staticcheck | 死代码 / 不可达分支 | Go |
| baseline | 目录大小 / 文件数 / 测试覆盖存在 | 全语言（内置兜底） |

**回退策略：** 探针不可用时返回 `{ available: false, fallbackReason: "本机未安装 <probe>" }`，不阻塞其余探针。全部外部探针不可用时自动运行 baseline。

---

## Phase 2: 探针执行

### 2.1 jscpd（重复块检测）

```bash
npx jscpd src/ --min-lines 5 --min-tokens 50 --reporters json
```

- score 映射：重复率 0% → 100 分，≥ 10% → 0 分，线性插值
- topIssues：按重复行数降序取前 10 条

### 2.2 knip（未用导出 / 依赖）

```bash
npx knip --reporter json
```

- score 映射：未用导出占比 0% → 100 分，≥ 5% → 0 分
- 副产物：`unusedDependencies` 数组（触发 Phase 4 交互）

### 2.3 vulture（Python 死代码）

```bash
vulture src/ --min-confidence 80
```

- score 映射：死代码行占比 0% → 100 分，≥ 3% → 0 分

### 2.4 staticcheck（Go 死代码）

```bash
staticcheck -checks U1000 ./...
```

- score 映射：未用声明数 0 → 100 分，≥ 20 → 0 分

### 2.5 baseline（内置兜底）

当所有外部探针均不可用时运行：

| 指标 | 健康标准 | 扣分规则 |
|------|---------|---------|
| 目录大小 | src/ 文件数 ≤ 500 | 每超 100 扣 10 分 |
| 文件数 | 单文件 ≤ 500 行 的占比 ≥ 80% | 占比每降 10% 扣 15 分 |
| 测试覆盖 | 存在测试配置文件 | 不存在扣 30 分 |

---

## Phase 3: 结果汇总

- `overallScore`：所有 `available: true` 探针的 score 加权平均（等权）
- `recommendations`：按 score 从低到高排列改善建议
- `rawOutputExcerpt`：每个探针保留 ≤ 40 行原始输出摘要

---

## Phase 4: 未用依赖交互

仅在 `unusedDependencies` 非空且 interactive 模式时触发：

```
codebase-health 发现以下未用依赖（knip）：
  - lodash
  - legacy-helper

[1] 写入 specforge/context/context.md 的禁动清单（建议移除或声明保留理由）
[2] 仅记录在本次 health report，不动 context.md
[3] 忽略（不推荐；可能下次 scan 再次报出）

请选择 [1/2/3]:
```

- 选 [1]：以 upsert 语义追加到 `context.md#禁动清单`，不覆盖既有条目
- 选 [2]：仅写入当日报告
- 选 [3]：不记录

非交互模式等同选 [2]。

---

## Phase 5: 产物输出

### 5.1 Markdown 报告

→ **报告格式：** 读取 `references/report-template.md`

写入路径：`specforge/context/health/<YYYY-MM-DD>-report.md`

### 5.2 JSON 输出

`--json` 模式直接输出 `HealthReport` 的 JSON 序列化，不写文件。

---

## 完成检查清单

- [ ] 探针可用性已检测（允许全部不可用但必须有 baseline）
- [ ] 每个可用探针均已执行并产出 score + topIssues
- [ ] overallScore 已计算
- [ ] 未用依赖交互已完成（或非交互模式已跳过）
- [ ] 报告已写入 `specforge/context/health/`

---

## 产物清单

| 产物 | 路径 | 说明 |
|------|------|------|
| 健康报告 | `specforge/context/health/YYYY-MM-DD-report.md` | 当日巡检结果 |
| JSON 输出 | stdout（`--json` 模式） | 符合 `HealthReport` schema |
| 禁动清单更新 | `specforge/context/context.md#禁动清单` | 仅用户选 [1] 时 |

---

## References 导航（按需读取）

| 场景 | 参考文档 | 核心内容 |
|------|---------|---------|
| 需要了解探针详细能力与回退策略 | `references/probe-matrix.md` | 探针可用性矩阵、检测目标、回退行为 |
| 需要了解报告输出格式 | `references/report-template.md` | 报告 Markdown 结构模板 |

**渐进式披露原则：**
- 命令正文保留核心流程与探针速查
- 探针详细矩阵在 `references/probe-matrix.md` 按需加载
- 报告格式模板在 `references/report-template.md` 按需加载
