# Handoff 设计（机器源 + 文字层）

> 目标：命令完成后让 AI 清楚“下一步该做什么、为什么”。
> 原则：**handoff 必须从机器源读取**，文档只承载文字说明。

---

## 三条核心原则

1. **可执行**：明确下一步命令与理由，AI 可以直接执行。
2. **单一事实源**：`handoffs` 的唯一权威在 `.specforge/config.yaml`，命令正文只承载文字。
3. **避免选择瘫痪**：推荐 1-2 个默认选项，多余路径放在 references。

---

## 机器源（`.specforge/config.yaml`）

```yaml
handoffs:
  design-explore:
    next:
      - command: planning-breakdown
        reason: "契约与错误策略明确后进入任务拆解。"
        loadSkills:
          - "workflow-steps/language-adapters"
  foundation-init:
    next:
      - command: requirements-clarify
        reason: "初始化完成后进入需求澄清与方案探索。"
        loadSkills:
          - "workflow-steps/git-commit-template"
```

`next` 是一个数组，允许多条。每条包含：

| 字段 | 必填 | 含义 |
| ---- | ---- | ---- |
| `command` | 是 | 下一步命令 ID（与目录名一致） |
| `reason` | 是 | 一句话说明为什么接力到这个命令 |
| `loadSkills` | 否 | 进入下一命令时需要注入的技能列表 |

---

## 文字层（在命令正文里）

### 标准写法（默认推荐）

```markdown
## 完成衔接（handoff）

**下一步**：按 `.specforge/config.yaml` 的 `handoffs.design-explore.next` 推荐执行。
- 默认：`planning-breakdown` —— 契约与错误策略明确后进入任务拆解。
```

### 多分支写法（有条件选择）

```markdown
## 完成衔接（handoff）

按问题严重度选择下一步：

- 修复已合并 → `quality-verify`（验证回归）
- 根因涉及架构缺陷 → `design-explore`（补设计）
- 属于典型经验 → `evolution-retrospect`（沉淀到 context）
```

注意：多分支必须是真实差异，不要为了炫技塞 3 条都差不多的路径。

---

## 禁止事项

- ❌ 硬编码 "下一步 `planning-breakdown`" 而不指向 config.yaml
- ❌ 在命令正文里同时定义 handoff 的字段（与 config.yaml 分叉）
- ❌ 给出超过 3 条默认 next（选择瘫痪）
- ❌ handoff 指向一个不存在的命令（`quick_validate_command.py` 未来可扩展校验）

---

## 新增命令时的 handoff checklist

- [ ] 在 `.specforge/config.yaml` 的 `handoffs` 里添加新命令条目。
- [ ] `next` 数组至少一条。
- [ ] 每条 `next` 指向的 `command` 存在于模板目录下。
- [ ] 命令正文用 “按 config.yaml 的 handoffs.XXX.next 推荐执行”。
- [ ] 反向确认：上游命令的 `handoffs.*.next` 是否也包含了本命令（如果本命令是某个阶段的下一步）。

---

## 完整范例

```yaml
# .specforge/config.yaml 片段
handoffs:
  implementation-build:
    next:
      - command: quality-verify
        reason: "实现完成后进入测试审查与验证闭环。"
```

```markdown
<!-- templates/.specforge/commands/workflow/implementation-build/implementation-build.md -->
## 完成衔接（handoff）

**下一步**：按 `.specforge/config.yaml` 的 `handoffs.implementation-build.next` 推荐执行，默认 `quality-verify`。
- 原因：实现完成后进入测试审查与验证闭环。
```
