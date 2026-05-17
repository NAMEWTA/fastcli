# Issue 分类法（Issue Taxonomy）

> 统一三层 QA 中"发现的问题"的严重度判定与处理建议，避免审查者各自判断、结果不可比。

## 1. 三层严重度

| 严重度 | 定义 | 处理 |
|-------|------|------|
| **Critical** | 阻塞发布：功能错误、数据损坏、安全漏洞、不可逆变更 | 必须在 release 前修复 |
| **Important** | 影响用户体验或可维护性，但不阻塞核心功能 | 修复后继续；或记录 follow-up |
| **Minor** | 风格/可读性/局部优化 | 仅记录，不阻断 |

## 2. 分类清单（Category × Severity 决策表）

### 2.1 功能正确性（Functional）

| 现象 | 默认严重度 |
|------|-----------|
| 核心用户故事的 Acceptance Criteria 失败 | Critical |
| 边界条件下崩溃 / 抛未处理异常 | Critical |
| 边界条件下返回错误结果但不崩溃 | Important |
| 文案/格式偏离规范 | Minor |

### 2.2 安全（Security）

| 现象 | 默认严重度 |
|------|-----------|
| SQL 注入 / 命令注入 / SSRF 可达 | Critical |
| 越权（垂直 / 水平）可达 | Critical |
| 敏感数据出现在日志 / 响应 | Critical |
| 缺少速率限制（高频敏感操作） | Important |
| 错误信息泄露内部结构（栈、表名） | Important |

### 2.3 性能（Performance）

| 现象 | 默认严重度 |
|------|-----------|
| 关键路径 P99 退化 ≥ 50% | Critical |
| 关键路径出现 N+1 查询 | Important（高 QPS 场景为 Critical）|
| 内存泄漏（每次请求 ≥ 1MB 累积） | Critical |
| 算法复杂度 O(n²) 而 n 可能 ≥ 1000 | Important |

### 2.4 数据 / Schema（Data Migration）

| 现象 | 默认严重度 |
|------|-----------|
| Migration 不可逆且无回滚预案 | Critical |
| Migration 无幂等保证 | Critical |
| 缺少前向兼容（旧客户端读新写入） | Important |
| 缺少索引，预期数据量 < 1k | Minor |

### 2.5 API 契约（API Contract）

| 现象 | 默认严重度 |
|------|-----------|
| 破坏性变更未版本化 | Critical |
| 错误码分类不一致 | Important |
| 字段命名不一致（同字段不同名） | Important |
| OpenAPI / 文档与代码漂移 | Important |

### 2.6 测试（Testing）

| 现象 | 默认严重度 |
|------|-----------|
| 关键路径无覆盖（< 80% 行覆盖） | Critical |
| 测试存在但 mock 错误（"绿色但实际不验证"） | Critical |
| 缺少负向 / 边界用例 | Important |
| 测试速度过慢导致跳过执行 | Important |

### 2.7 可维护性（Maintainability）

| 现象 | 默认严重度 |
|------|-----------|
| 大段重复代码（≥ 3 处） | Important |
| 命名模糊导致歧义 | Important |
| 注释缺失（公共 API） | Minor |
| 局部排版 / 格式化 | Minor |

## 3. 输出格式（每条发现）

每条发现以 JSONL 一行一对象（与 implementation-build 的 specialists 输出兼容）：

```json
{
  "severity": "Critical|Important|Minor",
  "category": "functional|security|performance|data-migration|api-contract|testing|maintainability",
  "confidence": 1-10,
  "path": "src/path/file.ts",
  "line": 123,
  "summary": "问题概述（一句话）",
  "evidence": "支撑该判断的代码或测试输出片段",
  "fix": "可执行的修复建议",
  "fingerprint": "path:line:category"
}
```

## 4. 升级 / 降级规则

- **升级**：若同一处出现 ≥ 2 条 Important，可合并升级为 Critical
- **降级**：若 Critical 在测试环境可重现但生产路径已被上层校验拦截，可降级为 Important（必须附 evidence）
- **置信度**：confidence < 5 的发现需补充 evidence 或交回报告者验证；不得直接计入 Critical

## 5. 反规避

| 借口 | 现实 |
|------|------|
| "这条是 Important 不是 Critical" | 安全/数据/不可逆类一律 Critical |
| "评分主观，差不多就行" | 用 fingerprint 与 evidence 让 reviewer 复算 |
| "记 Minor 不影响发布" | Minor 太多说明未维护，迟早成 Important |
