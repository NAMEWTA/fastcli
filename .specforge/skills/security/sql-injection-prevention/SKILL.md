---
name: sql-injection-prevention
type: security-rule
description: >-
  SQL 注入防护与常见安全漏洞检查——参数化查询、输入校验、最小权限原则。当涉及数据库操作或安全敏感代码时自动触发。
  触发词：SQL、数据库操作、SQL 注入、安全漏洞、权限校验。
version: "1.0.0"
author: "wta"
---

# SQL 注入防护与安全规范

> 基于 OWASP Top 10 核心防护规范。

## Iron Law

> **禁止字符串拼接构造 SQL。** 任何用户输入直接拼入 SQL 语句都是安全漏洞，必须使用参数化查询。

## 核心规则

### 规则 1: 始终使用参数化查询

#### Node / TypeScript

| 做法 | 示例 |
|------|------|
| ✅ 参数化查询 | `db.query('SELECT * FROM users WHERE id = ?', [userId])` |
| ✅ ORM 查询 | `User.findById(userId)` |
| ✅ Query Builder | `knex('users').where('id', userId)` |
| ❌ 字符串拼接 | `db.query(\`SELECT * FROM users WHERE id = ${userId}\`)` |
| ❌ 模板拼接 | `db.query('SELECT * FROM users WHERE id = ' + userId)` |

#### Java / Spring Boot

| 做法 | 示例 |
|------|------|
| ✅ PreparedStatement | `ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?"); ps.setLong(1, userId);` |
| ✅ Spring JdbcTemplate | `jdbcTemplate.queryForObject("SELECT * FROM users WHERE id = ?", User.class, userId)` |
| ✅ MyBatis 占位符 | `<select>SELECT * FROM users WHERE id = #{userId}</select>`（使用 `#{}`，不是 `${}`） |
| ✅ Spring Data JPA | `userRepository.findById(userId)` 或 `@Query("... WHERE u.id = :id")` + `@Param("id")` |
| ❌ 字符串拼接 | `Statement st = conn.createStatement(); st.execute("SELECT * FROM users WHERE id = " + userId);` |
| ❌ MyBatis `${}` | `<select>SELECT * FROM users WHERE id = ${userId}</select>`（直接拼接） |

#### Python

| 做法 | 示例 |
|------|------|
| ✅ psycopg2 占位符 | `cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))` |
| ✅ sqlite3 占位符 | `cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))` |
| ✅ SQLAlchemy ORM | `session.query(User).filter(User.id == user_id).first()` |
| ✅ SQLAlchemy Core | `select(users).where(users.c.id == user_id)` |
| ❌ f-string / format | `cur.execute(f"SELECT * FROM users WHERE id = {user_id}")` |
| ❌ 字符串拼接 | `cur.execute("SELECT * FROM users WHERE id = " + str(user_id))` |

#### Go

| 做法 | 示例 |
|------|------|
| ✅ database/sql 占位符 | `db.QueryRow("SELECT * FROM users WHERE id = $1", userID)` |
| ✅ sqlx | `db.Get(&user, "SELECT * FROM users WHERE id = ?", userID)` |
| ❌ fmt.Sprintf | `db.Query(fmt.Sprintf("SELECT * FROM users WHERE id = %d", userID))` |

### 规则 2: 需要动态表名/列名时的白名单校验

**原则**：参数化查询只能绑定**值**，不能绑定**表名/列名**。如需动态拼接表名/列名，必须使用白名单。以下示例在任何语言中模式一致。

```typescript
// Node / TypeScript
const ALLOWED_COLUMNS = ['id', 'name', 'createdAt'];
const ALLOWED_ORDERS = ['asc', 'desc'];

function listUsers(sortBy: string, order: string) {
  if (!ALLOWED_COLUMNS.includes(sortBy)) {
    throw new ValidationError(`不支持的排序字段: ${sortBy}`);
  }
  if (!ALLOWED_ORDERS.includes(order)) {
    throw new ValidationError(`不支持的排序方向: ${order}`);
  }
  return db.query(`SELECT * FROM users ORDER BY ${sortBy} ${order}`);
}
```

```java
// Java / Spring Boot
private static final Set<String> ALLOWED_COLUMNS = Set.of("id", "name", "created_at");
private static final Set<String> ALLOWED_ORDERS  = Set.of("asc", "desc");

public List<User> listUsers(String sortBy, String order) {
    if (!ALLOWED_COLUMNS.contains(sortBy)) {
        throw new ValidationException("不支持的排序字段: " + sortBy);
    }
    if (!ALLOWED_ORDERS.contains(order)) {
        throw new ValidationException("不支持的排序方向: " + order);
    }
    String sql = "SELECT * FROM users ORDER BY " + sortBy + " " + order;
    return jdbcTemplate.query(sql, userRowMapper);
}
```

```python
# Python
ALLOWED_COLUMNS = {"id", "name", "created_at"}
ALLOWED_ORDERS = {"asc", "desc"}

def list_users(sort_by: str, order: str):
    if sort_by not in ALLOWED_COLUMNS:
        raise ValueError(f"不支持的排序字段: {sort_by}")
    if order not in ALLOWED_ORDERS:
        raise ValueError(f"不支持的排序方向: {order}")
    sql = f"SELECT * FROM users ORDER BY {sort_by} {order}"
    return cur.execute(sql).fetchall()
```

### 规则 3: 输入校验

- 所有用户输入在进入业务逻辑前校验
- 校验失败返回明确错误，不将原始输入传给下层
- 使用 Schema 校验库：
  - **Node**：Zod / Joi / Yup
  - **Python**：Pydantic / Marshmallow
  - **Java/Spring**：Bean Validation (`@Valid` + `@NotNull/@Size/@Pattern`) 、Hibernate Validator
  - **Go**：go-playground/validator
  - **Rust**：validator crate
  - **.NET**：FluentValidation 、`[Required]/[Range]` Data Annotations

### 规则 4: 最小权限原则

- 应用数据库账号仅拥有必要的权限
- 读操作用只读账号
- 写操作不使用 DROP/ALTER 权限的账号
- API Key / Token 按最小范围授权

## 安全审查 Red Flags

如果在代码中看到以下模式，立即标记为 **[必须修复]**：

- 字符串拼接构造 SQL 语句
- 用户输入直接拼入命令执行（`exec(userInput)`）
- 密码明文存储或日志输出
- 没有输入校验的 API 端点
- 错误响应用于输出数据库错误信息

## 安全自检列表

- [ ] 所有 SQL 查询使用参数化（无字符串拼接）
- [ ] 动态表名/列名经过白名单校验
- [ ] 所有用户输入经过校验和清洗
- [ ] 敏感数据（密码、Token）加密存储
- [ ] 错误信息不泄露数据库结构
- [ ] API 响应不暴露内部实现细节
- [ ] 日志中不包含敏感数据（密码、Token、身份证号）
- [ ] 数据库连接使用 TLS
