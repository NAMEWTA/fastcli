---
name: npm-publish
description: npm 包发布工作流 — 构建、测试、版本更新、Git 推送、npm 发布一条龙。当用户提到"发布 npm"、"publish"、"发版"、"推送到 npm"、"更新版本号"时使用此技能。
---


# npm 包发布工作流

自动化执行 npm 包发布的完整流程，确保每次发布都经过验证。

## 本地开发注意


如仅需本地构建/测试/版本号更新，在推送到 GitHub 后由远程 Action 自动发布。

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



### 第五步：由 GitHub Action 远程发布

推送代码和 tag 后，GitHub Action 会自动完成 npm 发布，无需本地执行 publish。

## 完成输出

发布成功后，向用户展示：

```
✅ 发布成功！

📦 包名: @scope/package-name
📌 版本: x.x.x
🔗 npm: https://www.npmjs.com/package/@scope/package-name
🔗 GitHub: <仓库地址>

```