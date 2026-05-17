# 根因追踪技术

## 核心原则

**沿着调用链反向追踪,直到找到最初的触发点,然后在源头修复。**

绝不只在错误出现的地方修复。报错的地方 ≠ 问题起源的地方。

## 何时使用

- 错误发生在执行深处(不在入口点)
- 堆栈跟踪显示很长的调用链
- 不清楚无效数据从哪里来
- 需要找到是哪个操作/代码触发了问题

## 追踪流程

### 1. 观察症状

```
Error: API call failed with status 500
    at fetchUserData (src/services/api.ts:45)
    at UserService.getProfile (src/services/user.ts:23)
    at ProfileController.show (src/controllers/profile.ts:12)
```

### 2. 找到直接原因

**哪段代码直接导致了这个错误?**

```typescript
// src/services/api.ts:45
const response = await fetch(url, options);
if (!response.ok) {
  throw new Error(`API call failed with status ${response.status}`);
}
```

### 3. 问:谁调用了它?

```typescript
// src/services/user.ts:23
const data = await api.fetchUserData(userId);
  → 被 ProfileController.show 调用
  → 被路由处理器调用
  → 被 HTTP 请求触发
```

### 4. 继续向上追踪

**传入了什么值?值从哪里来?**

- `userId = undefined` (未定义!)
- 为什么 userId 是 undefined?
- 追踪到请求参数解析...

### 5. 找到最初的触发点

**undefined 从哪里来的?**

```typescript
// src/controllers/profile.ts:12
const userId = req.params.id; // 路由参数名错误! 应该是 req.params.userId
```

**根本原因:** 路由参数名不匹配

## 添加堆栈跟踪

当无法手动追踪时,添加诊断埋点:

```typescript
// 在有问题的操作之前
async function fetchData(endpoint: string, params: any) {
  const stack = new Error().stack;
  console.error('DEBUG fetchData:', {
    endpoint,
    params,
    timestamp: new Date().toISOString(),
    stack,
  });

  // 原有逻辑...
}
```

**重要:** 
- 在测试中使用 `console.error()` (而非 logger——可能不会显示)
- 在危险操作之前记录日志,而不是在失败之后
- 包含上下文:参数、环境变量、时间戳

**运行并捕获:**

```bash
npm run dev 2>&1 | grep 'DEBUG fetchData'
```

**分析堆栈跟踪:**
- 找调用文件名
- 找触发调用的行号
- 识别模式(同一个函数?同一个参数?)

## 真实案例

### 案例 1: 空的 projectDir

**症状:** `.git` 被创建在源代码目录中

**追踪链:**
1. `git init` 在 `process.cwd()` 中执行 ← cwd 参数为空
2. WorkspaceManager 被传入空的 projectDir
3. Session.create() 传递了空字符串
4. 测试在初始化之前访问了未设置的变量

**根本原因:** 变量初始化时序错误

**修复:** 改为 getter 延迟初始化,在值未设置时抛出异常

### 案例 2: 前端 API 调用失败

**症状:** 用户资料显示 "undefined"

**追踪链:**
1. 页面显示 `user.name = undefined`
2. `UserProfile` 组件从 `useUser()` hook 获取数据
3. `useUser()` 调用 `/api/users/${userId}`
4. `userId` 从 URL 参数解析

**根本原因:** URL 参数名与路由定义不匹配 (`/users/:id` vs `req.params.userId`)

**修复:** 统一参数命名,在入口处添加参数校验

## 关键原则

**绝不只在错误出现的地方修复。** 反向追踪,找到最初的触发点。

## 堆栈跟踪技巧

- **在测试中:** 使用 `console.error()` 而非 logger——logger 可能被抑制
- **操作之前:** 在危险操作之前记录日志,而不是在失败之后
- **包含上下文:** 参数、环境变量、时间戳
- **捕获堆栈:** `new Error().stack` 能显示完整的调用链

## 实际效果

来自调试实践:
- 通过 5 层追踪找到了根本原因
- 在源头修复(getter 校验)
- 添加了 4 层纵深防御
- 1847 个测试通过,零污染
