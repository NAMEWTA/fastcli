# 常见 Bug 模式库

本文档收集用户项目中反复出现的 bug 模式,帮助快速识别问题类型并定位根因。

## 1. 空值污染

**症状:** 
- 在错误目录执行操作
- 打开错误文件
- 变量显示 `undefined` 或 `null`

**根因:** 
- 变量初始化为空字符串或 undefined
- 后续代码未校验直接使用
- 变量初始化时序错误(在值设置前就访问)

**修复:**
- 在入口处添加空值校验
- 使用 getter 延迟初始化
- 在值未设置时抛出异常而非返回空值

**示例:**
```typescript
// ❌ 错误:顶层变量初始化为空
let projectDir = '';
Project.create('name', projectDir); // 在 beforeEach 之前访问!

// ✅ 正确:使用 getter 延迟初始化
let _projectDir: string | null = null;
function getProjectDir(): string {
  if (!_projectDir) {
    throw new Error('projectDir not initialized');
  }
  return _projectDir;
}
```

## 2. 竞态条件

**症状:** 
- 测试时而通过时而失败
- CI 环境失败但本地通过
- 并行运行时失败

**根因:** 
- 硬编码延迟 (`setTimeout`)
- 异步操作未等待完成
- 共享状态被并发修改

**修复:**
- 使用条件等待 (references/condition-based-waiting.md)
- 避免共享状态,使用隔离环境
- 确保异步操作完全完成

**示例:**
```typescript
// ❌ 错误:猜测时序
await new Promise(r => setTimeout(r, 100));
expect(fileExists('output.txt')).toBe(true);

// ✅ 正确:等待条件
await waitFor(() => fileExists('output.txt'), 'file to be created');
expect(fileExists('output.txt')).toBe(true);
```

## 3. 环境差异

**症状:** 
- 本地正常、生产失败,或反之
- 不同开发者环境行为不一致
- 升级依赖后出现问题

**根因:** 
- 环境变量不一致
- 配置文件未同步
- 依赖版本锁定不严格
- 操作系统差异 (路径分隔符、权限)

**修复:**
- 添加环境守卫
- 记录环境信息到日志
- 使用 `.env.example` 文档化所有环境变量
- 锁定依赖版本 (`package-lock.json`)

**示例:**
```typescript
// 环境守卫
if (process.env.NODE_ENV === 'production') {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL required in production');
  }
}
```

## 4. 数据流断裂

**症状:** 
- 调用栈深处报错
- 不清楚数据从哪里来
- 值在传递过程中被错误转换

**根因:** 
- 多层调用中数据被错误转换
- 类型不匹配但未校验
- 参数名不一致

**修复:**
- 使用根因追踪技术 (references/root-cause-tracing.md)
- 在每一层添加类型校验
- 统一参数命名

**示例:**
```typescript
// ❌ 错误:参数名不一致
// 路由: /users/:id
const userId = req.params.userId; // undefined!

// ✅ 正确:统一命名
const userId = req.params.id;
if (!userId) {
  throw new ValidationError('userId is required');
}
```

## 5. 单点故障

**症状:** 
- 修复后在其他地方出现新问题
- 同样的 bug 反复出现
- 修复引入新 bug

**根因:** 
- 只在症状处修复,未添加纵深防御
- 不同的代码路径绕过了校验
- mock 绕过了业务逻辑检查

**修复:**
- 使用四层防御策略 (references/defense-in-depth.md)
- 在每一层添加校验
- 测试每一层防御能否独立捕获问题

**示例:**
参见 references/defense-in-depth.md 的真实案例

## 6. 异步错误吞没

**症状:** 
- Promise 被拒绝但未捕获
- 错误静默失败
- 后续操作基于错误状态执行

**根因:** 
- 缺少 `.catch()` 处理器
- `try-catch` 未包裹 `await`
- 事件处理器未捕获异步错误

**修复:**
- 所有异步操作必须有错误处理
- 使用 `unhandledrejection` 监听器捕获遗漏错误
- 在测试中验证错误路径

**示例:**
```typescript
// ❌ 错误:未捕获异步错误
async function fetchData() {
  fetch('/api/data').then(data => process(data));
  // 如果 fetch 失败,错误被吞没
}

// ✅ 正确:完整错误处理
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    process(data);
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error; // 重新抛出或处理
  }
}
```

## 7. 状态泄漏

**症状:** 
- 测试之间相互影响
- 前一个测试的状态影响后一个测试
- 全局状态未清理

**根因:** 
- 测试使用了共享状态
- 全局变量在测试间保持修改后的值
- 外部资源(文件、数据库)未清理

**修复:**
- 每个测试使用隔离环境
- 在 `beforeEach` 中重置状态
- 在 `afterEach` 中清理资源
- 使用 find-polluter.sh 脚本定位污染测试

**示例:**
```typescript
// ❌ 错误:共享状态
let user = { name: 'test' };

test('test 1', () => {
  user.name = 'modified';
});

test('test 2', () => {
  expect(user.name).toBe('test'); // 失败!已被修改
});

// ✅ 正确:隔离状态
let user: { name: string };

beforeEach(() => {
  user = { name: 'test' }; // 每次测试重置
});
```

## 8. 类型断言错误

**症状:** 
- 运行时类型错误
- `Cannot read property of undefined`
- 类型转换失败

**根因:** 
- 使用 `as` 断言绕过类型检查
- 未校验外部数据类型
- API 响应类型不匹配

**修复:**
- 使用运行时校验替代类型断言
- 验证外部数据(使用 Zod、io-ts 等)
- 处理可选字段

**示例:**
```typescript
// ❌ 错误:盲目断言
const user = response.data as User;
console.log(user.name); // 可能 undefined!

// ✅ 正确:运行时校验
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const result = UserSchema.safeParse(response.data);
if (!result.success) {
  throw new ValidationError('Invalid user data', result.error);
}
const user = result.data;
```

## 快速对照表

| 症状 | 可能模式 | 参考文档 |
|------|---------|---------|
| undefined/null 错误 | 空值污染、数据流断裂 | root-cause-tracing.md |
| 测试时过时不过 | 竞态条件、状态泄漏 | condition-based-waiting.md |
| 环境相关错误 | 环境差异 | defense-in-depth.md |
| 修复后复发 | 单点故障 | defense-in-depth.md |
| 静默失败 | 异步错误吞没 | root-cause-tracing.md |
| 类型错误 | 类型断言错误 | defense-in-depth.md |

## 如何贡献新模式

当你发现新的 bug 模式时:
1. 记录症状、根因、修复方法
2. 提取通用模式(不局限于特定项目)
3. 添加示例代码(❌ 错误 vs ✅ 正确)
4. 更新快速对照表
