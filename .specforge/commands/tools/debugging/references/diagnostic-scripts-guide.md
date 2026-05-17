# 诊断脚本使用指南

本目录提供自动化诊断脚本,帮助快速定位问题根因。

## add-diagnostic-logs.sh

**功能:** 自动在组件边界添加诊断日志

**适用场景:**
- 多组件系统,需要追踪数据流
- 不确定问题出现在哪个组件
- 需要快速添加诊断埋点

**使用方法:**

```bash
./scripts/add-diagnostic-logs.sh <文件路径> <函数名>
```

**参数说明:**
- `<文件路径>`: 目标源文件路径
- `<函数名>`: 需要添加诊断日志的函数名

**示例:**

```bash
# 在 api.ts 的 fetchData 函数中添加诊断日志
./scripts/add-diagnostic-logs.sh src/services/api.ts fetchData
```

**输出示例:**

脚本会在函数入口添加以下代码:

```typescript
async function fetchData(endpoint: string, params: any) {
  console.error('DEBUG fetchData:', {
    endpoint,
    params,
    cwd: process.cwd(),
    timestamp: new Date().toISOString()
  });
  
  // ... 原有代码
}
```

**运行并查看日志:**

```bash
npm run dev 2>&1 | grep 'DEBUG fetchData'
```

**注意事项:**
- 脚本使用 `sed` 命令,仅适用于 macOS/Linux
- Windows 用户需要手动添加诊断日志
- 诊断完成后记得移除日志(或改为条件编译)

## find-polluter.sh

**功能:** 二分查找导致污染的测试

**适用场景:**
- 测试之间相互污染
- 不确定哪个测试创建了意外文件
- 单独运行测试通过,但一起运行失败
- 全局状态被某个测试修改

**使用方法:**

```bash
./scripts/find-polluter.sh <污染特征> <测试文件模式>
```

**参数说明:**
- `<污染特征>`: 用来判断污染的标志(如 `.git` 目录、临时文件)
- `<测试文件模式>`: 测试文件的路径模式(支持 glob)

**示例:**

```bash
# 查找哪个测试在源代码目录创建了 .git 目录
./scripts/find-polluter.sh '.git' 'src/**/*.test.ts'

# 查找哪个测试创建了 temp.txt 文件
./scripts/find-polluter.sh 'temp.txt' 'tests/**/*.spec.ts'
```

**工作原理:**

1. 逐个运行测试文件
2. 检查是否出现污染特征
3. 在第一个"污染者"处停止
4. 报告问题测试文件

**输出示例:**

```
Running test 1/10: auth.test.ts ... OK
Running test 2/10: user.test.ts ... OK
Running test 3/10: workspace.test.ts ... POLLUTED!
  Found: .git directory
  Test file: src/core/workspace.test.ts

Polluter identified: src/core/workspace.test.ts
```

**后续步骤:**

1. 打开问题测试文件
2. 检查是否有副作用(创建文件、修改全局状态)
3. 添加清理逻辑 (`afterEach`)
4. 重新运行全部测试验证修复

**注意事项:**
- 脚本使用 bash,仅适用于 macOS/Linux
- 确保测试可以单独运行
- 可能需要调整测试运行命令

## 通用诊断流程

### 1. 确定诊断策略

```
问题类型判断:
├─ 多组件数据流问题 → 使用 add-diagnostic-logs.sh
├─ 测试污染问题 → 使用 find-polluter.sh
└─ 其他问题 → 手动添加诊断日志
```

### 2. 添加诊断埋点

**原则:**
- 在组件边界添加(入口和出口)
- 记录关键数据(参数、返回值、状态)
- 包含时间戳便于排序
- 使用 `console.error()` (不被 logger 抑制)

**示例:**

```typescript
// 组件入口
console.error('DEBUG [Component] Enter:', {
  input: arguments[0],
  timestamp: Date.now()
});

// 组件出口
console.error('DEBUG [Component] Exit:', {
  output: result,
  timestamp: Date.now()
});
```

### 3. 收集证据

```bash
# 运行一次复现用例,收集所有日志
npm test 2>&1 | grep 'DEBUG' > debug.log

# 分析日志,追踪数据流
cat debug.log
```

### 4. 分析证据

- 找出数据在哪里发生变化
- 确定断裂点位置
- 使用 root-cause-tracing.md 的技术反向追踪

### 5. 清理诊断代码

调试完成后:
- 移除所有 `console.error('DEBUG ...')` 日志
- 或改为条件编译(仅在 `DEBUG=true` 时输出)
- 提交代码前确认清理完成

## 跨平台替代方案

### Windows 用户

由于 bash 脚本在 Windows 上不兼容,可以:

**手动添加诊断日志:**

```typescript
// 在函数入口手动添加
function myFunction(param: any) {
  console.error('DEBUG myFunction:', {
    param,
    cwd: process.cwd(),
    timestamp: new Date().toISOString()
  });
  // ... 原有代码
}
```

**手动定位污染测试:**

```bash
# 使用 PowerShell 逐个运行测试
Get-ChildItem -Recurse -Filter *.test.ts | ForEach-Object {
  Write-Host "Running: $_"
  npm test $_.Name
  if (Test-Path ".git") {
    Write-Host "POLLUTED: $_"
    break
  }
}
```

## 最佳实践

- ✅ 一次只添加一个诊断点,避免日志过多
- ✅ 使用统一的日志前缀 (`DEBUG [模块名]`)
- ✅ 记录完整上下文(参数、环境、时间戳)
- ✅ 调试完成后立即清理
- ❌ 不要在生产代码中保留诊断日志
- ❌ 不要使用诊断日志替代正式的日志系统
- ❌ 不要在提交中包含诊断代码
