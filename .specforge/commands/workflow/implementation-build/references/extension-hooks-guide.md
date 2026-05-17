# 扩展钩子指南

> 在实现前后执行自定义扩展逻辑。

---

## 概述

扩展钩子允许在实现工作流的特定阶段执行自定义命令。钩子配置在 `.specforge/extensions.yml` 文件中定义。

---

## 配置文件格式

```yaml
# .specforge/extensions.yml
hooks:
  before_implement:
    - extension: "my-extension"
      command: "/my-before-hook"
      description: "在实现前执行检查"
      prompt: "运行实现前检查脚本"
      optional: false
      enabled: true
      condition: "hasBackendChanges"  # 可选，条件表达式
      
  after_implement:
    - extension: "my-extension"
      command: "/my-after-hook"
      description: "在实现后执行清理"
      prompt: "运行实现后清理脚本"
      optional: true
      enabled: true
```

---

## 钩子字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `extension` | string | 是 | 扩展名称标识符 |
| `command` | string | 是 | 要执行的命令（如 `/my-command`） |
| `description` | string | 是 | 钩子用途描述 |
| `prompt` | string | 是 | 执行提示文本 |
| `optional` | boolean | 是 | `false`=必须执行，`true`=可选执行 |
| `enabled` | boolean | 否 | 默认 `true`。设为 `false` 则跳过此钩子 |
| `condition` | string | 否 | 条件表达式（由 HookExecutor 评估） |

---

## 钩子执行逻辑

### 实现前钩子 (before_implement)

**执行时机**: Step 1 - 预执行检查阶段

**处理流程**:

1. 检查 `.specforge/extensions.yml` 是否存在
2. 加载 `hooks.before_implement` 配置
3. 过滤掉 `enabled: false` 的钩子（无 `enabled` 字段默认为 `true`）
4. 对于每个剩余钩子：
   - 如果有 `condition` 字段且非空，跳过（由 HookExecutor 评估）
   - 如果无 `condition` 字段或为空，标记为可执行

**输出格式**:

#### Optional 钩子 (`optional: true`)

```markdown
## Extension Hooks

**Optional Pre-Hook**: {extension}
Command: `/{command}`
Description: {description}

Prompt: {prompt}
To execute: `/{command}`
```

#### Mandatory 钩子 (`optional: false`)

```markdown
## Extension Hooks

**Automatic Pre-Hook**: {extension}
Executing: `/{command}`
EXECUTE_COMMAND: {command}

Wait for the result of the hook command before proceeding to the Outline.
```

**失败处理**:
- Mandatory 钩子失败 → **终止实现**
- Optional 钩子失败 → **继续执行**，记录警告

---

### 实现后钩子 (after_implement)

**执行时机**: Step 5 - 实现完成后

**处理流程**:

1. 检查 `.specforge/extensions.yml` 是否存在
2. 加载 `hooks.after_implement` 配置
3. 过滤掉 `enabled: false` 的钩子
4. 对于每个剩余钩子，按 `optional` 标志输出

**输出格式**:

#### Optional 钩子 (`optional: true`)

```markdown
## Extension Hooks

**Optional Hook**: {extension}
Command: `/{command}`
Description: {description}

Prompt: {prompt}
To execute: `/{command}`
```

#### Mandatory 钩子 (`optional: false`)

```markdown
## Extension Hooks

**Automatic Hook**: {extension}
Executing: `/{command}`
EXECUTE_COMMAND: {command}
```

**失败处理**:
- 实现后钩子失败 → **记录警告**（不阻断，因实现已完成）

---

## 常见用例

### 1. 代码格式检查（实现前）

```yaml
hooks:
  before_implement:
    - extension: "lint-checker"
      command: "/run-lint"
      description: "检查代码格式"
      prompt: "运行 ESLint/Prettier 检查"
      optional: false
```

### 2. 数据库迁移检查（实现前）

```yaml
hooks:
  before_implement:
    - extension: "db-migration"
      command: "/check-migrations"
      description: "检查待执行的数据库迁移"
      prompt: "验证数据库迁移脚本"
      optional: false
      condition: "hasDatabaseChanges"
```

### 3. 测试覆盖率报告（实现后）

```yaml
hooks:
  after_implement:
    - extension: "coverage-report"
      command: "/generate-coverage"
      description: "生成测试覆盖率报告"
      prompt: "运行覆盖率检查并生成报告"
      optional: true
```

### 4. 部署准备检查（实现后）

```yaml
hooks:
  after_implement:
    - extension: "deploy-check"
      command: "/verify-deploy-ready"
      description: "验证部署就绪状态"
      prompt: "检查构建产物和配置"
      optional: false
```

---

## 最佳实践

1. **保持钩子轻量**: 钩子应快速执行，避免长时间阻塞工作流
2. **明确错误信息**: 钩子失败时提供清晰的错误信息和修复建议
3. **合理使用 optional**: 
   - 关键门禁（lint、type check）→ `optional: false`
   - 辅助工具（报告生成、通知）→ `optional: true`
4. **条件评估**: 让 HookExecutor 处理 `condition` 评估，不要在命令模板中尝试解释条件表达式
5. **幂等性**: 钩子应支持重复执行而不产生副作用

---

## 故障排查

### 钩子未执行

**检查项**:
- [ ] `.specforge/extensions.yml` 文件存在且格式正确
- [ ] `enabled` 字段未设为 `false`
- [ ] 钩子配置在正确的 key 下（`before_implement` 或 `after_implement`）

### YAML 解析失败

**症状**: 钩子被静默跳过

**解决**: 使用 `yaml lint` 工具验证 `.specforge/extensions.yml` 格式

### 钩子执行失败

**Mandatory 钩子**:
- 检查命令是否存在且可执行
- 查看钩子输出的错误信息
- 修复问题后重新执行实现工作流

**Optional 钩子**:
- 失败不会阻断工作流
- 查看警告信息，决定是否手动修复
