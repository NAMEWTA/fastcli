# 探针可用性矩阵

> 本文档定义 `codebase-health` 支持的探针集合、检测目标与回退行为。

## 探针总览

| 探针 | 安装方式 | 检测目标 | 适用语言 | 输出格式 |
|------|---------|---------|---------|---------|
| jscpd | `npm i -g jscpd` | 字面重复代码块 | 全语言 | JSON |
| knip | `npm i -g knip` | 未用导出 / 未用依赖 / 孤立文件 | TS / JS | JSON |
| vulture | `pip install vulture` | 死代码（未用函数/变量/导入） | Python | 文本 |
| staticcheck | `go install honnef.co/go/tools/cmd/staticcheck@latest` | 死代码 / 不可达分支（U1000） | Go | 文本 |
| baseline | 内置（无需安装） | 目录大小 / 文件数 / 测试覆盖存在 | 全语言 | 内部 |

## 可用性检测

每个外部探针通过 `<probe> --version` 检测：

- 退出码 0 → `available: true`
- 退出码非 0 或命令不存在 → `available: false`，记录 `fallbackReason`

## 回退策略

| 场景 | 行为 |
|------|------|
| 单个探针不可用 | 跳过该探针，继续其余 |
| 多个探针不可用 | 逐个跳过，可用的照常执行 |
| 全部外部探针不可用 | 自动运行 baseline 兜底 |
| `--probes` 指定的探针不可用 | 返回 `available: false` 并在报告中标注 |

## baseline 探针详情

当所有外部探针均不可用时，baseline 提供最低限度的健康信号：

| 指标 | 采集方式 | 健康阈值 |
|------|---------|---------|
| 源文件总数 | 递归计数 `src/` 下源文件 | ≤ 500 |
| 大文件占比 | 单文件 > 500 行的比例 | ≤ 20% |
| 测试配置存在 | 检测 jest/vitest/pytest 等配置文件 | 存在 |

## 严重度分级

各探针产出的 `topIssues` 按以下标准分级：

| 级别 | 标准 |
|------|------|
| high | ≥ 20 行重复块出现 ≥ 3 处；跨模块公共导出零引用；死分支导致业务规则静默失效 |
| medium | 5-19 行重复块；明显未用的 public export；顶层未用依赖 |
| low | < 5 行重复；未用内部辅助函数；注释掉的死代码 |

## 误报边界

- 测试文件中的导出不算「未用」
- 公共 API / SDK 的 index 导出需人工确认，标 medium 而非 high
- 模板化 CRUD / 单测 setup 的相似代码不算重复块
