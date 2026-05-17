---
name: chinese-commit-conventions
type: code-style
description: >-
  中文 Conventional Commits 规范——type 英文 + scope 中文 + 描述中文。当创建 Git 提交时自动触发。
  触发词：git commit、提交代码、commit message、提交信息。
version: "1.0.0"
author: "wta"
---

# 中文 Conventional Commits 规范

> type 使用英文标准关键字，scope 和描述使用中文。

## Iron Law

> **禁止使用非 Conventional Commits 格式的提交。** 模糊提交（"update"、"fix bug"、"修改"）不可接受。

## 提交格式

```
<type>(<scope>): <描述>

<body>
```

## Type（英文，必须）

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(用户模块): 添加手机号登录` |
| `fix` | 问题修复 | `fix(订单模块): 修复并发下单库存超卖` |
| `docs` | 文档变更 | `docs(API): 补充认证接口文档` |
| `style` | 代码格式（不影响逻辑） | `style(全局): 统一缩进为 2 空格` |
| `refactor` | 重构（非新功能、非修复） | `refactor(支付模块): 提取公共验签逻辑` |
| `perf` | 性能优化 | `perf(查询): 添加用户列表 Redis 缓存` |
| `test` | 测试相关 | `test(登录): 补充短信验证码边界测试` |
| `chore` | 构建/工具/依赖 | `chore(依赖): 升级核心依赖到主版本`（具体语言示例：Node `chore(依赖): 升级 TypeScript 到 5.6` / Python `chore(依赖): 升级 Pydantic 到 2.x` / Spring `chore(依赖): 升级 Spring Boot 到 3.4` / Go `chore(依赖): 升级 chi 到 v5`） |
| `ci` | CI/CD 变更 | `ci(部署): 添加预发环境自动部署` |

## Scope（中文，可选但推荐）

- 使用中文简短描述影响模块
- 2-5 个字为佳
- 示例：`用户模块`、`订单模块`、`支付模块`、`全局`、`API`

## 描述（中文，必须）
- 使用中文、动词开头
- 不超过 72 字符
- 描述做了什么，而非为什么（为什么写在 body 中）

## Body（中文，可选但推荐）
- 详细说明：为什么做这个变更？有什么注意事项？
- 关联 Issue：`关联 #123`

## 完整示例

```
feat(用户模块): 添加手机号验证码登录

支持中国大陆 +86 手机号短信验证码登录。
- 验证码有效期 5 分钟
- 同一手机号每分钟限发 1 次
- 同一 IP 每小时限发 10 次

关联 #456
```

```
fix(订单模块): 修复并发下单库存超卖

使用 Redis 分布式锁保护库存扣减操作。
修复前：高并发下多个请求可能读到相同的库存快照。
修复后：扣减操作原子化，库存不会出现负数。

关联 #789
```

## 提交前自检列表

- [ ] 代码通过 lint 检查
- [ ] 相关测试通过
- [ ] 无调试代码残留（console.log、debugger、临时注释）
- [ ] 无敏感信息（密码、Token、API Key）
- [ ] 提交范围合理（一组合适的变更 = 一个 commit）
- [ ] 提交信息遵循 `<type>(<scope>): <描述>` 格式

## 反模式

| 反模式 | 说明 | 改进 |
|--------|------|------|
| `update` / `修改` | 没有说明做了什么 | `feat(用户模块): 添加手机号登录` |
| `fix bug` / `修复问题` | 没有说明修复了什么 | `fix(订单模块): 修复并发下单库存超卖` |
| `wip` / `进行中` | WIP 提交应该在最终提交前 squash | 使用 `git rebase -i` 合并为有意义的提交 |
| 空提交信息 | 完全没有描述 | 必须提供清晰的描述 |
