# Frontmatter 规范

> 所有命令和技能文件的 YAML frontmatter 必须遵循此规范。

## Command Frontmatter（命令）

### 必需字段

```yaml
---
name: <command-name>
type: workflow-command  # 或 tool-command
description: >-
  <功能简述>——<核心方法关键词>。
  触发场景：<中文触发词1>、<中文触发词2>、<英文触发词>。
version: "1.0.0"
author: "wta"
---
```

### 字段说明

| 字段 | 类型 | 必需 | 说明 | 示例 |
|------|------|------|------|------|
| `name` | string | ✅ | 命令名（与目录名同名，kebab-case） | `requirements-clarify` |
| `type` | string | ✅ | 命令类型 | `workflow-command` 或 `tool-command` |
| `description` | string | ✅ | 功能描述（必须包含触发场景） | `需求澄清与方案探索——结构化需求澄清...` |
| `version` | string | ✅ | 语义化版本 | `"1.0.0"` |
| `author` | string | ✅ | 作者标识 | `"wta"` |

### 命名规范

- **workflow-command**：`<phase>-<verb>`，如 `requirements-clarify`、`design-explore`
- **tool-command**：单词能力名，如 `review`、`worktree`
- 必须是 kebab-case：`^[a-z][a-z0-9-]*$`

### 常见错误

#### ❌ 错误示例 1：缺少触发场景

```yaml
description: 需求澄清与方案探索
```

#### ✅ 正确示例 1：包含触发场景

```yaml
description: >-
  需求澄清与方案探索——结构化需求澄清（6维度分类法）+ 多视角提问（12视角）+ 方案探索。
  触发场景："澄清需求"、"需求分析"、"spec this feature"。
```

#### ❌ 错误示例 2：命名不符合 kebab-case

```yaml
name: RequirementsClarify  # 错误：使用了 PascalCase
name: requirements_clarify  # 错误：使用了 snake_case
```

#### ✅ 正确示例 2：kebab-case 命名

```yaml
name: requirements-clarify  # 正确
```

---

## Skill Frontmatter（技能）

### 必需字段

```yaml
---
name: <skill-name>
type: <skill-type>
description: >-
  <功能简述>——<核心方法>。当 <触发场景> 时自动触发。
  触发词：<触发词1>、<触发词2>。
version: "1.0.0"
author: "wta"
---
```

### 字段说明

| 字段 | 类型 | 必需 | 说明 | 示例 |
|------|------|------|------|------|
| `name` | string | ✅ | 技能名（与目录名同名，kebab-case） | `chinese-commit-conventions` |
| `type` | string | ✅ | 技能类型 | 见下方技能类型表 |
| `description` | string | ✅ | 功能描述（必须包含触发场景和触发词） | `中文 Conventional Commits 规范...` |
| `version` | string | ✅ | 语义化版本 | `"1.0.0"` |
| `author` | string | ✅ | 作者标识 | `"wta"` |

### 技能类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `architecture-rule` | 架构规则 | `microservices-boundary` |
| `code-style` | 代码风格 | `chinese-commit-conventions` |
| `domain-rule` | 领域规则 | `chinese-code-review` |
| `security-rule` | 安全规则 | `sql-injection-prevention` |
| `testing-rule` | 测试规则 | `api-test-strategy` |
| `ui-ux-rule` | UI/UX 规则 | `mobile-adaptation` |
| `workflow-step` | 工作流步骤 | `git-commit-template` |

### 常见错误

#### ❌ 错误示例 1：description 描述的是"做什么"而非"何时使用"

```yaml
description: >-
  定义服务边界、接口契约、数据归属、通信方式。
```

#### ✅ 正确示例 1：描述"何时使用"

```yaml
description: >-
  微服务边界与架构决策记录模板——定义服务边界、接口契约、数据归属、通信方式。
  当进行架构设计或服务拆分时自动触发。
  触发词：微服务、服务拆分、架构设计、服务边界、ADR。
```

#### ❌ 错误示例 2：技能类型错误

```yaml
type: architecture  # 错误：应该是 architecture-rule
type: testing  # 错误：应该是 testing-rule
```

#### ✅ 正确示例 2：使用正确的技能类型

```yaml
type: architecture-rule
type: testing-rule
```

---

## 校验规则

### 正则表达式

- **name**：`^[a-z][a-z0-9-]*$`
- **version**：`^\d+\.\d+\.\d+$`
- **type（command）**：`^(workflow-command|tool-command)$`
- **type（skill）**：`^(architecture-rule|code-style|domain-rule|security-rule|testing-rule|ui-ux-rule|workflow-step)$`

### 长度限制

- **name**：5-50 字符
- **description**：20-300 字符
- **author**：2-30 字符

### 校验脚本

使用 `scripts/quick_validate_command.py` 或 `scripts/quick_validate_skill.py` 进行快速校验：

```bash
# 校验命令
python scripts/quick_validate_command.py <command-name>

# 校验技能
python scripts/quick_validate_skill.py <skill-name>
```

---

## 完整示例

### Command 完整示例

```yaml
---
name: requirements-clarify
type: workflow-command
description: >-
  需求澄清与方案探索——结构化需求澄清（6维度分类法）+ 多视角提问（12视角）+ 方案探索（2-3个可行方案+对比矩阵）+ 方案批准（HARD-GATE）。
  触发场景："澄清需求"、"需求分析"、"方案探索"、"spec this feature"。
version: "1.0.0"
author: "wta"
---
```

### Skill 完整示例

```yaml
---
name: chinese-commit-conventions
type: code-style
description: >-
  中文 Conventional Commits 规范——type 英文 + scope 中文 + 描述中文。当创建 Git 提交时自动触发。
  触发词：git commit、提交代码、commit message、提交信息。
version: "1.0.0"
author: "wta"
---
```
