# 命令模板反模式集

> 写命令时最常掉进去的坑。每一条给出表现、代价与改造方向。

---

## 反模式 1：口号式 Iron Law

**表现：**

```markdown
## Iron Law

> 我们必须认真对待质量。
```

**代价：** 无法阻断任何具体行为，AI 读完就翻页。Iron Law 退化成装饰。

**改造：** 明确“什么情况下**必须停**”。

```markdown
## Iron Law

> **无新验证证据，禁止声称完成。**
> 验证证据 = 你亲自运行过的命令输出 PASS（或等价日志），而非 agent 自述。
```

---

## 反模式 2：描述式 Step（不可执行）

**表现：**

```markdown
## Step 1: 理解需求

了解业务背景很重要。需求澄清需要考虑多方利益相关者。
```

**代价：** 没有动词、没有复选框，AI 无法判断完成状态。

**改造：** 每个 Step 是可打勾的动作。

```markdown
## Step 1: 需求盘点

- [ ] 从 `specforge/brainstorming/` 读取相关头脑风暴文档。
- [ ] 列出 3 类利益相关者：用户 / 运营 / 合规。
- [ ] 为每类利益相关者写一条"反对意见"作为风险。
```

---

## 反模式 3：产物清单只写名字

**表现：**

```markdown
## 产物清单

- design.md
- adr.md
```

**代价：** 路径不定、字段不定，不同项目放不同位置，接力阶段找不到。

**改造：** 路径 + 必需章节。

```markdown
## 产物清单

- **设计文档**：`specforge/changes/<change-id>/design.md`
  - 必需章节：架构概览 / 接口契约 / 错误策略 / 数据流 / 测试策略
- **架构决策**：`specforge/context/decisions/ADR-<YYYYMMDD>-<short>.md`
  - 必需章节：决策 / 备选 / 影响 / 验证方式
```

---

## 反模式 4：硬编码 handoff

**表现：**

```markdown
## 完成衔接

下一步执行 `planning-breakdown`。
```

**代价：** 当 `.specforge/config.yaml` 的 `handoffs` 更新时，文档与机器源分叉。

**改造：** 引用配置。

```markdown
## 完成衔接（handoff）

**下一步**：按 `.specforge/config.yaml` 的 `handoffs.design-explore.next` 推荐执行，默认 `planning-breakdown`。
```

---

## 反模式 5：跨语言 CLI 硬编码

**表现：**

```markdown
- [ ] 运行 `npm test && npm run lint`。
```

**代价：** SpecForge 是语言无关的；Python / Java 项目执行不了。

**改造：** 抽象动词 + 引用 language-adapters。

```markdown
- [ ] 运行"测试 + Lint"；具体命令见 `skills/workflow-steps/language-adapters/<lang>.md`。
```

---

## 反模式 6：巨型正文（拒绝拆分）

**表现：** 单个 `.md` 1200 行，涵盖从理论到示例。

**代价：** Level 2 加载爆炸；AI 在海量上下文里迷失重点。触发 `E005_contextOverload`。

**改造：** 按主题切到 `references/`，主体留导航表。详见 `progressive-disclosure.md`。

---

## 反模式 7：孤岛 references 文件

**表现：** `references/patterns.md` 存在但主体没有任何链接。

**代价：** AI 不会读取它，等于不存在。维护成本仍在。

**改造：** 所有 Level 3 文件必须在主体的 “References 导航” 表里出现。

---

## 反模式 8：装饰性 preamble

**表现：**

```markdown
<!-- preamble:bash
echo "开始执行命令"
-->
```

**代价：** 没做任何检测、注入、校验，只是占位。

**改造：** preamble 必须完成至少一项：
- 技能注入（`specforge list --skills --triggers=...`）
- 前置产物检测（`specforge status --phase=... --check-requires`）
- 环境检测（`specforge doctor --check-deps`）

---

## 反模式 9：占位符留存

**表现：** 入库版本仍有 `[TODO]` / `<TODO: ...>` / `待补充`。

**代价：** `init_command.py` 生成的占位符是起点；版本库看到就是未完成。`quick_validate_command.py` 会报错。

**改造：** 在提交前全文搜 `TODO`、`占位`、`待补`。

---

## 反模式 10：错误字典滥造

**表现：** 命令里写 `E999_myCustomError`，但 `.specforge/config.yaml` 里没有。

**代价：** 错误字典失去一致性；无法统一诊断。

**改造：** 先到 `.specforge/config.yaml` 的 `errors` 增编号，再在命令里引用。

---

## 反模式 11：反规避只有一行

**表现：**

```markdown
## 反规避提醒

不要偷懒。
```

**代价：** 没有直面真实的规避借口，等同没写。

**改造：** 列“借口 vs 现实”表，每条至少 2 列。

```markdown
| 借口 | 现实 |
| ---- | ---- |
| "这个 bug 很简单，不用走完整流程" | 简单的 bug 往往有更深的根源。10 分钟调查 > 2 小时盲目修复 |
| "我先试几个可能的修复" | 在没有诊断的情况下一通乱试 = 在黑暗中开枪 |
```

---

## 反模式 12：把技能的内容塞进命令

**表现：** 命令正文详细讲"怎么做架构审查"，塞进 400 行方法论。

**代价：** 命令是**指令**，技能是**上下文**。方法论该在技能里，命令只 `specforge list --skills` 注入。

**改造：** 把方法论抽到 `skills/architecture/*`，命令里只写“何时调用 + 输入 + 输出 + 门禁”。

---

## 快速自检

- [ ] Iron Law 有没有"必须/禁止"这类阻断性动词？
- [ ] 每个 Step 是不是动词开头 + 复选框？
- [ ] 产物清单有路径和章节吗？
- [ ] handoff 引用配置了吗？
- [ ] 有硬编码单一语言 CLI 命令吗？
- [ ] 主体有没有超过 500 行？
- [ ] 所有 `references/*.md` 都从主体能链到吗？
- [ ] preamble 是不是真的做了检测？
- [ ] 还有 `TODO` 吗？
- [ ] 错误码都在 `.specforge/config.yaml` 里吗？
- [ ] “反规避”是不是“借口 vs 现实”表？
- [ ] 方法论是不是塞错了位置（应该在 skills 里）？
