---
name: springboot-tdd
type: testing-rule
description: >-
  Spring Boot 测试规范——JUnit 5 + Mockito 单元测试、MockMvc、@DataJpaTest、Testcontainers、JaCoCo 门禁。为 Spring Boot 写测试时触发。
  触发词：Spring Boot、JUnit、Mockito、MockMvc、@WebMvcTest、@DataJpaTest、Testcontainers、JaCoCo。
version: "1.0.0"
author: "wta"
---

# Spring Boot 测试规范

> TDD 节奏见 `skills/testing/tdd-workflow/`；构建/静态扫描/安全门禁见 `skills/workflow-steps/springboot-verification/`；安全编码见 `skills/security/springboot-security/`。

## Iron Law

> **切片先于全景；Mock 切口放在服务边界。** 永远优先使用 Spring Test 切片注解（`@WebMvcTest` / `@DataJpaTest`）替代 `@SpringBootTest`；单元测试只 Mock 依赖边界（Repository、外部 Client），不 Mock 被测对象的内部协作者。

## 1. 测试金字塔（Spring Boot 口径）

| 层级 | 注解/工具 | 目标 | 占比 | 耗时 |
|------|---------|------|-----|------|
| 单元 | `@ExtendWith(MockitoExtension.class)` | Service / Domain 逻辑，Mock 仓储 | 60-70% | ms |
| Web 切片 | `@WebMvcTest(Controller.class)` | 控制器、参数绑定、校验、异常映射 | 10-15% | 百 ms |
| 持久层切片 | `@DataJpaTest` + Testcontainers | Repository 查询、事务、迁移 | 10-15% | 秒 |
| 集成 | `@SpringBootTest` + `MockMvc` | 跨层契约、安全链、过滤器 | 5-10% | 数秒 |
| 端到端 | 外部客户端 / REST Assured | 部署态冒烟 | ≤ 5% | 数十秒 |

**反模式**：所有测试都用 `@SpringBootTest` —— 启动全上下文，慢且难定位。

## 2. 单元测试（Service）

```java
@ExtendWith(MockitoExtension.class)
class MarketServiceTest {

  @Mock MarketRepository repo;
  @Mock Clock clock;
  @InjectMocks MarketService service;

  @Test
  void create_whenValid_returnsPersistedMarket() {
    // Arrange
    var req = new CreateMarketRequest("name", "desc", Instant.parse("2030-01-01T00:00:00Z"), List.of("cat"));
    given(repo.save(any(Market.class))).willAnswer(inv -> inv.getArgument(0));

    // Act
    Market result = service.create(req);

    // Assert
    assertThat(result.name()).isEqualTo("name");
    then(repo).should().save(any(Market.class));
  }

  @Test
  void create_whenDuplicateName_throwsConflict() {
    given(repo.existsByName("name")).willReturn(true);

    assertThatThrownBy(() -> service.create(newReq("name")))
        .isInstanceOf(DuplicateMarketException.class)
        .hasMessageContaining("name");
  }
}
```

### 规则

- **AAA 组织**：`// Arrange / Act / Assert` 注释让意图显性化
- **BDD 风格 Mockito**：`given(...)` + `then(...).should()` 可读性优于 `when/verify`
- **`@InjectMocks`** 只用于被测类；其余全 `@Mock`
- **不 Mock POJO/值对象**：对 `CreateMarketRequest` 这样的 record，直接 new
- **参数化用 `@ParameterizedTest`**：覆盖边界值与错误分支

## 3. Web 层切片（`@WebMvcTest`）

只加载 Controller + 其依赖的 WebMvc 基础设施；Service/Repository 全 Mock。

```java
@WebMvcTest(MarketController.class)
class MarketControllerTest {

  @Autowired MockMvc mockMvc;
  @MockBean MarketService marketService;

  @Test
  void list_returns200WithPage() throws Exception {
    given(marketService.list(any())).willReturn(Page.empty());

    mockMvc.perform(get("/api/markets"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray());
  }

  @Test
  void create_whenInvalidPayload_returns400() throws Exception {
    mockMvc.perform(post("/api/markets")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name": "", "endDate": "not-a-date"}
                """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[*].field").value(hasItems("name", "endDate")));
  }
}
```

**要点**：

- 开启 Spring Security 时配合 `@WithMockUser` 或 `.with(csrf())`
- JSON 断言用 `jsonPath`；路径写在 `$.content[0].name` 之类的可读形式
- 多端点共用 `MockMvc` 通过 `@Import` 注入自定义 `JacksonConfig`、`RestExceptionHandler`

## 4. 持久层切片（`@DataJpaTest` + Testcontainers）

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)  // ❗ 不替换为 H2
@Testcontainers
class MarketRepositoryTest {

  @Container
  static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16-alpine")
      .withReuse(true);                 // 本地开发复用容器

  @DynamicPropertySource
  static void props(DynamicPropertyRegistry r) {
    r.add("spring.datasource.url", pg::getJdbcUrl);
    r.add("spring.datasource.username", pg::getUsername);
    r.add("spring.datasource.password", pg::getPassword);
  }

  @Autowired MarketRepository repo;

  @Test
  void findByName_returnsEntity() {
    var saved = repo.save(new MarketEntity("Test"));
    assertThat(repo.findByName("Test")).hasValueSatisfying(
        m -> assertThat(m.getId()).isEqualTo(saved.getId())
    );
  }
}
```

**反模式**：在 `@DataJpaTest` 里默认的 H2 上写测试。H2 与 Postgres 的 SQL 方言、事务语义不一致，测试绿线上红是常见翻车点。

**配合**：`~/.testcontainers.properties` 里 `testcontainers.reuse.enable=true` 让本地多次运行秒级启动。

## 5. 集成测试（`@SpringBootTest`）

用于**跨层契约**、**安全过滤链**、**Liquibase/Flyway 实际应用**。

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class MarketIntegrationTest {

  @Container static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void props(DynamicPropertyRegistry r) {
    r.add("spring.datasource.url", pg::getJdbcUrl);
    r.add("spring.datasource.username", pg::getUsername);
    r.add("spring.datasource.password", pg::getPassword);
  }

  @Autowired MockMvc mockMvc;

  @Test
  @WithMockUser(roles = "ADMIN")
  void create_thenList_endToEnd() throws Exception {
    mockMvc.perform(post("/api/markets")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
              {"name":"IT","description":"D","endDate":"2030-01-01T00:00:00Z","categories":["x"]}
            """))
        .andExpect(status().isCreated());

    mockMvc.perform(get("/api/markets"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].name").value("IT"));
  }
}
```

**准则**：

- 集成测试总数 ≤ 单元 + 切片的 20%
- 每个端点最多 1-2 条 happy path + 1 条安全/事务路径
- 避免在集成测试里做"穷举校验"——那是切片测试的职责

## 6. 断言风格

**首选 AssertJ**（`assertThat(...)`）：

```java
assertThat(list).hasSize(3).extracting(User::name).containsExactly("A", "B", "C");
assertThat(result).isNotNull().satisfies(r -> {
    assertThat(r.id()).isPositive();
    assertThat(r.name()).isEqualTo("Alice");
});
assertThatThrownBy(() -> svc.do())
    .isInstanceOf(ValidationException.class)
    .hasMessageContaining("email");
```

**JSON**：`jsonPath("$.data.name")`、`jsonPath("$.errors", hasSize(2))`。

**时间**：注入 `Clock` bean，测试里传 `Clock.fixed(instant, zone)`；不要用 `Instant.now()` 做断言基线。

## 7. 测试数据构造

### 7.1 Test Data Builder

```java
class MarketBuilder {
  private String name = "Default";
  private MarketStatus status = MarketStatus.ACTIVE;
  MarketBuilder withName(String v) { this.name = v; return this; }
  MarketBuilder asDraft() { this.status = MarketStatus.DRAFT; return this; }
  Market build() { return new Market(null, name, status); }
}

// 用法
var draft = new MarketBuilder().withName("IT").asDraft().build();
```

### 7.2 @Sql 脚本（仅用于复杂固定场景）

```java
@Test
@Sql("/fixtures/multi-market.sql")
void findActiveMarkets_returnsOnlyActive() { ... }
```

常规测试优先用 Builder / Repository 写入，SQL 脚本会让测试与 schema 隐式耦合。

## 8. 覆盖率门禁（JaCoCo）

Maven：

```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.14</version>
  <executions>
    <execution><goals><goal>prepare-agent</goal></goals></execution>
    <execution>
      <id>report</id>
      <phase>verify</phase>
      <goals><goal>report</goal></goals>
    </execution>
    <execution>
      <id>check</id>
      <goals><goal>check</goal></goals>
      <configuration>
        <rules>
          <rule>
            <element>BUNDLE</element>
            <limits>
              <limit>
                <counter>LINE</counter>
                <value>COVEREDRATIO</value>
                <minimum>0.80</minimum>
              </limit>
              <limit>
                <counter>BRANCH</counter>
                <value>COVEREDRATIO</value>
                <minimum>0.70</minimum>
              </limit>
            </limits>
          </rule>
        </rules>
      </configuration>
    </execution>
  </executions>
</plugin>
```

**排除**：`*Application.class`、`*Config.class`、生成的 DTO、迁移脚本可放入 `excludes`。

## 9. 命令速查

```bash
# Maven
mvn -T 4 test                            # 仅跑测试
mvn -T 4 verify                          # 含 JaCoCo check
mvn -T 4 -Dtest='MarketServiceTest' test # 单类
mvn -T 4 -Dtest='*#create_*' test        # 方法模式

# Gradle
./gradlew test
./gradlew test jacocoTestReport jacocoTestCoverageVerification
./gradlew test --tests '*.MarketServiceTest.create_*'
```

## 10. 反模式红线

| 反模式 | 问题 | 修正 |
|-------|------|------|
| 所有测试都 `@SpringBootTest` | 启动慢、定位难 | 优先切片注解 |
| `@DataJpaTest` 默认 H2 | 方言/事务不同 → 上线炸 | Testcontainers + Postgres |
| Mock 被测类的 `this` | 无意义 | 只 Mock 边界 |
| `verify(mock).save(argumentCaptor.capture())` 缺对应断言 | 捕获不检查等于没测 | 捕获后必 `assertThat(captor.getValue())` |
| 测试内 `Thread.sleep` | flaky | `Awaitility.await().atMost(..)` |
| `@Transactional` 用于回滚 | 掩盖真实提交问题 | `@Sql` 或事后清理 |
| 静态字段在测试间共享 | 顺序耦合 | 改为字段级 + `@BeforeEach` |
| 直接断言异常类的 `getMessage()` 精确匹配 | 文案一改全红 | `hasMessageContaining("key phrase")` |
| 忽略 `@MockBean` 导致的 bean 重载告警 | 上下文反复重启 | 单文件固化 `@MockBean`，慎跨类切换 |

## 11. 自检清单

- [ ] 单元测试使用 `@ExtendWith(MockitoExtension.class)`，不启动 Spring
- [ ] Controller 测试使用 `@WebMvcTest(Xxx.class)` 显式指定
- [ ] Repository 测试使用 Testcontainers + 真实数据库镜像
- [ ] 集成测试最多覆盖 happy path + 安全路径
- [ ] 断言使用 AssertJ，异常用 `assertThatThrownBy`
- [ ] 时间通过 `Clock` 注入，测试传 fixed clock
- [ ] JaCoCo 行覆盖 ≥ 80%、分支 ≥ 70% 作为 CI 门禁
- [ ] 无 `Thread.sleep` / 无共享静态状态
- [ ] 并行测试可执行（`junit.jupiter.execution.parallel.enabled=true` 时绿）
- [ ] 测试命名 `method_givenCondition_expectsOutcome`

## 12. 关联

- TDD 节奏：`skills/testing/tdd-workflow/`
- 构建 + 静态扫描 + CVE 扫描：`skills/workflow-steps/springboot-verification/`
- 安全编码规范：`skills/security/springboot-security/`
- 多语言命令矩阵：`skills/workflow-steps/language-adapters/`
