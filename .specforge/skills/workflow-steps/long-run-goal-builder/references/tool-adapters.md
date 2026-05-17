# 工具适配（Phase 2 配方）

> 在 Phase 2 加载本文件。本文件给出"同一份 5 段式 goal 在不同长跑工具下的最小改写方案"——默认按 Codex CLI 输出，其他工具在最终渲染时做最小差异调整。

## 1. 适配总览

| 工具 | 长跑机制 | 是否原生支持 `/goal` | 关键改写 |
|------|---------|------------------|---------|
| Codex CLI 0.128+ | `/goal` + `continuation.md` 审计循环 | 是（首选）| 不改写，原样输出 |
| Claude Code | 长任务 / Task / sub-agents | 否 | 去掉 `/goal` 前缀，去掉 `Use a token budget`；改成"任务说明书"风格 |
| Cursor | Agent / Composer 长任务 | 否 | 同上；额外精简 Constraints 和健康守则到 3 条以内 |
| Kiro | spec / vibe + autopilot | 否 | 倾向走 SDD spec → 场景 B；spec 路径用相对路径 |
| 通用 LLM（多轮人工接力） | 无原生 | 否 | Stop if 改成"汇报后等指令" |

**默认**：直接输出 Codex CLI 形态。如果用户明确说自己用其他工具，按下表改写。

---

## 2. Codex CLI 0.128+

### 2.1 形态

完整保留 5 段式 + `Use a token budget of N tokens for this goal.` 行。这一行是 Codex CLI 0.128 的原生语法，会被运行时识别。

### 2.2 健康守则块的写法

直接放在 token budget 行的**前面**，作为 goal 文本的一部分。`continuation.md` 审计循环会把它当作长期约束来检查：

```
【健康守则】
- 每完成一项 Done when 子项后：心跳 + commit。
- 同根因连续失败 ≥ 2 次：停下汇报与已试方案的差异，等指令。
- 剩余预算 < 20%：停下汇报已完成 / 未完成 + 推荐拆分点。

Use a token budget of 80000 tokens for this goal.
```

### 2.3 First action 的特殊用法

Codex CLI 对"First action: 读 X 报数"模式响应良好（场景 B 推荐）。其他工具对这种"分两步走"的模式接受度较低，需要显式拆成两条指令。

---

## 3. Claude Code

### 3.1 形态改写

Claude Code 没有 `/goal` 关键字，需要把 5 段式改写成"任务说明书"形式。**改写规则**：

| Codex /goal | Claude Code 改写 |
|------------|-----------------|
| `/goal <objective>。` | `# 任务\n\n<objective>。` |
| `Scope: ...` | `## 范围\n\n...` |
| `Constraints: - ...` | `## 约束\n\n- ...` |
| `Done when: 1. ...` | `## 验收标准\n\n1. ...` |
| `Stop if: - ...` | `## 何时停下汇报\n\n- ...` |
| `Use a token budget of N tokens.` | （删除——Claude Code 无原生预算指令）|

### 3.2 Sub-agent 调用建议

如果用户在用 Claude Code 的 sub-agent 模式（Task 工具 / context-gatherer 等），把 First action 改写成：

```
请先用 sub-agent 收集以下文件并回报计数：
  - <file1>
  - <file2>
等回报完成后再开始实现。
```

不要让主 agent 自己读——sub-agent 隔离能保住主上下文。

### 3.3 心跳改写

Claude Code 的心跳要写得**比 Codex 更具指令性**（Claude 默认更"自由"）：

```
每完成一项验收标准后，必须明确回报：
  1. 当前在第几条验收
  2. 本次修改的文件清单（绝对路径）
  3. 已用 token 估算 / 总预算
  4. 是否仍在范围内（复述范围一句）
```

---

## 4. Cursor

### 4.1 上下文紧的事实

Cursor Agent / Composer 的有效上下文窗口比 Codex / Claude Code 紧得多（通常 ≤ 100K 实际可用），所以：

- **Constraints 收敛到 3-5 条**（最关键的）
- **健康守则收敛到最小可用形态**（heartbeat / anti-loop / token guard 三条）
- **First action 不读 5 个以上文件**——Cursor 经常会在读完后丢失目标

### 4.2 形态改写

与 Claude Code 大致一致，但所有段落标题用更短的形式：

```
# <objective>

范围：<scope>

不要做：
- ...

完成标志：
1. ...

何时停下：
- ...

注意：
- 每改 1 项立即 commit
- 同根因失败 2 次停下汇报
```

---

## 5. Kiro

### 5.1 走 SDD spec 优先

Kiro 是规格驱动的 IDE。如果用户想"长跑写一个新功能"，**优先建议先用 spec**（`.kiro/specs/<name>/`），再用本技能生成 goal 走场景 B。

### 5.2 形态改写

Kiro autopilot 模式接受 markdown 任务说明书。形态与 Claude Code 类似，但额外注意：

- spec 路径用 `.kiro/specs/<name>/` 而非硬编码绝对路径
- 健康守则中"commit"改写时考虑 Kiro git_safety（避免直推 main）
- Stop if 中可以加"出现 .kiro/specs/<name>/ 之外的文件被修改 → 停下"

### 5.3 与 spec 联动

```
First action: 先读以下 spec 文件并回报计数：
  - .kiro/specs/<name>/requirements.md
  - .kiro/specs/<name>/design.md
  - .kiro/specs/<name>/tasks.md
等我确认后再开始实现。
```

---

## 6. 通用 LLM（多轮人工接力）

### 6.1 适配前提

用户没有持续运行的 agent，每轮都要手动复制粘贴。这种情况下"长跑"靠人工接力——本技能仍然有效，但 Stop if 的语义变了：

| Codex 语义 | 通用 LLM 语义 |
|-----------|--------------|
| 自动停下 | 在回复末尾说"我应当停下，等你指令" |
| 自动汇报 | 必须显式 print 汇报内容 |
| 自动恢复 | 不存在——下一轮由用户决定 |

### 6.2 改写

把 Stop if 改写为：

```
出现以下情况时，请在回复末尾**用一段独立段落**说明并等我指令：
- ...
```

加一条"对话规约"：

```
每轮回复末尾固定输出一段心跳（即使本轮没修改任何文件）：
  当前进度 / 下一步计划 / 是否需要我决策。
```

---

## 7. 跨工具迁移建议

如果用户说"我从 X 切到 Y"，给出的迁移清单：

1. 改写 5 段式标题（按上面表）
2. 调整健康守则（按工具差异表）
3. 重新评估 token budget（不同工具可用窗口不同）
4. **保留** Done when / Stop if 内容——这些是工具无关的，迁移成本最低
5. 提醒用户：如果之前已经在 X 上跑过一段，先把 PROGRESS.md / 当前 commit 状态同步到 Y，否则会从头跑

---

## 8. 反模式

| 反模式 | 修法 |
|-------|------|
| 把 Codex `/goal` 原样塞给 Cursor | Cursor 不识别这个语法，按本文件 § 4 改写 |
| 给 Claude Code 加 `Use a token budget of N` | Claude Code 不原生支持，删除或改写为软提示（"请尽量在 N token 内完成"）|
| 跨工具迁移时改 Done when 内容 | Done when 是工具无关的，改它会丢失审计基础——只改包装，不改内容 |
| 在 Kiro 上把 spec 路径写绝对路径 | Kiro spec 是相对当前 workspace 的，用相对路径 |
| 让用户"自己挑工具适配"——本技能必须主动给适配建议 | Phase 2 选完场景后必问"你用哪个工具" |
