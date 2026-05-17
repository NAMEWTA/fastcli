---
name: api-test-strategy
type: testing-rule
description: >-
  API 测试策略——测试金字塔（单元/集成/E2E）、测试用例设计（Given/When/Then）、Mock 策略、边界值覆盖。当编写或审查测试代码时自动触发。
  触发词：写测试、测试策略、测试用例、单元测试、集成测试、API 测试。
version: "1.0.0"
author: "wta"
---

# API 测试策略

## Iron Law

> **禁止在测试之前编写生产代码。** 必须先有失败的测试才能写实现。如果已经写了生产代码而没有测试，先删除生产代码。

## 测试金字塔

```
         ╱ E2E ╲         少量（5-10%）：关键用户流程
        ╱  集成  ╲       中量（20-30%）：API 端点 + 数据库
       ╱   单元   ╲      大量（60-70%）：函数/方法/类
```

### 各层职责

| 层级 | 测试内容 | 速度 | Mock 策略 |
|------|---------|------|----------|
| **单元** | 单一函数/方法逻辑 | 毫秒级 | Mock 所有外部依赖 |
| **集成** | API 端点、数据库交互 | 秒级 | 真实数据库（测试库）、Mock 外部服务 |
| **E2E** | 完整用户流程 | 分钟级 | 全部真实（测试环境） |

## 测试用例格式 — Given/When/Then

> 不论何种技术栈，单个测试都遵循 Given（前置）/ When（操作）/ Then（断言）三段。下方按语言给出**集成测试**入口示例，单元测试使用对应 Mock 库即可。

### Node / TypeScript（Vitest / supertest）

```typescript
describe('UserService.createUser', () => {
  it('应该成功创建用户 When 手机号未注册', async () => {
    // Given（前置条件）
    const input = { phone: '13800138000', name: '张三' };
    mockUserRepo.findByPhone.resolves(null);

    // When（执行操作）
    const result = await userService.createUser(input);

    // Then（预期结果）
    expect(result).toMatchObject({ phone: '13800138000', name: '张三' });
    expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
  });
});
```

### Python（pytest + httpx）

```python
@pytest.mark.asyncio
async def test_create_user_success(client: AsyncClient, db_session):
    # Given
    payload = {"phone": "13800138000", "name": "张三"}

    # When
    resp = await client.post("/users", json=payload)

    # Then
    assert resp.status_code == 201
    body = resp.json()
    assert body["phone"] == "13800138000"

@pytest.mark.asyncio
async def test_create_user_duplicate(client: AsyncClient, existing_user):
    resp = await client.post("/users", json={"phone": existing_user.phone})
    assert resp.status_code == 409
```

### Java / Spring Boot（`@SpringBootTest` + RestAssured）

```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
class UserControllerIT {

    @LocalServerPort int port;

    @Test
    void shouldCreateUserWhenPhoneNotRegistered() {
        // Given
        var payload = Map.of("phone", "13800138000", "name", "张三");

        // When
        var response = given().port(port).contentType(JSON).body(payload)
                .when().post("/users");

        // Then
        response.then().statusCode(201).body("phone", equalTo("13800138000"));
    }

    @Test
    void shouldReturn409WhenPhoneAlreadyRegistered() {
        // Given：通过 fixture 已存在用户
        // ...
        // When + Then
        given().port(port).contentType(JSON).body(Map.of("phone", "13800138000"))
                .when().post("/users")
                .then().statusCode(409);
    }
}
```

### Go（标准 testing + httptest）

```go
func TestCreateUser_Success(t *testing.T) {
    // Given
    srv := httptest.NewServer(routes(testRepo))
    defer srv.Close()
    body := bytes.NewBufferString(`{"phone":"13800138000","name":"张三"}`)

    // When
    resp, err := http.Post(srv.URL+"/users", "application/json", body)

    // Then
    require.NoError(t, err)
    require.Equal(t, http.StatusCreated, resp.StatusCode)
}
```

## 边界值覆盖清单

对每个 API 端点，确保覆盖：

- [ ] **正常输入**：最常用的合法输入
- [ ] **边界值**：最小值、最大值、刚好等于边界
- [ ] **空值/null**：必填参数为空时的处理
- [ ] **非法输入**：类型错误、格式错误、超长字符串
- [ ] **并发**：重复提交、竞态条件（如适用）
- [ ] **权限**：未认证、无权限、跨用户操作

## TDD 三步节奏

```
1. RED   → 编写失败的测试（断言要具体）
2. GREEN → 实现最少代码使测试通过（不要多写）
3. 重构   → 消除重复、改善命名（测试保护下进行）
```

## 反模式

| 反模式 | 说明 | 改进 |
|--------|------|------|
| 测试依赖执行顺序 | 每个测试应该独立 | 使用 beforeEach 重置状态 |
| 测试太复杂 | 测试本身有 bug | 保持测试简单直接 |
| Mock 一切 | 过度 Mock 使测试失去意义 | 集成测试层使用真实依赖 |
| 只测 golden path | 没有错误路径覆盖 | 补充异常和边界测试 |

## 测试自检列表

- [ ] 每个测试用例遵循 Given/When/Then 格式？
- [ ] 测试覆盖正常输入、边界值、空值、非法输入？
- [ ] 测试之间相互独立，不依赖执行顺序？
- [ ] Mock 策略合理（单元测试 Mock 外部依赖，集成测试使用真实依赖）？
- [ ] TDD 三步节奏完整（RED → GREEN → REFACTOR）？
