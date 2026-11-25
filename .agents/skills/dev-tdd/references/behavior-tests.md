# 好测试与坏测试

## 好测试

**集成式**：通过真实接口测试，而不是模拟内部部件。

```typescript
// 好：测试可观察行为
test("用户可以用有效购物车结账", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

特征：

- 测试用户或调用者关心的行为
- 只使用公共 API
- 经得起内部重构
- 描述做什么，而不是怎样做
- 每个测试一个逻辑断言

## 坏测试

**实现细节测试**：与内部结构耦合。

```typescript
// 坏：测试实现细节
test("checkout 调用 paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});
```

警示信号：

- 模拟内部协作者
- 测试私有方法
- 对调用次数或顺序作断言
- 行为没变，重构却让测试失败
- 测试名称描述怎样做，而不是做什么
- 通过外部手段验证，而不是使用接口

```typescript
// 坏：绕过接口验证
test("createUser 保存到数据库", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// 好：通过接口验证
test("createUser 使用户可被读取", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

**同义反复测试**：期望值重述了实现，因此测试天然通过。

```typescript
// 坏：期望值采用与代码相同的计算方式重新求得
test("calculateTotal 对各行项目求和", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});

// 好：期望值是独立、已知正确的字面值
test("calculateTotal 对各行项目求和", () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
});
```
