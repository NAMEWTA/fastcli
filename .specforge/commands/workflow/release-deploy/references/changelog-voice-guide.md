# CHANGELOG 写作规范

> 本指南补充 release-deploy 命令的 CHANGELOG 生成流程（Step 3）

## 核心原则

**CHANGELOG 是写给用户的，不是写给开发者的。**

- commit 历史是开发者的技术记录
- CHANGELOG 是用户的功能公告

两者完全不同，不可互相替代。

## 格式规范

### 基本格式

```markdown
## [X.Y.Z.W] - YYYY-MM-DD

### Added
- <新功能描述>

### Changed
- <变更描述>

### Fixed
- <修复描述>

### Removed
- <移除描述>
```

### 日期格式

**必须使用**：`YYYY-MM-DD`（ISO 8601）

**示例**：`2026-05-07`

**禁止**：`2026/05/07`、`05-07-2026`、`May 7, 2026`

### 版本号格式

**必须使用**：`[MAJOR.MINOR.PATCH.MICRO]`

**示例**：`[1.2.3.4]`

**位置**：方括号内，紧跟日期

## Voice 规范

### ✅ 正确示例

**以用户能力开头**：
```markdown
### Added
- 用户现在可以导出报表为 PDF 格式
- 新增暗黑模式切换功能，保护视力
- 支持批量上传文件（最多 100 个）
```

**描述用户可见的变化**：
```markdown
### Changed
- 优化了搜索性能，响应时间从 2s 降至 200ms
- 改进了错误提示，现在会显示具体的修复建议
- 重新设计了设置页面，更易找到常用选项
```

**说明修复的价值**：
```markdown
### Fixed
- 修复了时区切换时的日期显示错误
- 修复了并发编辑导致的数据丢失问题
- 修复了移动端导航菜单无法关闭的问题
```

### ❌ 错误示例

**提及实现细节**：
```markdown
### Added
- 新增 UserService 类
- 添加了 Redis 缓存层
- 重构了数据库查询逻辑
```

**开发者视角**：
```markdown
### Changed
- 将 React 17 升级到 React 18
- 更新了 ESLint 配置
- 修改了 API 端点 /v1/users → /v2/users
```

**模糊描述**：
```markdown
### Fixed
- 修复了一些 bug
- 改进了性能
- 更新了依赖
```

## 生成流程

### Step 1：枚举所有 commit

```bash
git log <base>..HEAD --oneline
```

**目的**：获取分支上的完整 commit 列表

**示例输出**：
```
abc1234 feat: add PDF export
def5678 fix: timezone bug
ghi9012 perf: optimize search
jkl3456 chore: update deps
mno7890 refactor: user service
```

### Step 2：读取完整 diff

```bash
git diff <base>...HEAD
```

**目的**：理解每个 commit 实际改变了什么

**关注点**：
- 新增文件：新功能
- 修改文件：功能变更或修复
- 删除文件：移除功能
- 配置文件：基础设施变更

### Step 3：按主题分组

根据 commit 消息和 diff 内容，将变更分组：

**Added**（新功能）：
- 新增页面/路由
- 新增 API 端点
- 新增用户功能
- 新增集成/插件

**Changed**（功能变更）：
- 现有功能改进
- UI/UX 优化
- 性能提升
- 配置变更

**Fixed**（Bug 修复）：
- 错误修复
- 边界情况处理
- 兼容性问题

**Removed**（移除功能）：
- 废弃功能移除
- 代码清理
- 依赖移除

### Step 4：生成 CHANGELOG 条目

**规则**：
1. 每个主题至少一个条目
2. 条目要具体、可验证
3. 使用用户能理解的语言
4. 避免技术术语（除非必要）

**示例**：

假设有以下 commit：
```
abc1234 feat: add PDF export for reports
def5678 fix: handle DST in date picker
ghi9012 perf: add Redis cache for search
jkl3456 chore: bump dependencies
mno7890 refactor: extract UserService
pqr1234 feat: add dark mode toggle
stu5678 fix: prevent concurrent edit data loss
```

**生成的 CHANGELOG**：
```markdown
## [1.3.0.0] - 2026-05-07

### Added
- 用户现在可以导出报表为 PDF 格式
- 新增暗黑模式切换功能

### Changed
- 优化了搜索性能，使用缓存后响应时间大幅下降

### Fixed
- 修复了夏令时时区切换时的日期显示错误
- 修复了并发编辑导致的数据丢失问题
```

### Step 5：交叉检查

**关键规则**：每个 commit 必须映射到至少一个 CHANGELOG 条目

**检查脚本**：
```bash
# 统计 commit 数量
COMMIT_COUNT=$(git log <base>..HEAD --oneline | wc -l | tr -d ' ')

# 人工检查：每个 commit 是否在 CHANGELOG 中有对应条目
# 如果有未映射的 commit，必须补充条目
```

**常见遗漏**：
- 配置变更（如 `.env.example` 更新）
- 文档更新
- 测试改进
- 依赖升级（如果有用户可见影响）

## 特殊场景

### 仅有内部变更

如果分支只包含内部重构、测试改进，无用户可见变更：

```markdown
## [1.2.4.0] - 2026-05-07

### Changed
- 内部重构，提升系统可维护性（用户无感知）
```

**不要留空 CHANGELOG**，即使只有内部变更。

### 破坏性变更

如果有破坏性 API 变更：

```markdown
## [2.0.0.0] - 2026-05-07

### Changed
- **破坏性变更**：API 端点从 /v1/users 迁移到 /v2/users
- **破坏性变更**：响应格式从 XML 改为 JSON

### Migration Guide
- 更新 API 调用路径
- 修改响应解析逻辑
- 详见迁移指南：[链接]
```

**必须提供迁移指南**。

### 仅修复安全漏洞

```markdown
## [1.2.3.1] - 2026-05-07

### Fixed
- **安全修复**：修复了 XSS 漏洞（CVE-2026-1234）
- **安全修复**：修复了 SQL 注入风险

**建议所有用户立即升级**
```

## 常见错误

### E007_changelogIncomplete

**信号**：CHANGELOG 未覆盖分支上所有 commit

**诊断**：
1. 对比 `git log <base>..HEAD --oneline` 和 CHANGELOG 条目
2. 找出未映射的 commit
3. 确认是否确实遗漏

**修复**：
1. 为未映射的 commit 补充 CHANGELOG 条目
2. 如果是内部变更，归类为 "内部改进"
3. 重新交叉检查

### 复制 commit 消息

**错误**：直接使用 commit 消息作为 CHANGELOG 条目

**问题**：commit 消息是开发者视角，不适合用户阅读

**修复**：重新编写，使用用户视角

### 遗漏小变更

**错误**：只记录大功能，忽略小修复

**问题**：用户遇到小 bug 修复后不知道已修复

**修复**：所有用户可见变更都应记录

## 最佳实践

1. **先写 CHANGELOG，再写 commit 消息**：确保用户视角优先
2. **使用主动语态**："用户可以..."而非"添加了功能使用户可以..."
3. **量化改进**："响应时间从 2s 降至 200ms"而非"优化了性能"
4. **保持简洁**：每个条目 1-2 行，不要长篇大论
5. **定期更新**：每个发布都更新，不要积压

## 参考

- Keep a Changelog：https://keepachangelog.com/
- SemVer 规范：https://semver.org/
