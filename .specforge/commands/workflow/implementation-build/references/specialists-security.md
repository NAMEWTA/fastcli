# Security Specialist 审查清单

> 触发条件：当 `SCOPE_AUTH=true`，或者 (`SCOPE_BACKEND=true` 且 diff > 100 行)。

## 审查范围

当涉及认证、授权、后端逻辑且变更超过 100 行时启用。

## 输出格式

每行一个 JSON 对象的发现结果：

```json
{"severity":"CRITICAL|INFORMATIONAL","confidence":N,"path":"file","line":N,"category":"security","summary":"...","fix":"...","fingerprint":"path:line:security","specialist":"security"}
```

可选字段：`line`、`fix`、`fingerprint`、`evidence`、`test_stub`。

如果没有发现：只输出 `NO FINDINGS`，其余什么都不要。

---

## 说明

这份清单比主流程里的 CRITICAL pass 更深入。主 agent 已经检查了 SQL injection、race conditions、LLM trust 和 enum completeness。这个 specialist 重点关注 auth/authz 模式、密码学误用以及攻击面扩张。

## 审查分类

### Trust Boundary 处的输入校验

- controller / handler 层没有校验就接受用户输入
- query 参数被直接用于数据库查询或文件路径
- request body 字段没有做类型检查或 schema 校验
- 文件上传没有做类型 / 大小 / 内容校验
- webhook payload 没有做签名验证就处理

### Auth & Authorization 绕过

- endpoint 缺少 authentication middleware（检查 route 定义）
- authorization 检查默认是"allow"而不是"deny"
- 角色升级路径（用户可以改自己的 role / permissions）
- 直接对象引用漏洞（用户 A 通过改 ID 访问用户 B 的数据）
- session fixation 或 session hijacking 机会
- token / API key 验证没有检查过期时间

### 注入向量（SQL 之外）

- 通过 subprocess 调用并把用户可控参数传进去，导致命令注入
- 模板注入（Jinja2、ERB、Handlebars）中混入用户输入
- 目录查询中的 LDAP injection
- 通过用户可控 URL 导致 SSRF（fetch、redirect、webhook target）
- 使用用户可控文件路径导致路径穿越（../../etc/passwd）
- 在 HTTP headers 里使用用户可控值导致 header injection

### 密码学误用

- 用弱哈希算法（MD5、SHA1）处理安全敏感操作
- token 或 secret 使用可预测随机数（Math.random、rand()）
- 对 secret、token 或 digest 使用非定长时间比较（`==`）
- 硬编码加密 key 或 IV
- 密码哈希缺少 salt

### Secret 泄露

- 源码里出现 API key、token 或 password（即使在注释里）
- secret 被写进应用日志或错误消息
- 把凭据放在 URL 里（query 参数或 URL 中的 basic auth）
- 向用户返回的错误响应里包含敏感数据
- 期望加密时却把 PII 明文存储

### 通过 escape hatch 引入 XSS

- Rails: 对用户可控数据调用 `.html_safe`、`raw()`
- React: 用用户内容做 `dangerouslySetInnerHTML`
- Vue: 用用户内容做 `v-html`
- Django: 对用户输入使用 `|safe`、`mark_safe()`
- 通用：对未净化数据做 `innerHTML` 赋值

### 反序列化

- 反序列化不可信数据（pickle、Marshal、YAML.load、对可执行类型做 JSON.parse）
- 接收来自用户输入或外部 API 的序列化对象，却没有做 schema 校验
