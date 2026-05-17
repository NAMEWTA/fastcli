# TDD Examples（TDD 实战示例库）

> 本文件提供完整的 TDD（测试驱动开发）实战示例，涵盖 TypeScript、Python 等常见技术栈。每个示例展示从失败测试到实现通过的完整循环。

---

## 示例 1: TypeScript 服务层 TDD

### 场景：UserService.createUser

#### 背景

需要实现用户创建功能，要求：
- 验证邮箱格式
- 生成唯一用户 ID
- 返回用户对象

---

#### 步骤 1: 编写失败的测试

**文件**: `tests/unit/services/user-service.test.ts`

```typescript
import { UserService } from '../../../src/services/user-service';
import { User } from '../../../src/models/user';

describe('UserService.createUser', () => {
  it('should create user with valid email', async () => {
    const service = new UserService();
    const user = await service.createUser({
      email: 'test@example.com',
      name: 'Test User'
    });
    
    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
    expect(user.id).toBeDefined();
    expect(user.createdAt).toBeDefined();
  });
});
```

**运行测试**:
```bash
pnpm test tests/unit/services/user-service.test.ts
```

**预期结果**: FAIL
```
Error: Cannot find module '../../../src/services/user-service'
```

---

#### 步骤 2: 编写最少实现代码

**文件**: `src/services/user-service.ts`

```typescript
import { User, CreateUserDto } from '../models/user';

export class UserService {
  async createUser(dto: CreateUserDto): Promise<User> {
    // 最少实现：返回 mock 数据让测试通过
    return {
      id: 'mock-id',
      email: dto.email,
      name: dto.name,
      createdAt: new Date()
    };
  }
}
```

**文件**: `src/models/user.ts`

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface CreateUserDto {
  email: string;
  name: string;
}
```

**运行测试**:
```bash
pnpm test tests/unit/services/user-service.test.ts
```

**预期结果**: PASS ✓

---

#### 步骤 3: 增强测试（边界条件）

**文件**: `tests/unit/services/user-service.test.ts`（追加）

```typescript
describe('UserService.createUser - Validation', () => {
  it('should throw error for invalid email', async () => {
    const service = new UserService();
    
    await expect(
      service.createUser({
        email: 'invalid-email',
        name: 'Test User'
      })
    ).rejects.toThrow('Invalid email format');
  });

  it('should throw error for empty name', async () => {
    const service = new UserService();
    
    await expect(
      service.createUser({
        email: 'test@example.com',
        name: ''
      })
    ).rejects.toThrow('Name is required');
  });
});
```

**运行测试**:
```bash
pnpm test tests/unit/services/user-service.test.ts
```

**预期结果**: FAIL
```
Expected promise to be rejected with 'Invalid email format' but it was fulfilled with {...}
```

---

#### 步骤 4: 实现验证逻辑

**文件**: `src/services/user-service.ts`（更新）

```typescript
import { User, CreateUserDto } from '../models/user';

export class UserService {
  async createUser(dto: CreateUserDto): Promise<User> {
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      throw new Error('Invalid email format');
    }

    // 验证名称
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Name is required');
    }

    // 生成唯一 ID
    const id = this.generateId();

    return {
      id,
      email: dto.email,
      name: dto.name,
      createdAt: new Date()
    };
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

**运行测试**:
```bash
pnpm test tests/unit/services/user-service.test.ts
```

**预期结果**: PASS ✓✓✓

---

#### 步骤 5: Commit

```bash
git add src/models/user.ts src/services/user-service.ts tests/unit/services/user-service.test.ts
git commit -m "feat(user): implement UserService.createUser with TDD

- Add User and CreateUserDto interfaces
- Implement createUser with email/name validation
- Add unit tests for success and validation scenarios
- TDD cycle: 3 tests, all passing"
```

---

## 示例 2: Python 数据模型 TDD

### 场景：User 模型验证

#### 背景

需要实现 User 数据模型，要求：
- 邮箱格式验证
- 密码强度验证（至少 8 字符）
- 自动哈希密码

---

#### 步骤 1: 编写失败测试

**文件**: `tests/test_user_model.py`

```python
import pytest
from src.models.user import User, ValidationError

class TestUserModel:
    def test_create_valid_user(self):
        user = User(
            email='test@example.com',
            password='secure123'
        )
        
        assert user.email == 'test@example.com'
        assert user.password_hash is not None
        assert user.password_hash != 'secure123'  # 密码应该被哈希
        assert user.created_at is not None
    
    def test_reject_invalid_email(self):
        with pytest.raises(ValidationError, match='Invalid email'):
            User(email='invalid-email', password='secure123')
    
    def test_reject_weak_password(self):
        with pytest.raises(ValidationError, match='Password must be at least 8 characters'):
            User(email='test@example.com', password='short')
```

**运行测试**:
```bash
pytest tests/test_user_model.py -v
```

**预期结果**: FAIL
```
ModuleNotFoundError: No module named 'src.models.user'
```

---

#### 步骤 2: 编写最少实现

**文件**: `src/models/user.py`

```python
from datetime import datetime
import re
import hashlib

class ValidationError(Exception):
    pass

class User:
    def __init__(self, email: str, password: str):
        # 验证邮箱
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValidationError('Invalid email format')
        
        # 验证密码强度
        if len(password) < 8:
            raise ValidationError('Password must be at least 8 characters')
        
        self.email = email
        self.password_hash = self._hash_password(password)
        self.created_at = datetime.now()
    
    def _hash_password(self, password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()
```

**运行测试**:
```bash
pytest tests/test_user_model.py -v
```

**预期结果**: PASS ✓✓✓

---

#### 步骤 3: 添加更多测试

```python
class TestUserModel:
    # ... 前面的测试 ...
    
    def test_password_verification(self):
        user = User(email='test@example.com', password='secure123')
        assert user.verify_password('secure123') is True
        assert user.verify_password('wrong_password') is False
    
    def test_user_repr(self):
        user = User(email='test@example.com', password='secure123')
        assert repr(user) == "User(email='test@example.com')"
```

**运行测试**: FAIL（verify_password 和 __repr__ 方法不存在）

---

#### 步骤 4: 实现新方法

**文件**: `src/models/user.py`（更新）

```python
class User:
    # ... __init__ 方法 ...
    
    def verify_password(self, password: str) -> bool:
        return self.password_hash == self._hash_password(password)
    
    def __repr__(self) -> str:
        return f"User(email='{self.email}')"
```

**运行测试**: PASS ✓✓✓✓✓

---

## 示例 3: TypeScript API 端点 TDD

### 场景：GET /api/users/:id

#### 背景

需要实现获取用户详情的 API 端点：
- 用户存在时返回 200
- 用户不存在时返回 404
- 响应格式符合契约

---

#### 步骤 1: 编写集成测试

**文件**: `tests/integration/users-api.test.ts`

```typescript
import request from 'supertest';
import { app } from '../../src/app';
import { User } from '../../src/models/user';

describe('GET /api/users/:id', () => {
  it('should return user details for existing user', async () => {
    // Arrange: 创建测试用户
    const testUser = await User.create({
      email: 'test@example.com',
      name: 'Test User'
    });

    // Act: 请求用户详情
    const response = await request(app)
      .get(`/api/users/${testUser.id}`)
      .expect(200);

    // Assert: 验证响应
    expect(response.body).toMatchObject({
      id: testUser.id,
      email: testUser.email,
      name: testUser.name
    });
    expect(response.body).not.toHaveProperty('password'); // 不应返回密码
  });

  it('should return 404 for non-existent user', async () => {
    const response = await request(app)
      .get('/api/users/non-existent-id')
      .expect(404);

    expect(response.body).toMatchObject({
      error: 'User not found',
      status: 404
    });
  });
});
```

**运行测试**: FAIL（路由不存在）

---

#### 步骤 2: 实现路由

**文件**: `src/routes/users.ts`

```typescript
import { Router, Request, Response } from 'express';
import { User } from '../models/user';

const router = Router();

router.get('/api/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        status: 404
      });
    }

    // 移除敏感字段
    const { password, ...userWithoutPassword } = user.toObject();

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      status: 500
    });
  }
});

export default router;
```

**运行测试**: PASS ✓✓

---

## 示例 4: 边界条件测试

### 场景：分页查询

```typescript
describe('UserService.listUsers - Pagination', () => {
  beforeEach(async () => {
    // 创建 25 个测试用户
    for (let i = 0; i < 25; i++) {
      await User.create({
        email: `user${i}@example.com`,
        name: `User ${i}`
      });
    }
  });

  it('should return first page with default limit', async () => {
    const result = await service.listUsers();
    
    expect(result.users.length).toBe(10); // 默认每页 10 条
    expect(result.total).toBe(25);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(3);
  });

  it('should return custom page size', async () => {
    const result = await service.listUsers({ page: 1, limit: 5 });
    
    expect(result.users.length).toBe(5);
    expect(result.totalPages).toBe(5);
  });

  it('should return empty array for out-of-range page', async () => {
    const result = await service.listUsers({ page: 100 });
    
    expect(result.users.length).toBe(0);
    expect(result.page).toBe(100);
  });

  it('should reject invalid page number', async () => {
    await expect(
      service.listUsers({ page: 0 })
    ).rejects.toThrow('Page must be greater than 0');

    await expect(
      service.listUsers({ page: -1 })
    ).rejects.toThrow('Page must be greater than 0');
  });

  it('should reject invalid limit', async () => {
    await expect(
      service.listUsers({ limit: 0 })
    ).rejects.toThrow('Limit must be between 1 and 100');

    await expect(
      service.listUsers({ limit: 101 })
    ).rejects.toThrow('Limit must be between 1 and 100');
  });
});
```

---

## TDD 最佳实践总结

### ✅ DO: 应该做的

1. **先写测试，再写实现**
   - 即使你知道如何实现，也要先写测试

2. **编写最小失败测试**
   - 一次只测试一个行为
   - 测试应该明确预期结果

3. **编写最少实现代码**
   - 只写让测试通过的代码
   - 不要提前优化或过度设计

4. **频繁运行测试**
   - 每写一个测试就运行
   - 每改一行实现就运行

5. **使用描述性测试名称**
   - `should create user with valid email`
   - `should throw error for invalid email`

### ❌ DON'T: 不应该做的

1. **不要跳过失败测试**
   - 如果测试一开始就通过，说明测试写错了

2. **不要一次性写多个测试**
   - 一次一个测试，保持专注

3. **不要实现超出测试的代码**
   - 测试没要求的，不要写

4. **不要忽略失败测试**
   - 测试失败是好事，说明你在前进

5. **不要忘记 Commit**
   - 每个 TDD 循环结束后 Commit
   - Commit 信息说明实现了什么

---

## 在 TASKS.md 中使用 TDD 示例

参考这些示例，在 TASKS.md 中标注 TDD 节奏：

```markdown
## Phase 3: User Story 1 — 用户管理 (P1)

### Implementation for User Story 1

- [ ] T007 [US1] 编写 UserService.createUser 失败测试
  - 文件：tests/unit/services/user-service.test.ts
  - 断言：expect(user.email).toBe('test@example.com')
  - 运行：pnpm test tests/unit/services/user-service.test.ts
  - 预期：FAIL - "createUser is not defined"

- [ ] T008 [US1] 实现 UserService.createUser 最少代码
  - 文件：src/services/user-service.ts
  - 实现：返回 mock user 对象让测试通过

- [ ] T009 [US1] 运行测试确认通过
  - 运行：pnpm test tests/unit/services/user-service.test.ts
  - 预期：PASS ✓

- [ ] T010 [US1] 增强测试：添加验证场景
  - 文件：tests/unit/services/user-service.test.ts
  - 追加：invalid email、empty name 测试用例

- [ ] T011 [US1] 实现验证逻辑
  - 文件：src/services/user-service.ts
  - 实现：email regex、name validation

- [ ] T012 [US1] Commit
  - 命令：git commit -m "feat(user): implement createUser with TDD"
```

---

## 使用指南

在 planning-breakdown 命令执行过程中：

- **Step 3.2（TDD 节奏标注）** → 参考本文件的示例格式
- **编写具体任务时** → 根据技术栈选择对应示例（TypeScript / Python）
- **边界条件测试** → 参考"示例 4"的分页测试模式
- **最佳实践** → 参考"TDD 最佳实践总结"
