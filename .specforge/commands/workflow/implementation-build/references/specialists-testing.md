# Testing Specialist 审查清单

> 适用范围：所有实现任务完成后自动执行。

## 审查范围

始终启用（每次 review 都跑）

## 输出格式

每行一个 JSON 对象的发现结果：

```json
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"testing","summary":"...","fix":"...","fingerprint":"path:line:testing","specialist":"testing"}
```

可选字段：`line`、`fix`、`fingerprint`、`evidence`、`test_stub`。

如果没有发现：只输出 `NO FINDINGS`，其余什么都不要。

---

## 审查分类

### 缺少负路径测试

- 新增了处理错误、拒绝或非法输入的代码路径，却没有对应测试
- guard clause 和 early return 没有测试
- try/catch、rescue 或 error boundary 中的错误分支没有 failure-path 测试
- 代码里断言了 permission / auth 检查，却从来没有测试"被拒绝"的情况

### 缺少边界情况覆盖

- 边界值：0、负数、最大整数、空字符串、空数组、nil / null / undefined
- 单元素集合（循环 off-by-one）
- 用户可见输入中的 Unicode 和特殊字符
- 没有 race-condition 测试的并发访问模式

### 测试隔离违规

- 测试共享可变状态（class variable、全局单例、未清理的 DB 记录）
- 顺序相关测试（按顺序跑通过，随机化后失败）
- 依赖系统时钟、时区或 locale 的测试
- 直接访问真实网络而不是使用 stub / mock 的测试

### 容易抖动的测试模式

- 与时间有关的断言（sleep、setTimeout、waitFor 且超时过短）
- 对无序结果的顺序做断言（hash key、Set 迭代、async resolve 顺序）
- 依赖外部服务（API、数据库）且没有 fallback 的测试
- 没有控制 seed 的随机测试数据

### 缺少安全约束测试

- controller 里的 auth / authz 检查，没有针对"unauthorized"情况的测试
- rate limiting 逻辑没有测试证明它确实会阻挡
- 输入净化没有针对恶意输入的测试
- CSRF / CORS 配置没有集成测试

### 覆盖缺口

- 新增 public 方法 / 函数却完全没有测试覆盖
- 修改后的方法，现有测试只覆盖旧行为，没有覆盖新分支
- 被多个地方调用的工具函数，只通过间接方式测试
