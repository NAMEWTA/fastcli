---
name: npm-publish
description: npm 包发布工作流 — 构建、测试、版本更新、Git 推送、npm 发布一条龙。当用户提到"发布 npm"、"publish"、"发版"、"推送到 npm"、"更新版本号"时使用此技能。
---

# npm 包发布工作流

自动化执行 npm 包发布的完整流程，确保每次发布都经过验证。

## 触发条件

- 用户说"发布到 npm"、"npm publish"、"发版"
- 用户想要更新版本并发布
- 用户需要推送代码到 GitHub 并发布 npm 包

## 前置要求

在开始前，向用户确认以下信息：

1. **NPM_TOKEN**：必须由用户提供，不存储在任何配置中
   - 提示用户："请提供你的 npm access token（需要启用 2FA bypass）"
   - Token 获取地址：https://www.npmjs.com/settings/~/tokens
   - 创建时选择 **Granular Access Token** 并勾选 **"Bypass two-factor authentication for automation"**

2. **版本类型**：询问用户想要的版本更新类型
   - `patch`：修复 bug（1.0.0 → 1.0.1）
   - `minor`：新功能（1.0.0 → 1.1.0）
   - `major`：破坏性更新（1.0.0 → 2.0.0）
   - 或指定具体版本号

## 执行流程

### 第一步：环境检查

```bash
# 确认在正确目录且有 package.json
ls package.json

# 检查 Git 状态（确保工作区干净或用户确认提交）
git status
```

### 第二步：测试和构建

```bash
# 运行测试
pnpm test

# 构建项目
pnpm build
```

如果测试或构建失败，**停止发布流程**，向用户报告错误。

### 第三步：版本更新

```bash
# 根据用户选择更新版本
pnpm version <patch|minor|major|具体版本> --no-git-tag-version

# 或者如果用户想要自动创建 git tag
pnpm version <patch|minor|major>
```

### 第四步：Git 提交和推送

```bash
# 提交版本更新
git add package.json
git commit -m "chore: bump version to $(node -p "require('./package.json').version")"

# 创建 tag（如果用户需要触发 release workflow）
git tag v$(node -p "require('./package.json').version")

# 推送到远端
git push
git push --tags
```

### 第五步：发布到 npm

```bash
# 配置 token（仅在当前会话有效）
pnpm config set //registry.npmjs.org/:_authToken <用户提供的TOKEN>

# 发布
pnpm publish --access public --no-git-checks
```

## 完成输出

发布成功后，向用户展示：

```
✅ 发布成功！

📦 包名: @scope/package-name
📌 版本: x.x.x
🔗 npm: https://www.npmjs.com/package/@scope/package-name
🔗 GitHub: <仓库地址>

安装命令:
npm install -g @scope/package-name
```

## 错误处理

| 错误 | 解决方案 |
|------|----------|
| 403 Forbidden (2FA) | Token 需要启用 "Bypass 2FA"，引导用户重新创建 |
| 401 Unauthorized | Token 无效或过期，请用户检查 |
| 测试失败 | 停止发布，修复测试后重试 |
| 构建失败 | 停止发布，修复构建错误后重试 |
| Git 工作区脏 | 询问用户是否提交当前更改 |

## 安全提醒

⚠️ **重要**：
- NPM_TOKEN 仅在交互时由用户提供
- 不要将 token 写入任何文件或日志
- 每次发布后 token 配置仅在当前会话有效
