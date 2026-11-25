# 何时使用模拟

只在**系统边界**使用模拟：

- 外部 API，例如支付、邮件等
- 数据库，有时可以，但优先使用测试数据库
- 时间与随机性
- 文件系统，有时可以

不要模拟：

- 自己的类或模块
- 内部协作者
- 任何由你控制的内容

## 为可模拟性设计

在系统边界，设计容易模拟的接口：

**1. 使用依赖注入**

把外部依赖传入，而不是在内部创建：

```typescript
// 容易模拟
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// 难以模拟
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

**2. 优先使用 SDK 式接口，而不是通用请求函数**

为每个外部操作创建特定函数，而不是使用一个带条件逻辑的通用函数：

```typescript
// 好：每个函数都可以独立模拟
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// 坏：模拟时必须在模拟函数内部加入条件逻辑
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

SDK 方式意味着：
- 每个模拟返回一种特定形状
- 测试准备中没有条件逻辑
- 更容易看出测试实际调用哪些端点
- 每个端点都有类型安全
