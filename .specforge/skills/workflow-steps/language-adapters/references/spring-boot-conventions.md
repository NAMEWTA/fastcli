# Spring Boot 项目约定（Spring Boot Conventions）

> 本文件作为 `language-adapters` SKILL 的 Java/Spring Boot 适配补充。仅在主流程引用 language-adapters 第 1 节并需要 Spring Boot 细节时按需阅读。

## 1. 多模块 Maven 结构

```
my-app/
├── pom.xml                    # 父 POM：dependencyManagement、版本统一
├── my-app-api/                # 对外接口/契约模块（DTO + interface）
│   └── pom.xml
├── my-app-core/               # 领域模型与服务（无 Spring 依赖）
│   └── pom.xml
├── my-app-app/                # Spring Boot 主应用（@SpringBootApplication）
│   └── pom.xml
└── my-app-test/               # 集成测试与 testcontainers
    └── pom.xml
```

**约定：**
- 父 POM 仅维护 `<dependencyManagement>` 与 `<pluginManagement>`，不直接声明 dependencies
- 应用模块单独存在（`-app`），便于独立打包 fat jar
- API 模块不依赖 Spring，可被任意客户端复用
- 版本统一通过 `<properties>` 定义（如 `${spring-boot.version}`）

## 2. application.yml profile 约定

```
src/main/resources/
├── application.yml            # 通用配置 + spring.profiles.active 默认值
├── application-dev.yml        # 开发环境
├── application-test.yml       # 测试环境（CI/集成测试）
├── application-staging.yml    # 预发环境
└── application-prod.yml       # 生产环境（仅密钥占位符 ${ENV_VAR}）
```

**约定：**
- 生产配置中**禁止明文密钥**，用 `${DB_PASSWORD}` 等环境变量占位
- profile 切换通过 `--spring.profiles.active=prod` 或环境变量 `SPRING_PROFILES_ACTIVE`
- 同一 key 多 profile 时遵循"profile-specific 覆盖通用"原则
- 配置类用 `@ConfigurationProperties(prefix = "...")` 强类型绑定

## 3. Actuator 端点约定（运维/监控必备）

`pom.xml` 引入 `spring-boot-starter-actuator` 后，`application.yml` 显式声明：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized
      probes:
        enabled: true
  metrics:
    tags:
      application: ${spring.application.name}
```

**release 阶段 OPS-RUNBOOK.md 必填项**：
- `/actuator/health` URL + 期望响应（用于 K8s liveness/readiness probe）
- `/actuator/prometheus` URL（如使用 Prometheus）
- 关键 metrics 名称与告警阈值（如 `http_server_requests_seconds_max{uri="/api/...",status="5xx"}`）

## 4. 测试分层约定

| 层级 | 注解 | 范围 | 依赖 |
|------|------|------|------|
| 单元 | `@ExtendWith(MockitoExtension.class)` | 单一 Service/Component | Mockito 模拟外部依赖 |
| 切片 | `@WebMvcTest` / `@DataJpaTest` | 单一 Controller / Repository | 仅加载相关 Bean |
| 集成 | `@SpringBootTest` | 完整应用上下文 | testcontainers + RestAssured |

**约定：**
- 单元测试在 `src/test/java/.../<service>/<class>Test.java`
- 集成测试在独立模块 `-test/` 或包 `it/`，命名 `*IT.java`，由 failsafe 插件运行
- 使用 testcontainers 而非 H2，保证测试与生产数据库一致
- 集成测试启动时间 > 5s 时考虑使用 `@DirtiesContext(classMode = AFTER_CLASS)` 控制刷新时机

## 5. 包结构约定（Layered + Feature 折中）

```
com.example.myapp
├── MyAppApplication.java      # @SpringBootApplication 入口
├── config/                    # @Configuration 类
├── api/                       # 对外 REST/gRPC 入口（@RestController）
│   └── <feature>/
├── domain/                    # 领域模型（无框架依赖）
│   └── <feature>/
├── service/                   # 应用服务（事务边界）
│   └── <feature>/
├── repository/                # 数据访问（Spring Data）
│   └── <feature>/
└── infrastructure/            # 外部集成（HTTP client、消息）
```

## 6. 常见反模式

| 反模式 | 改进 |
|--------|------|
| Controller 直接调用 Repository | 经 Service 层；Service 是事务边界 |
| `@Autowired` 字段注入 | 改为构造器注入（final 字段 + Lombok `@RequiredArgsConstructor`） |
| 在 `application.yml` 写明文密钥 | 使用 `${ENV_VAR}` 占位 + 部署时注入 |
| 单元测试启动 `@SpringBootTest` | 单元用 Mockito，仅集成才启动完整上下文 |
| 异常用 `RuntimeException` 抛 | 自定义业务异常 + `@ControllerAdvice` 统一处理 |
| 日志用 `System.out.println` | 用 SLF4J（`@Slf4j` Lombok），结构化字段 |
