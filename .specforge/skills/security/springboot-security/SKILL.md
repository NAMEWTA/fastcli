---
name: springboot-security
type: security-rule
description: >-
  Spring Security 生产安全基线——认证/授权、Bean Validation、CSRF/CORS/响应头、密码哈希、秘密管理、限流、文件上传、日志脱敏、依赖 CVE。处理认证、输入、秘密时触发。
  触发词：Spring Security、JWT、OAuth2、@PreAuthorize、BCrypt、CSRF、CORS、CSP、限流、OWASP。
version: "1.0.0"
author: "wta"
---

# Spring Boot 安全基线

> 通用 SQL 注入防护见 `skills/security/sql-injection-prevention/`；验证闭环流程见 `skills/workflow-steps/springboot-verification/`；本技能只讲 Spring Boot 特有的安全配置与编码规则。

## Iron Law

> **Deny by default · Validate everything · Least privilege · Externalize secrets.** 四条线并行执行：默认拒绝、输入必校、权限最小、秘密外置。任何一条放弃就等于把其他三条也交出去。

## 1. 认证（Authentication）

### 1.1 选型矩阵

| 场景 | 推荐 | 理由 |
|------|-----|------|
| 纯 API / 前后端分离 | 短期 JWT + 刷新 token 或不透明 token + 撤销列表 | 无状态、水平扩展 |
| 浏览器会话应用 | Session cookie（`HttpOnly` + `Secure` + `SameSite=Strict`） | 天然 CSRF 防护配合生效 |
| 第三方接入 | OAuth2 Authorization Code + PKCE | 避免在前端长期留 token |
| 内部服务间 | mTLS 或签名请求（HMAC） | 拒绝 Bearer token 被盗后跨机横移 |

### 1.2 JWT 过滤器骨架

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

  private final JwtService jwtService;

  public JwtAuthFilter(JwtService jwtService) {
    this.jwtService = jwtService;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    String header = req.getHeader(HttpHeaders.AUTHORIZATION);
    if (header != null && header.startsWith("Bearer ")) {
      try {
        Authentication auth = jwtService.authenticate(header.substring(7));
        SecurityContextHolder.getContext().setAuthentication(auth);
      } catch (JwtException e) {
        SecurityContextHolder.clearContext();   // ❗ 签名/过期异常不透传到 Controller
      }
    }
    chain.doFilter(req, res);
  }
}
```

**红线**：

- 签名算法固定服务端常量，**不接受** header 的 `alg` 协商（历史上出现过 `alg: none` 绕过）
- `exp` 短（15-30 分钟）；刷新 token 独立保存且可撤销
- 登出场景必须有服务端黑名单或版本号，光删前端 token 等于没删

### 1.3 Spring Security 6.x 配置

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity                       // 开启 @PreAuthorize
public class SecurityConfig {

  @Bean
  SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwt) throws Exception {
    return http
        .csrf(csrf -> csrf.disable())        // 无状态 API 关；会话应用需保留
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/public/**", "/actuator/health").permitAll()
            .anyRequest().authenticated())
        .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class)
        .exceptionHandling(eh -> eh
            .authenticationEntryPoint((r, s, e) -> s.sendError(401))
            .accessDeniedHandler((r, s, e) -> s.sendError(403)))
        .build();
  }
}
```

## 2. 授权（Authorization）

**原则**：**Deny by default**——`anyRequest().authenticated()` 放最后一条；权限在方法层二次声明。

```java
@RestController
@RequestMapping("/api/markets")
public class MarketController {

  @PreAuthorize("hasRole('ADMIN')")
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) { ... }

  @PreAuthorize("@authz.isOwner(#id, authentication)")
  @PutMapping("/{id}")
  public ResponseEntity<Market> update(@PathVariable Long id, @Valid @RequestBody UpdateDto dto) { ... }
}
```

**规则**：

- URL 级 + 方法级**双层**授权，单层漏了也不至于洞开
- 资源所有权检查写成专门 bean（如 `@authz.isOwner(...)`），便于复用和单元测试
- 测试必须覆盖 **401/403** 路径，不光是 200

## 3. 输入校验

**所有**跨信任边界的数据必过校验：HTTP 请求、消息队列消息、文件名、上传体、外部回调。

```java
public record CreateUserDto(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email String email,
    @NotNull @Min(0) @Max(150) Integer age,
    @Pattern(regexp = "^[A-Za-z0-9_]+$") String username
) {}

@PostMapping("/users")
public ResponseEntity<UserDto> create(@Valid @RequestBody CreateUserDto dto) {
  return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
}

@RestControllerAdvice
class ValidationExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> onInvalid(MethodArgumentNotValidException e) {
    var errors = e.getBindingResult().getFieldErrors().stream()
        .map(fe -> new FieldError(fe.getField(), fe.getDefaultMessage()))
        .toList();
    return ResponseEntity.badRequest().body(new ApiError("VALIDATION_FAILED", errors));
  }
}
```

**红线**：

- 不信 Content-Type；`@RequestBody` 绑定后必 `@Valid`
- 富文本必走白名单（OWASP Java HTML Sanitizer），**不要**自己写正则过滤
- 校验失败的响应体**不得**回显原始输入值（可能是 payload），只回显字段名 + 错误码

## 4. SQL 注入防护

**一句话**：`@Param` + Spring Data 派生方法 / JPQL，禁止字符串拼接原生 SQL。

```java
// ✅
@Query("SELECT u FROM User u WHERE u.name = :name")
List<User> findByName(@Param("name") String name);

List<User> findByEmailIgnoreCaseAndActiveTrue(String email);   // 派生方法，自动参数化

// ❌ nativeQuery 还拼字符串
@Query(value = "SELECT * FROM users WHERE name = '" + name + "'", nativeQuery = true)
```

通用多语言规则看 `skills/security/sql-injection-prevention/`。

## 5. 密码哈希

```java
@Bean
PasswordEncoder passwordEncoder() {
  // 推荐 Argon2id；BCrypt 可接受，cost 随硬件演进（12-14）
  return new BCryptPasswordEncoder(12);
}

public void register(RegisterDto dto) {
  String hash = passwordEncoder.encode(dto.password());
  userRepo.save(new User(dto.email(), hash));
}
```

**红线**：

- 永不存明文；永不存可逆加密
- 永不用 MD5 / SHA-1 / SHA-256 裸哈希做密码存储（无盐、无慢化）
- 登录失败响应**不区分** "账号不存在" 与 "密码错误"

## 6. CSRF

| 应用形态 | 配置 |
|---------|------|
| 会话 + 浏览器表单 | **保持** CSRF 开启；Cookie 存 token 或 Header `X-XSRF-TOKEN` |
| 纯 API（Bearer token，无 cookie） | 可关闭 CSRF；保证无任何 cookie 认证路径残留 |
| 混合（同时有 session + api） | 对 API 路径单独关闭：`csrf.ignoringRequestMatchers("/api/**")` |

## 7. CORS

全局配置、白名单域、禁用通配：

```java
@Bean
CorsConfigurationSource corsConfigurationSource() {
  var cfg = new CorsConfiguration();
  cfg.setAllowedOrigins(List.of("https://app.example.com"));
  cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
  cfg.setAllowedHeaders(List.of("Authorization", "Content-Type"));
  cfg.setAllowCredentials(true);
  cfg.setMaxAge(3600L);

  var src = new UrlBasedCorsConfigurationSource();
  src.registerCorsConfiguration("/api/**", cfg);
  return src;
}
```

**红线**：生产环境禁止 `setAllowedOrigins(List.of("*"))`；需要多域就用 `setAllowedOriginPatterns`。

## 8. 安全响应头

```java
http.headers(h -> h
    .contentSecurityPolicy(csp -> csp.policyDirectives(
        "default-src 'self'; frame-ancestors 'none'; object-src 'none'"))
    .frameOptions(f -> f.sameOrigin())
    .referrerPolicy(r -> r.policy(ReferrerPolicy.NO_REFERRER))
    .httpStrictTransportSecurity(hsts -> hsts
        .includeSubDomains(true).maxAgeInSeconds(63072000))
    .permissionsPolicy(p -> p.policy("geolocation=(), microphone=(), camera=()"))
);
```

静态页面 / 富文本接入需针对性放宽 `script-src` / `style-src`；**禁止** `unsafe-inline` 兜底。

## 9. 秘密管理

| 做法 | 示例 |
|------|-----|
| ✅ 环境变量占位 | `password: ${DB_PASSWORD}` |
| ✅ Spring Cloud Vault / Config Server | `spring.cloud.vault.*` |
| ✅ K8s Secret + CSI 挂载 | 不落盘到镜像 |
| ❌ 硬编码在 `application.yml` | `password: myPa$$w0rd` |
| ❌ 提交 `.env` 到仓库 | `git add .env` |
| ❌ 在日志里回显密钥 | `log.info("Using key={}", key)` |

**轮换**：数据库/Redis 密码 90 天；JWT 签名密钥 180 天；云 IAM 凭证尽量短效（STS/IRSA）。

## 10. 限流与反暴力

### 10.1 端点级限流（Bucket4j）

```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {

  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  private Bucket newBucket() {
    return Bucket.builder()
        .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
        .build();
  }

  @Override
  protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws IOException, ServletException {
    String key = req.getRemoteAddr();                        // 生产建议叠加 userId/API key
    Bucket bucket = buckets.computeIfAbsent(key, k -> newBucket());
    if (bucket.tryConsume(1)) {
      chain.doFilter(req, res);
    } else {
      res.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
      res.setHeader("Retry-After", "60");
      res.getWriter().write("{\"error\":\"rate_limited\"}");
    }
  }
}
```

生产建议走网关层（Spring Cloud Gateway / Nginx / Envoy）做 IP/用户粒度，应用层仅做关键接口二次防护（登录、重置密码、发短信）。

### 10.2 登录反暴力

- 失败 N 次 → 账户冷冻 5-15 分钟或触发 CAPTCHA
- 响应时间**恒定**（避免时序泄漏账号是否存在）
- 成功登录地理/设备异动 → 二次验证

## 11. 文件上传

| 规则 | 做法 |
|------|-----|
| 大小限制 | `spring.servlet.multipart.max-file-size` + 网关层双保险 |
| 类型白名单 | 校验 `Content-Type` + magic number（如 Apache Tika），不光看扩展名 |
| 文件名消毒 | `Paths.get(name).getFileName().toString()`，剔除 `..`、NUL、控制字符 |
| 存储位置 | 静态站点外的对象存储（S3/OSS）；本地只存到专用目录且 `chmod 640` |
| 下载路径 | 不回显上传用户给的路径；下载走带签名的短期 URL |
| 病毒扫描 | 接入 ClamAV / 云厂商扫描服务 |

## 12. 日志与 PII

- **禁止**日志中出现：密码、完整银行卡号、身份证号、JWT、API key、OAuth 刷新 token
- 使用 Logstash / Logback 的 **mask pattern** 或自定义 `PatternLayout` 做结构化脱敏
- Actuator 端点最小暴露：`management.endpoints.web.exposure.include: health,info,prometheus` —— 禁用 `env`、`heapdump`、`configprops`

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, info, prometheus
  endpoint:
    health:
      show-details: when-authorized
```

## 13. 依赖安全

- 每次构建跑 `dependency-check`（CVSS ≥ 7 即 fail build）
- Spring Boot / Spring Security 保持在官方支持版本（查 [Spring 支持矩阵](https://spring.io/projects/spring-boot#support)）
- 升级后必走 `springboot-verification` 闭环

## 14. 反模式红线

| 反模式 | 问题 | 修正 |
|-------|-----|------|
| `permitAll()` 在通配路径上 | 无意暴露 /actuator 或 /api/internal | 路径白名单 + 定期审计 |
| 异常消息返回给前端 | 栈信息/SQL 泄漏 | `@RestControllerAdvice` 转成稳定错误码 |
| `CORS allowedOrigins("*") + allowCredentials(true)` | 浏览器直接拒绝，若绕开将是 CSRF 放大器 | 显式域名白名单 |
| JWT 存 `localStorage` | XSS 窃取 | HttpOnly cookie + CSRF 配合 |
| Session fixation 不处理 | 登录后会话不换 | Spring Security 默认已处理，`csrf + sessionFixation().changeSessionId()` 保留 |
| 日志输出 `dto.toString()` | 无意中打出密码/token 字段 | DTO 敏感字段重写 `toString` 或加 `@ToString.Exclude` |
| Actuator 全开 + 无认证 | `/actuator/heapdump` = 全内存泄漏 | 最小暴露 + 独立端口 + 独立认证 |
| 上传目录可访问且可执行 | 上传 `.jsp` → RCE | 对象存储 + `noexec` + Content-Disposition |

## 15. 发布前自检清单

- [ ] 所有敏感端点有 URL + 方法双层授权
- [ ] 输入都带 `@Valid` 与约束注解；异常统一转错误码
- [ ] 密码使用 BCrypt/Argon2，cost 当前推荐值
- [ ] JWT 过期短 + 刷新 token 可撤销；登出有服务端记录
- [ ] CSRF 姿态与应用形态匹配
- [ ] CORS 无通配、`allowCredentials` 与 origin 白名单一致
- [ ] 安全响应头（CSP / HSTS / X-Frame / Referrer / Permissions）启用
- [ ] 秘密全部外置，`git secrets` / `gitleaks` 空
- [ ] 关键接口有限流，登录反暴力就位
- [ ] 上传/下载走对象存储 + 类型白名单 + 魔数校验
- [ ] 日志无敏感字段，Actuator 最小暴露
- [ ] `dependency-check` 无 High/Critical CVE 或都有 suppression 理由
- [ ] 401/403/429 的 **测试**都写了

## 16. 关联

- 通用 SQL 注入防护：`skills/security/sql-injection-prevention/`
- 发布前验证闭环：`skills/workflow-steps/springboot-verification/`
- Spring Boot 测试实战：`skills/testing/springboot-tdd/`
- 多语言命令矩阵：`skills/workflow-steps/language-adapters/`
