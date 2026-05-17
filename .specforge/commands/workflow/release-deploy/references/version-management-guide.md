# 版本管理详细指南

> 本指南补充 release-deploy 命令的版本管理流程（Step 2）

## 语义化版本（SemVer）基础

### 版本格式

SpecForge 采用 4-digit 版本格式：`MAJOR.MINOR.PATCH.MICRO`

- **MAJOR**（第1位）：不兼容的 API 变更
- **MINOR**（第2位）：向后兼容的功能新增
- **PATCH**（第3位）：向后兼容的问题修复
- **MICRO**（第4位）：琐碎修复、配置、文档

### 版本升级规则

| 变更类型 | 升级位 | 示例 |
|---------|--------|------|
| 破坏性 API 变更 | MAJOR | 1.2.3.4 → 2.0.0.0 |
| 新增功能（向后兼容） | MINOR | 1.2.3.4 → 1.3.0.0 |
| Bug 修复 | PATCH | 1.2.3.4 → 1.2.4.0 |
| 琐碎修复/配置 | MICRO | 1.2.3.4 → 1.2.3.5 |

## 版本状态检测

### 四种状态详解

#### 1. FRESH（需要 bump）

**条件**：`CURRENT_VERSION == BASE_VERSION`

**含义**：当前分支的版本号与基分支相同，说明还未进行版本升级

**操作**：执行完整的版本 bump 流程

```bash
BASE_VERSION=$(git show origin/main:VERSION 2>/dev/null | tr -d '\r\n[:space:]')
CURRENT_VERSION=$(cat VERSION 2>/dev/null | tr -d '\r\n[:space:]')

if [ "$CURRENT_VERSION" = "$BASE_VERSION" ]; then
  echo "STATE: FRESH — 需要 bump 版本"
fi
```

#### 2. ALREADY_BUMPED（跳过 bump）

**条件**：`CURRENT_VERSION != BASE_VERSION` 且 `PKG_VERSION == CURRENT_VERSION`

**含义**：版本号已经升级，且 package.json 已同步

**操作**：跳过 bump，直接使用当前版本号

```bash
if [ "$CURRENT_VERSION" != "$BASE_VERSION" ] && [ "$PKG_VERSION" = "$CURRENT_VERSION" ]; then
  echo "STATE: ALREADY_BUMPED — 版本已升级，跳过 bump"
fi
```

#### 3. DRIFT_STALE_PKG（仅同步 package.json）

**条件**：`CURRENT_VERSION != BASE_VERSION` 但 `PKG_VERSION != CURRENT_VERSION`

**含义**：VERSION 文件已升级，但 package.json 未同步（可能是之前的发布流程失败）

**操作**：仅同步 package.json，不重新 bump

```bash
if [ "$CURRENT_VERSION" != "$BASE_VERSION" ] && [ "$PKG_VERSION" != "$CURRENT_VERSION" ]; then
  echo "STATE: DRIFT_STALE_PKG — 同步 package.json 到 $CURRENT_VERSION"
  node -e 'const fs=require("fs"),p=require("./package.json");p.version=process.argv[1];fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")' "$CURRENT_VERSION"
fi
```

#### 4. DRIFT_UNEXPECTED（停止并询问）

**条件**：版本号混乱，无法判断哪个是权威的

**含义**：可能是手动编辑了 package.json 绕过了发布流程

**操作**：停止发布，要求用户手动解决冲突

```bash
if [ "$CURRENT_VERSION" = "$BASE_VERSION" ] && [ "$PKG_VERSION" != "$CURRENT_VERSION" ]; then
  echo "STATE: DRIFT_UNEXPECTED — 版本号冲突，需要手动解决"
  echo "VERSION: $CURRENT_VERSION"
  echo "package.json: $PKG_VERSION"
  exit 1
fi
```

## 自动判断版本级别

### 检测脚本

```bash
# 统计变更行数
DIFF_LINES=$(git diff origin/<base>...HEAD --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")

# 检测功能信号
HAS_FEATURE=$(git diff origin/<base>...HEAD --name-only | grep -cE '(page\.|route\.|migration\.|schema\.)' || echo "0")

# 判断版本级别
if [ "$DIFF_LINES" -lt 50 ]; then
  BUMP_LEVEL="micro"
elif [ "$HAS_FEATURE" -eq 0 ]; then
  BUMP_LEVEL="patch"
elif [ "$DIFF_LINES" -lt 500 ]; then
  BUMP_LEVEL="minor"  # 需要询问用户
else
  BUMP_LEVEL="major"  # 需要询问用户
fi

echo "BUMP_LEVEL: $BUMP_LEVEL"
```

### 功能信号检测

以下文件变更被视为"功能信号"：

- `**/page.tsx`、`**/page.ts`：新页面
- `**/route.ts`、`**/route.tsx`：新路由
- `**/migration.*`：数据库迁移
- `**/schema.*`：数据模型变更
- 新测试文件伴随新源文件

### 用户询问规则

**MINOR 或 MAJOR 版本升级必须询问用户**：

```
检测到功能信号，建议升级 MINOR 版本（1.2.3.4 → 1.3.0.0）。

当前分支变更：
- 变更行数：$DIFF_LINES
- 功能信号：$HAS_FEATURE 个

确认版本升级？
A) 确认 MINOR 升级（推荐）
B) 降级为 PATCH 升级
C) 取消发布
```

## 版本号验证

### 格式验证

```bash
if ! printf '%s' "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "ERROR: 版本号格式错误，应为 MAJOR.MINOR.PATCH.MICRO"
  echo "当前值：$NEW_VERSION"
  exit 1
fi
```

### 同步验证

同步后必须验证：

```bash
# 验证 VERSION 文件
VERSION_CONTENTS=$(cat VERSION | tr -d '\r\n[:space:]')
if [ "$VERSION_CONTENTS" != "$NEW_VERSION" ]; then
  echo "ERROR: VERSION 文件内容不匹配"
  exit 1
fi

# 验证 package.json
PKG_VERSION=$(node -e 'require("./package.json").version')
if [ "$PKG_VERSION" != "$NEW_VERSION" ]; then
  echo "ERROR: package.json 版本未同步"
  exit 1
fi

echo "版本验证通过：$NEW_VERSION"
```

## 常见错误

### E006_versionMismatch

**信号**：VERSION 与 package.json 版本号不同

**诊断**：
1. 检查哪个文件是最新的
2. 检查是否有手动编辑绕过发布流程
3. 检查之前的发布是否失败

**修复**：
1. 如果是 DRIFT_STALE_PKG：同步 package.json 到 VERSION
2. 如果是 DRIFT_UNEXPECTED：手动确认权威来源，然后同步

### 版本号跳跃

**问题**：版本号从 1.2.3.4 直接跳到 2.0.0.0，中间的变更未发布

**原因**：多个分支并行开发，版本号冲突

**修复**：
1. 检查基分支的最新版本号
2. 检查是否有其他分支已声明更高版本
3. 使用队列感知版本选择

## 最佳实践

1. **始终从基分支读取版本号**：不要依赖本地缓存
2. **同步验证**：写入后立即验证
3. **失败回滚**：如果 package.json 更新失败，回滚 VERSION 文件
4. **日志记录**：记录版本升级决策和原因
5. **幂等性**：多次运行发布命令应产生相同结果

## 参考

- SemVer 规范：https://semver.org/
- Node.js package.json 版本字段：https://docs.npmjs.com/cli/v9/configuring-npm/package-json#version
