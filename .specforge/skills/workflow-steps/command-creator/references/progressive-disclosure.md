# 渐进式披露（Level 1 / 2 / 3 拆分判定）

> 渐进式披露是 SpecForge 不与上下文斗争的关键机制。
> 三级契约对齐 `.specforge/config.yaml → rules.global.progressiveDisclosure`。

## 三级契约（一页速览）

| 级别 | 加载时机 | 位置 | 体量 | 允许放什么 |
| ---- | -------- | ---- | ---- | ---------- |
| **Level 1** | 始终加载 | frontmatter (name / type / description) | description ≤ 200 字符 | 一句话定位 + 触发词 |
| **Level 2** | 命中触发后加载 | command.md 主体 | ≤ 500 行 | Iron Law、Steps、产物清单、handoff、反规避、导航表 |
| **Level 3** | 按需加载 | `references/` / `scripts/` / `assets/` | 不限 | 长清单、模式库、脚本、样板资产 |

---

## 判定流程：一条内容该放哪里？

```
是"触发/发现"用的词吗？  ──是──→ Level 1（description 关键词）
         │
         否
         ↓
是"执行/阻断/验证"用的动作或规则吗？
         │
         是 ──→ 能 ≤ 3 行说清？ ──是──→ Level 2
         │                     │
         │                     否（成组/分类/多达 10 条）
         │                     ↓
         │                  Level 3（references/）
         ↓
       否
       ↓
  是"重复的确定性操作"吗？
         │
         是 ──→ Level 3（scripts/）
         │
         否 ──→ 删除（AI 不需要的背景）
```

---

## 拆分触发时机

必须拆到 Level 3 的硬指标：

- [ ] 主体行数 > 500 行（`doctor --check-disclosure` 会告警）
- [ ] 单个 Section 超过 80 行
- [ ] 同一主题出现 ≥ 10 条并列条目（典型：模式清单、陷阱清单、适配表）
- [ ] 出现跨语言/跨技术栈的实现细节
- [ ] 出现与本命令核心流程无关的背景知识

---

## 拆分前后对比（真实示范）

### ❌ 拆分前：Level 2 里塞了全部反模式

```markdown
## 常见陷阱

陷阱 1：空指针污染 ... （40 行）
陷阱 2：竞态条件 ...  （38 行）
陷阱 3：环境差异 ...  （35 行）
...
陷阱 12：时钟漂移 ... （30 行）
```

主体瞬间 400 行仅反模式一节。

### ✅ 拆分后：Level 2 保留导航，Level 3 承载细节

**Level 2 主体：**

```markdown
## 常见陷阱

本阶段有 12 类典型陷阱，按发生场景分类：空值 / 并发 / 环境 / 时序。
遇到疑似陷阱时，参考 `references/debugging-patterns.md` 对照识别。
```

**Level 3 `references/debugging-patterns.md`：**

```markdown
# 调试常见陷阱（12 类）

## 空值类陷阱
... 详细展开 ...

## 并发类陷阱
... 详细展开 ...
```

这样 Level 2 只扣掉 3 行预算；Level 3 按需加载。

---

## references/ 的组织原则

- **一主题一文件**：`review-dimensions.md`、`retrospective-patterns.md`，名字即内容。
- **扁平结构**：禁止 `references/sub/deep/nested.md`；所有文件直接从主体链接。
- **长文件加目录**：单文件超过 100 行时，开头加 TOC，便于 AI 预览。
- **首行要有描述**：第一行 `> 本文档解决什么问题`，让 AI 预览就能决定是否深入阅读。

---

## scripts/ 的拆分原则

- **一个脚本一个职责**：`add-diagnostic-logs.sh` 只加日志；`find-polluter.sh` 只找污染测试。
- **有 `--help`**：脚本必须支持 `-h`/`--help`，输出用法与参数。
- **幂等优先**：同一输入重复执行不应产生副作用（如目录重复创建报错）。
- **路径 portable**：不要硬编码 `/Users/...`；用 `$(git rev-parse --show-toplevel)` 之类的方式定位工程根。

---

## 自检

- [ ] frontmatter.description ≤ 200 字符且含触发词？
- [ ] 主体 ≤ 500 行？
- [ ] 每个新建 `references/*.md` 都有主体链接？
- [ ] 每个新建 `scripts/*` 都有主体引用？
- [ ] 没有出现深层嵌套引用（主体 → refA → refB）？

任何一项未过 → 触发 `E005_contextOverload`。
