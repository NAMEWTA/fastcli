---
name: 'project-inventory'
type: 'tool-command'
description: '一次性扫描项目生成 context/inventory.md；brownfield 项目入场必做。'
version: '1.0.0'
author: 'specforge'
---

<!-- preamble:bash
# 技能注入 — 匹配入场扫描相关技能
specforge list --skills --triggers=inventory,scan,brownfield,入场,扫描 --format=json

# 前置产物检测 — 检查是否已有 inventory
specforge status --check-artifacts=inventory --quiet

# 环境检测
specforge doctor --check-node --check-deps --quiet

# 上下文加载 — 读取项目配置
if [ -f "specforge/config.yaml" ]; then
  echo "=== 项目配置 ==="
  grep -A 3 "^techStack:" specforge/config.yaml || echo "未定义技术栈"
fi
-->

# 项目入场扫描（Project Inventory）

关键原则：**扫描先于一切设计决策。** brownfield 项目必须先跑 inventory 再开始任何 change。

## Iron Law

> **没有 inventory，就没有 brownfield 设计。** 禁止在不了解项目现状的情况下开始 design-explore。

## 快速开始

当 `foundation-init` 判定为 brownfield 时，按以下流程执行：

```
foundation-init 判定 brownfield
  │
  ├─ 提示运行 specforge project-inventory
  │
  ├─ 扫描 7 类信号
  │   ├─ 技术栈（manifest 文件解析）
  │   ├─ 命名约定（文件名 + 标识符采样）
  │   ├─ 既有抽象索引（service / controller / repo 等）
  │   ├─ AI 文档（AGENTS.md / CLAUDE.md / .cursor / .windsurf）
  │   ├─ 目录结构（顶层布局）
  │   ├─ 测试框架（jest / vitest / pytest 等）
  │   └─ 禁动清单（初始为空，供 codebase-health 回填）
  │
  ├─ 存在 AI 文档？
  │   ├─ 是 → 交互询问采纳策略
  │   └─ 否 → 跳过
  │
  └─ 产出 specforge/context/inventory.md
```

**何时跳过本命令：**
- greenfield 项目（无清单文件或源文件 ≤ 5）→ 无需 inventory
- 已存在 `specforge/context/inventory.md` 且内容非空 → 提示是否重新扫描

---

## CLI 用法

```bash
# 标准交互模式（推荐首次使用）
specforge project-inventory

# 结构化输出（CI / 脚本集成）
specforge project-inventory --json

# 非交互模式（AI 文档采纳写 undefined，不阻塞）
specforge project-inventory --no-interactive
```

### 标志说明

| 标志 | 作用 |
|------|------|
| `--json` | 向 stdout 输出符合 `InventoryResultSchema` 的 JSON，不走交互 |
| `--no-interactive` | 禁用交互询问；AI 文档采纳默认写 `undefined`（未决） |

---

## Phase 1: 信号扫描

### 1.1 技术栈检测

扫描根目录下的清单文件：

| 清单文件 | 生态系统 |
|----------|---------|
| `package.json` | node |
| `pom.xml` | java |
| `Cargo.toml` | rust |
| `go.mod` | go |
| `pyproject.toml` / `requirements.txt` | python |

提取信息：生态系统、运行时版本、包管理器。

### 1.2 命名约定采样

- 采样 ≤ 50 个源文件名，判定主流命名风格（kebab-case / snake_case / camelCase / PascalCase / mixed）
- 采样 ≤ 50 个导出标识符，判定标识符命名风格
- 记录采样数量（`sampleSize`）

### 1.3 既有抽象索引

扫描 `src/` 下的模块，按以下分类索引：

| 分类 | 匹配模式 |
|------|---------|
| service | `*-service.*` / `*Service.*` |
| controller | `*-controller.*` / `*Controller.*` |
| repo | `*-repo.*` / `*Repository.*` |
| util | `*-util.*` / `*Utils.*` / `utils/*` |
| model | `*-model.*` / `*Model.*` / `models/*` |
| other | 不匹配以上模式的公共模块 |

上限 200 条，避免报告膨胀。

### 1.4 AI 文档检测

扫描以下路径：
- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/*.md`
- `.windsurf/rules/*.md`

→ **交互策略：** 读取 `references/ai-doc-merge-policy.md`

### 1.5 目录结构

记录根目录下前两层的目录布局（排除 `node_modules` / `.git` / `dist` 等常见忽略目录）。

### 1.6 测试框架

检测以下测试框架配置：
- `jest.config.*` / `vitest.config.*` → Jest / Vitest
- `pytest.ini` / `conftest.py` → pytest
- `*_test.go` → Go testing
- `Cargo.toml` 含 `[dev-dependencies]` 测试相关 → Rust test

### 1.7 禁动清单

初始为空数组。后续由 `codebase-health` 巡检发现未用依赖后经用户确认回填。

---

## Phase 2: AI 文档采纳交互

仅在 interactive 模式且检测到 AI 文档时触发。

→ **完整策略：** 读取 `references/ai-doc-merge-policy.md`

---

## Phase 3: 产物生成

### 3.1 Markdown 渲染

将 `InventoryResult` 渲染为 `specforge/context/inventory.md`，包含：

- 扫描时间戳
- 7 类信号的结构化展示
- AI 文档采纳状态（adopted / undefined / 未检测到）
- 禁动清单（初始为空或由 health 回填）

### 3.2 JSON 输出

`--json` 模式直接输出 `InventoryResult` 的 JSON 序列化，不写文件。

---

## 完成检查清单

- [ ] 7 类信号均已扫描（允许部分为空但不允许缺失）
- [ ] AI 文档采纳状态已明确（adopted / undefined / 无文档）
- [ ] inventory.md 已写入 `specforge/context/`
- [ ] 无未处理的交互询问

---

## 产物清单

| 产物 | 路径 | 说明 |
|------|------|------|
| inventory 报告 | `specforge/context/inventory.md` | 7 类信号的 Markdown 渲染 |
| JSON 输出 | stdout（`--json` 模式） | 符合 `InventoryResultSchema` |

---

## 7 类信号速查

→ **详细定义：** 读取 `references/signal-catalog.md`

| # | 信号类型 | 核心内容 | 来源 |
|---|---------|---------|------|
| 1 | 技术栈 | 生态系统 / 运行时 / 包管理器 | 清单文件 |
| 2 | 命名约定 | 文件名风格 / 标识符风格 / 采样数 | 源文件采样 |
| 3 | 既有抽象 | service / controller / repo / util / model | src/ 扫描 |
| 4 | AI 文档 | 路径 / 采纳状态 | 根目录 + .cursor + .windsurf |
| 5 | 目录结构 | 前两层布局 | 根目录 |
| 6 | 测试框架 | 框架名称列表 | 配置文件检测 |
| 7 | 禁动清单 | 禁止修改的路径/依赖 | 初始空，health 回填 |

---

## References 导航（按需读取）

| 场景 | 参考文档 | 核心内容 |
|------|---------|---------|
| 需要了解 7 类信号的详细定义与字段 | `references/signal-catalog.md` | 每类信号的字段、来源、边界值 |
| 检测到 AI 文档需要处理采纳策略 | `references/ai-doc-merge-policy.md` | 三选一交互、merge 要点、标红提示 |

**渐进式披露原则：**
- 命令正文只保留核心流程和信号速查
- 深度字段定义在 `references/signal-catalog.md` 按需加载
- AI 文档采纳策略在 `references/ai-doc-merge-policy.md` 按需加载
