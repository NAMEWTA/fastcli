# Preamble 模式库（可执行前置块）

> preamble 是命令正文开头的 HTML 注释块（`<!-- preamble:bash ... -->`），
> 由 AI 在执行命令之前运行，用于完成：技能注入 / 前置产物检测 / 环境检测。
> **不是装饰，而是门禁。**

---

## 基本骨架

```markdown
<!-- preamble:bash
# 1) 技能注入（按命令特性调整触发词）
specforge list --skills --triggers=<逗号分隔触发词> --format=json

# 2) 前置产物检测（仅 workflow-command 适用）
specforge status --phase=<phase> --check-requires

# 3) 环境检测
specforge doctor --check-deps --quiet
-->
```

一个合格的 preamble **至少命中一项**，推荐三项全中。

---

## 触发词矩阵（workflow-command）

基于 `src/services/command-service.ts` 的 `WORKFLOW_TRIGGER_MAP` 对照：

| 命令 | 触发词 | Phase |
| ---- | ------ | ----- |
| `foundation-init` | `init,foundation,project,setup` | （无前置阶段） |
| `requirements-clarify` | `clarify,specify,brainstorm,requirements` | requirements |
| `design-explore` | `architecture,design,interface,contract` | design |
| `planning-breakdown` | `tasks,breakdown,planning,complexity` | planning |
| `implementation-build` | `implement,subagent,tdd,build` | implementation |
| `quality-verify` | `verify,test,review,checklist,qa` | quality |
| `release-deploy` | `release,deploy,ship,publish,runbook,monitor` | release |
| `evolution-retrospect` | `retrospective,learn,improve,evolve,tune` | evolution |

---

## 触发词矩阵（tool-command）

| 命令 | 触发词 |
| ---- | ------ |
| `debugging` | `debug,bug,fix,排查,调试` |
| `documentation` | `文档,规范,documentation,写作` |
| `review` | `review,quality,coherence,一致性,审查` |
| `qa` | `qa,test,verify,回归,质量` |
| `worktree` | `worktree,branch,change,并行,分支` |

**新增 tool-command 时：**
- 中英关键词各加 2-3 个。
- 命中“动作”和“名词”：如 `debug`（动词）+ `调试`（名词）。

---

## 前置产物检测模式

### 标准（workflow-command）

```bash
specforge status --phase=<phase> --check-requires
```

### 指定产物（更严格）

```bash
specforge status --check-artifacts=proposal,design,tasks
```

### 场景化（tool-command）

```bash
# debugging 需要测试报告或错误日志
specforge status --check-artifacts=test-report,error-log --quiet
```

### 上下文加载（可选）

```bash
# 在 preamble 末尾附加自定义加载
if [ -f "specforge/config.yaml" ]; then
  echo "=== 项目错误字典 ==="
  grep -A 5 "^errors:" specforge/config.yaml || echo "未定义项目错误"
fi
```

---

## 环境检测模式

```bash
# 基础：只检查依赖
specforge doctor --check-deps --quiet

# 语言无关 + 深度
specforge doctor --check-node --check-python --check-compat --quiet

# 禁止破坏性覆盖
specforge doctor --check-compat
```

---

## 完整真实范例（来自 debugging.md）

```markdown
<!-- preamble:bash
# 技能注入 — 匹配调试/排查相关技能
specforge list --skills --triggers=debug,bug,fix,排查,调试,test,失败 --format=json

# 前置产物检测 — 检查是否有测试报告/错误日志
specforge status --check-artifacts=test-report,error-log --quiet

# 环境检测
specforge doctor --check-node --check-deps --quiet

# 上下文加载 — 读取项目配置中的错误字典
if [ -f "specforge/config.yaml" ]; then
  echo "=== 项目错误字典 ==="
  grep -A 5 "^errors:" specforge/config.yaml || echo "未定义项目错误"
fi
-->
```

---

## 反模式

| 反模式 | 为什么错 |
| ------ | -------- |
| 空 preamble（只有 `echo "开始"`） | 装饰性，没执行任何检测 |
| 把大段 shell 脚本塞进 preamble | 应迁移到 `scripts/` 后从 preamble 调用 |
| 触发词全英文或全中文 | 国内外团队任意一方不触发 |
| 触发词少于 3 个 | 召回率低，`specforge list --triggers` 经常 miss |
| 包含 `rm` / `curl` 等副作用强的命令 | preamble 应只检测，禁止变更状态 |

---

## 自检

- [ ] 至少完成“技能注入 / 前置产物 / 环境检测”一项？
- [ ] 触发词中英各至少 2 个？
- [ ] 无副作用命令（rm / curl / write）？
- [ ] `specforge status` / `specforge doctor` 的参数与 CLI 现有实现一致？
