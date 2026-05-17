# Frontmatter 规范

> 基于 `src/core/metadata-schema.ts` 的 `commandMetadataSchema`（要求 `type` 以 `-command` 结尾）。
> 这里给出必填字段、可选扩展、格式要点、常见错误。

---

## 必填字段（五项）

| 字段 | 类型 | 含义 | 约束 |
| ---- | ---- | ---- | ---- |
| `name` | string | 命令名 | kebab-case，与目录名**严格一致** |
| `type` | string | 命令类型 | `workflow-command` 或 `tool-command` |
| `description` | string | 触发描述 | 必须包含触发场景 + 中英关键词；≤ 200 字符 |
| `version` | string | 语义化版本 | `<MAJOR>.<MINOR>.<PATCH>`，首版 `1.0.0` |
| `author` | string | 作者标识 | 可填团队名或 handle |

---

## 可选扩展字段（推荐）

以下字段不是 schema 强制，但能提升可读性与机器可消费性：

```yaml
depends-on: []                        # 依赖的前置命令或技能
hands-off-to:                         # 完成后推荐的下一步命令（与 config.yaml handoffs 冗余但增强）
  - quality-verify (修复后验证)
  - evolution-retrospect (复杂问题沉淀)
```

> 若添加新字段，同步考虑是否需要更新 `src/core/metadata-schema.ts`。

---

## 格式要点

### 多行 description

长描述使用 YAML 折叠标量，保持 Level 1 可读：

```yaml
description: >-
  系统化调试工具——四阶段调试法(根因调查→模式分析→假设验证→实施修复),
  融合 root-cause-tracing、defense-in-depth、condition-based-waiting 三大技术。
  触发场景:"调试这个 bug"、"帮我排查问题"、"为什么报错"、"debug this"、"test failed"。
```

### 版本号

- 新命令从 `"1.0.0"` 起算。
- 破坏性结构调整（移除必需 Section）→ MAJOR +1。
- 新增 Step / 产物 / 清单 → MINOR +1。
- 措辞修订 / 排版修复 → PATCH +1。

### description 的触发词检查

好 description 必须满足三点：

1. **场景句**：用户会怎么说？（"调试这个 bug"）
2. **能力句**：命令能做什么？（"四阶段调试法"）
3. **关键词集**：中英混合至少 5 个触发词。

典型好例子：见 `templates/.specforge/commands/tools/debugging/debugging.md` 的 description。

---

## 常见错误（Anti-Patterns）

| 错误 | 表现 | 后果 | 纠正 |
| ---- | ---- | ---- | ---- |
| name 与目录不一致 | 目录 `foundation-init/`，frontmatter `name: foundation_init` | `quick_validate_command.py` 失败 | 同步改为 `foundation-init` |
| description 太泛 | `"SpecForge 命令"` | 触发失败 `specforge list --triggers` 查不到 | 补触发场景 + 关键词 |
| type 写错 | `type: workflow`（缺 `-command` 后缀） | Zod 校验失败 | 使用 `workflow-command` 或 `tool-command` |
| name 用下划线或驼峰 | `foundationInit` / `foundation_init` | 不符合 kebab-case | 改为 `foundation-init` |
| version 非字符串 | `version: 1.0.0`（YAML 数字） | Zod 要 string | 加引号 `"1.0.0"` |
| description 包含 `<` 或 `>` | 导致 HTML/Zod 解析异常 | 校验失败 | 改为全角 `《》` 或去掉 |
| description > 200 字符 | Level 1 过载 | 违反渐进式披露 | 把详情移入 Level 2 主体 |

---

## 自检

- [ ] 五个必填字段齐全？
- [ ] `name` 与目录名一致？
- [ ] `type` 带 `-command` 后缀？
- [ ] `description` 同时含触发场景 + 关键词 ≥ 5 个？
- [ ] `description` ≤ 200 字符？
- [ ] `version` 用字符串？
- [ ] `description` 无 `<` / `>`？

验证命令：

```bash
python scripts/quick_validate_command.py <command-directory>
```
