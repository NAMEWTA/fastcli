---
name: skill-creator
type: workflow-step
description: >-
  创建、编辑、改进或审计 SpecForge 技能（skill）。当需要从零创建新技能，或被要求优化、
  审查、清理、重构已有技能或 SKILL.md 时使用。同样适用于技能目录的整理（把文件迁移到
  references/ 或 scripts/、删除过时内容、按 SpecForge 契约校验）。触发词：创建技能、
  新建 skill、优化这个技能、审查技能、整理技能、清理 SKILL.md。
version: "1.0.0"
author: "wta"
---

# 技能创建者（Skill Creator）

本技能提供创建高质量 SpecForge 技能的规范与流程。**面向 AI 代理执行**，使用时请遵守"渐进披露 + 简洁优先"两条主线。

## 1. 技能是什么

技能（Skill）是模块化、自包含的能力包，为 AI 代理扩展领域知识、工作流与工具集。把它当作某个领域或任务的"上岗手册"——技能让通用代理具备特定场景下的程序性知识。

**技能提供四类价值：**

1. **专业工作流**：多步骤领域过程
2. **工具集成**：处理特定格式或 API 的说明
3. **领域专长**：项目私有的 schema、业务规则、合规政策
4. **打包资源**：脚本、参考文档、模板资产

## 2. SpecForge 技能分配规则（务必遵守）

SpecForge 按 `type` 字段把技能分配到 `.specforge/skills/` 下的固定类别目录。**新建技能必须落入下表对应的目录**，否则会被 `specforge list / status / doctor` 忽略或归类错误。

| 技能 `type` | 目录名 | 典型场景 |
|--------------|--------|---------|
| `domain-rule` | `.specforge/skills/domain-rules/` | 业务/行业规则、流程公约 |
| `code-style` | `.specforge/skills/code-styles/` | 编码风格、命名约定、重构偏好 |
| `architecture-rule` | `.specforge/skills/architecture/` | 架构决策、模块分层、技术选型 |
| `testing-rule` | `.specforge/skills/testing/` | 测试策略、覆盖率要求、用例模板 |
| `security-rule` | `.specforge/skills/security/` | 安全基线、鉴权、密钥管理 |
| `ui-ux-rule` | `.specforge/skills/ui-ux/` | 界面风格、交互规范、可访问性 |
| `workflow-step` | `.specforge/skills/workflow-steps/` | 生命周期步骤、工具型工作流（如本技能） |

**两种创建路径（二选一，优先 A）：**

**A. 使用 CLI（推荐，内置类型路由）**

```bash
specforge add-skill <skill-name> --type <skill-type>
```

CLI 会自动把目录创建在正确的类别下，并写入符合 SpecForge 约定的 5 字段 frontmatter。

**B. 使用脚本（含资源脚手架）**

当需要同时初始化 `scripts/ / references/ / assets/` 或示例文件时，用随本技能分发的脚本：

```bash
python scripts/init_skill.py <skill-name> --type <skill-type> [--resources scripts,references,assets] [--examples]
```

脚本默认把技能放到 `.specforge/skills/<类别目录>/<skill-name>/`，并生成符合 SpecForge 规范的 SKILL.md 骨架。

**选择准则：** 只需要最小 SKILL.md → 走路径 A；需要附带脚本或参考文档 → 走路径 B。

## 3. 核心原则

### 3.1 简洁即王道

上下文窗口是公共资源，技能要与系统提示、会话历史、其他技能元数据、用户请求共享这份预算。

**默认前提：AI 代理已经足够聪明。** 只写代理不具备的知识。对每段内容质问："代理真的需要这段解释吗？""这段话的 token 成本值得吗？"

优先用简洁示例替代冗长说明。

### 3.2 给出合适的自由度

根据任务的脆弱性与多样性选择指令强度：

- **高自由度（纯文字建议）**：多种做法都合理、需要依据上下文灵活判断
- **中自由度（伪代码或带参数的脚本）**：存在优选模式、但允许一定变化
- **低自由度（固定脚本、少量参数）**：操作脆弱易错、顺序或结果必须一致

把代理当作"在路径上探路"：悬崖上的独木桥要栏杆（低自由度），开阔原野允许多条路径（高自由度）。

### 3.3 渐进披露三级契约

| 层级 | 何时加载 | 内容 | 约束 |
|------|---------|------|------|
| L1 始终加载 | 对话开始即进入上下文 | YAML frontmatter 的 `name` + `type` + `description` | description ≤ 200 字 |
| L2 命中触发 | 技能被触发后 | SKILL.md 正文 | ≤ 500 行 |
| L3 按需加载 | 代理判断需要时 | `references/` / `scripts/` / `assets/` | 必须从 L2 被引用 |

违反此契约会触发 `specforge doctor --check-disclosure` 的告警。

## 4. 技能结构（解剖）

```
<skill-name>/
├── SKILL.md                 # 必须
│   ├── YAML frontmatter     # 必须（SpecForge 5 字段）
│   └── Markdown 正文        # 必须
└── 打包资源（可选）
    ├── scripts/             # 可执行代码（Python/Bash 等）
    ├── references/          # 供代理按需读入上下文的文档
    └── assets/              # 出现在代理产物里的文件（模板/图标/字体等）
```

### 4.1 frontmatter（SpecForge 统一 5 字段）

**所有 SpecForge 技能必须包含 5 个字段**（见仓库 `AGENTS.md`）：

```yaml
---
name: <skill-name>             # kebab-case，小写字母/数字/连字符
type: <skill-type>             # 见第 2 节映射表中的 7 个取值
description: >-                # ≤ 200 字，说明"做什么"+"何时用"+触发词
  简述技能能力与适用场景。触发词：xx、yy、zz。
version: "1.0.0"               # 语义化版本
author: "<作者标识>"            # 作者或团队标识
---
```

**`description` 写作要点：**

- 同时覆盖"做什么"与"何时触发"
- 把所有"何时使用"的信息放进 description，**不要**放到正文里（正文是触发后才加载的，"何时使用"章节对代理毫无帮助）
- 列出明确的触发词或场景，便于代理匹配
- 示例：
  ```yaml
  description: >-
    创建、编辑、分析 .docx 文档，支持修订、批注、格式保留与文本抽取。
    触发场景：(1) 创建新文档；(2) 修改内容；(3) 处理修订；(4) 添加批注。
    触发词：docx、Word、修订记录、文档批注。
  ```

### 4.2 scripts/（按需）

存放确定性可执行代码，适用于需要可重复、可靠输出的任务。

- **何时加入**：相同代码被反复撰写 / 需要确定性结果
- **收益**：节省 token、执行结果确定、可直接运行无需读入上下文
- **注意**：代理仍可能读取脚本以便打补丁或适配环境
- **示例**：`scripts/rotate_pdf.py`、`scripts/init_skill.py`

### 4.3 references/（按需）

放代理按需读入上下文的参考资料。

- **何时加入**：代理工作时需要查阅的领域文档
- **典型用途**：数据库 schema、API 文档、公司政策、工作流手册
- **收益**：让 SKILL.md 保持精简，文档仅在代理判断需要时加载
- **大文件建议**：单文件 > 10k 字时在 SKILL.md 里提供 grep 关键词
- **去重原则**：同一信息只在 SKILL.md 或 references 之一出现，不要重复；SKILL.md 只保留核心流程与导航，细节下沉到 references

### 4.4 assets/（按需）

不进入代理上下文、但会出现在代理最终产物里的文件。

- **何时加入**：技能需要输出模板、图片、字体等
- **典型用途**：PPT 模板、品牌 logo、前端脚手架、字体文件
- **示例**：`assets/slides-template.pptx`、`assets/logo.png`、`assets/hello-world/`（HTML/React 模板）

### 4.5 不要包含什么

技能目录只留直接支撑功能的文件。**不要**创建额外文档，例如：

- `README.md`
- `INSTALLATION_GUIDE.md`
- `QUICK_REFERENCE.md`
- `CHANGELOG.md`

这些只会增加噪音。技能只需要"让 AI 代理把活干好"的信息——创建过程记录、测试说明、用户指南统统不属于这里。

## 5. 渐进披露设计模式

SKILL.md 正文保持在 500 行以内；接近上限时把内容拆到独立文件。**拆分后必须在 SKILL.md 里引用并说明何时读取**，否则代理根本不知道它们的存在。

**关键原则**：当技能支持多种变体、框架或选项时，SKILL.md 只保留"核心工作流 + 选型指引"，把变体细节（模式、示例、配置）拆到独立参考文件。

### 模式一：主干 + 参考文档

```markdown
# PDF 处理

## 快速开始

使用 pdfplumber 抽取文本：[代码示例]

## 进阶能力

- **表单填写**：详见 [FORMS.md](FORMS.md)
- **API 参考**：详见 [REFERENCE.md](REFERENCE.md)
- **常见模式**：详见 [EXAMPLES.md](EXAMPLES.md)
```

代理仅在需要时才加载 FORMS.md / REFERENCE.md / EXAMPLES.md。

### 模式二：按领域组织

多领域技能按领域拆文件，避免加载无关上下文：

```
bigquery-skill/
├── SKILL.md                  # 总览 + 导航
└── references/
    ├── finance.md            # 营收、计费指标
    ├── sales.md              # 商机、管线
    ├── product.md            # API 调用、功能使用
    └── marketing.md          # 投放、归因
```

问销售指标时，代理只读 `sales.md`。

多框架/多变体同理：

```
cloud-deploy/
├── SKILL.md                  # 工作流 + 供应商选型
└── references/
    ├── aws.md                # AWS 部署模式
    ├── gcp.md                # GCP 部署模式
    └── azure.md              # Azure 部署模式
```

### 模式三：条件式细节

主体只展示基本内容，高级场景链出去：

```markdown
# DOCX 处理

## 创建文档

新建用 docx-js，详见 [DOCX-JS.md](DOCX-JS.md)。

## 编辑文档

简单修改直接改 XML。

**修订追踪**：详见 [REDLINING.md](REDLINING.md)
**OOXML 细节**：详见 [OOXML.md](OOXML.md)
```

### 关键准则

- **引用只允许一级**：所有 references 直接从 SKILL.md 链接，不要嵌套。
- **长文件加目录**：单文件 > 100 行时在顶部放目录，便于代理预览时掌握全貌。

## 6. 技能创建 6 步流程

按顺序执行，除非有明确理由可跳过。

1. 用具体示例理解技能
2. 规划可复用的技能内容（脚本 / 参考 / 资产）
3. 初始化技能（CLI 或脚本）
4. 编辑技能（实现资源并撰写 SKILL.md）
5. 打包技能（`package_skill.py`）
6. 基于真实使用迭代

### 6.0 命名规范

- **只用**小写字母、数字、连字符；用户给的标题先规范化成 kebab-case（例："Plan Mode" → `plan-mode`）
- 长度 ≤ 64 字符
- 优先使用简短、动词开头的短语
- 必要时加工具前缀提升可辨识度（例：`gh-address-comments`、`linear-address-issue`）
- **技能目录名与 `name` 必须完全一致**

### 6.1 第一步：用具体示例理解技能

当技能用途已很清晰时可跳过；但对已有技能审计时仍建议执行。

通过具体的使用示例来理解技能——可以是用户提供的，也可以是代理生成的、经用户确认的。

以 `image-editor` 为例，合适的澄清问题：

- "这个 image-editor 要支持哪些能力？编辑、旋转，还是其他？"
- "能举几个典型使用场景吗？"
- "我设想用户会说'帮我去除红眼'或'把这张图旋转 90°'。还有其他触发方式吗？"
- "什么样的表述应该触发这个技能？"

避免一次性抛出过多问题；先问最关键的，按需追问。

当对技能该支持的能力有清晰共识时，结束此步。

### 6.2 第二步：规划可复用的技能内容

把每个具体示例逐条分析：

1. 设想从零执行这个示例的完整过程
2. 识别哪些脚本 / 参考 / 资产在反复执行时会有帮助

示例 1：`pdf-editor` 处理"帮我旋转 PDF"：

1. 旋转 PDF 每次都要重写类似代码
2. 加 `scripts/rotate_pdf.py`

示例 2：`frontend-webapp-builder` 处理"做个 todo app"：

1. 前端页面每次都要一套样板 HTML/React
2. 加 `assets/hello-world/` 存样板

示例 3：`big-query` 处理"今天有多少用户登录"：

1. 查 BigQuery 每次都要重新发现表结构
2. 加 `references/schema.md` 记录表结构

通过对每个示例的分析，产出技能要携带的脚本/参考/资产清单。

### 6.3 第三步：初始化技能

#### 路径 A：CLI（推荐）

```bash
specforge add-skill <skill-name> --type <skill-type>
```

CLI 自动完成：
- 按 `type` 落到正确目录
- 写入 SpecForge 5 字段 frontmatter
- 创建 `<skill-name>/SKILL.md`

#### 路径 B：脚本（需要资源脚手架时）

```bash
python scripts/init_skill.py <skill-name> --type <skill-type> [--resources scripts,references,assets] [--examples]
```

脚本行为：
- 按 `type` 默认落到 `.specforge/skills/<类别目录>/<skill-name>/`
- 也可用 `--path` 显式指定输出目录（传入后不再做类型路由）
- 生成符合 SpecForge 规范的 SKILL.md 骨架（含 5 字段 frontmatter + TODO 占位）
- 按 `--resources` 创建资源子目录
- 加 `--examples` 会生成示例文件

示例：

```bash
python scripts/init_skill.py react-testing --type testing-rule --resources scripts,references
python scripts/init_skill.py brand-style --type ui-ux-rule --resources assets --examples
```

初始化后：补全 SKILL.md、按需增删资源文件、删除不需要的占位文件。

### 6.4 第四步：编辑技能

编辑时时刻记住：**技能是写给另一个 AI 代理看的**。把对代理有用、又非显而易见的信息写进去：程序性知识、领域细节、可复用资产。

#### 已有模式参考

根据技能类型查阅：

- **多步骤流程**：参考 `references/workflows.md`（若已存在）
- **特定产出格式/质量标准**：参考 `references/output-patterns.md`

#### 从可复用资源开始

先把第二步规划的 `scripts/ / references/ / assets/` 落地。此步可能需要用户输入——例如 `brand-guidelines` 技能的品牌素材只能由用户提供。

**脚本要实际运行测试**，确保无 bug 且输出符合预期。多个相似脚本时，挑代表性样本测试即可。

如果用了 `--examples`：删掉用不到的占位文件；只保留真正需要的资源目录。

#### 撰写 SKILL.md

**写作准则：使用祈使句/动词原形**。

**frontmatter**：只写 SpecForge 5 字段（`name / type / description / version / author`），不要添加其他键。

**正文**：提供使用技能与其打包资源的指令、流程与示例。

### 6.5 第五步：打包技能

完成开发后打包成可分发的 `.skill` 文件：

```bash
python scripts/package_skill.py <path/to/skill-folder>
```

可选指定输出目录：

```bash
python scripts/package_skill.py <path/to/skill-folder> ./dist
```

打包脚本会：

1. **自动校验**：frontmatter 格式与必需字段、命名规范、目录结构、描述质量、资源引用
2. **校验通过才打包**：生成 `<skill-name>.skill`（本质是 zip），保留完整目录结构
3. **安全限制**：存在符号链接时打包失败

校验失败时脚本会报告具体错误并退出，修复后重新运行。

### 6.6 第六步：迭代

技能在真实任务上跑过一轮后，用户通常会提出改进——此时"刚用完"的记忆最新鲜，价值最高。

**迭代循环：**

1. 在真实任务上使用技能
2. 记录卡点或低效之处
3. 判断该更新 SKILL.md 的哪一部分（或哪个资源文件）
4. 改完再验证

## 7. 常见陷阱

| 陷阱 | 说明 |
|------|------|
| 忘了写 `type` 字段 | 技能无法被 `specforge list --type` / `list --skills` 正确识别 |
| `type` 与目录不匹配 | `specforge doctor` 会告警；按第 2 节映射表放回正确目录 |
| `description` 超过 200 字 | 违反 L1 契约，占用公共上下文；拆到正文或删减到要点 |
| SKILL.md 正文 > 500 行 | 违反 L2 契约；把细节下沉到 `references/` |
| 在 SKILL.md 里写"何时使用我" | 正文是触发后才加载的，此类内容必须放 `description` |
| 包含 README.md 等文档 | 给代理添乱，删除 |
| 脚本写完没跑 | 上线前必须实际运行，确认无 bug |
| 在 frontmatter 加自定义字段 | 违反 SpecForge 统一 5 字段约定，可能被校验工具拒绝 |
| 引用层级过深 | 只允许 SKILL.md → references 一层，不要再嵌套 |
