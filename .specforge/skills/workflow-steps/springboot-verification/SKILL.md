---
name: springboot-verification
type: workflow-step
description: >-
  Spring Boot 发布前验证闭环——构建、静态分析、测试 + JaCoCo、CVE 扫描、秘密检查、diff review。开 PR、重构、上线、依赖升级后触发。
  触发词：pre-PR、pre-release、verification loop、SpotBugs、Checkstyle、Dependency-Check、jacoco、上线前检查。
version: "1.0.0"
author: "wta"
---

# Spring Boot 发布前验证闭环

> 测试写法见 `skills/testing/springboot-tdd/`；安全编码细则见 `skills/security/springboot-security/`。本技能只负责"按顺序执行闭环、产出结构化报告"。

## Iron Law

> **六相验证，按序执行，任一红灯即停。** 构建 → 静态分析 → 测试 + 覆盖率 → 安全扫描 → 格式化 → diff review。前一相失败时，不要跳过去跑后一相——问题会叠加，报告会失真。

## 何时启动闭环

| 触发 | 执行深度 |
|------|---------|
| PR 提交前 | 全量 6 相 |
| 本地迭代中 | 快速 2 相（test + spotbugs） |
| 依赖升级 / 大重构后 | 全量 + 人工 diff review |
| 预上线 / 发布分支 | 全量 + 覆盖率门禁 + 安全门禁 |

## 六相闭环

### 第 1 相：构建

```bash
# Maven
mvn -T 4 clean verify -DskipTests

# Gradle
./gradlew clean assemble -x test
```

**目的**：确认源码能编译、资源文件能打包、Bean 扫描无冲突。编译失败必须先修复，**禁止**在编译未过时继续后续相位。

### 第 2 相：静态分析

```bash
# Maven（常见组合）
mvn -T 4 spotbugs:check pmd:check checkstyle:check

# Gradle
./gradlew spotbugsMain pmdMain checkstyleMain
```

**最小可行组合**：

| 工具 | 覆盖 |
|------|-----|
| **SpotBugs** + FindSecBugs 插件 | Bug 模式、并发、安全 sink |
| **PMD** | 代码气味、复杂度、未使用符号 |
| **Checkstyle** | 命名、格式、注释 |
| **ErrorProne** | 编译期静态检查（可替代 PMD 的一部分） |

**基线策略**：首次接入用 `-Dspotbugs.excludeFilterFile=spotbugs-exclude.xml` 固化历史违规，新增违规 0 容忍。

### 第 3 相：测试 + 覆盖率

```bash
# Maven
mvn -T 4 test
mvn jacoco:report
mvn jacoco:check                 # 触发覆盖率门禁

# Gradle
./gradlew test jacocoTestReport jacocoTestCoverageVerification
```

**门禁**：行覆盖 ≥ 80%、分支覆盖 ≥ 70%（具体阈值见 `springboot-tdd` 技能）。

**报告抽取**：

- Maven：`target/site/jacoco/index.html`、`target/surefire-reports/`
- Gradle：`build/reports/jacoco/test/html/index.html`、`build/reports/tests/test/`

### 第 4 相：安全扫描

#### 4.1 依赖 CVE

```bash
# Maven
mvn org.owasp:dependency-check-maven:check \
  -DfailBuildOnCVSS=7 \
  -DsuppressionFiles=dependency-check-suppressions.xml

# Gradle
./gradlew dependencyCheckAnalyze
```

**失败阈值**：CVSS ≥ 7（High/Critical）时 fail build；已确认不可利用的走 suppression 并注释理由。

#### 4.2 秘密扫描（源码）

```bash
# 常见指纹
grep -rnE "(password|passwd|pwd)\s*=\s*['\"]" src/ --include="*.java" --include="*.yml" --include="*.properties"
grep -rnE "sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}" src/
grep -rn "BEGIN (RSA|EC|OPENSSH) PRIVATE KEY" src/
```

#### 4.3 秘密扫描（git 历史）

```bash
git secrets --scan                 # git-secrets 已配置
gitleaks detect --source . --redact
trufflehog filesystem .
```

**建议**：任一命中先**轮换密钥**，再清理历史（`git filter-repo` / BFG）。

#### 4.4 常见代码安全 sniff

```bash
# System.out 代替 logger（掩盖级别、无法采样）
grep -rn "System\.out\.print" src/main/ --include="*.java"

# 直接把异常消息吐给前端（信息泄漏）
grep -rn "\.getMessage()" src/main/ --include="*.java" \
  | grep -Ev "logger\.|log\."

# CORS 通配
grep -rn "allowedOrigins.*\*" src/main/ --include="*.java"

# Actuator 未授权（示例：暴露 env/heapdump）
grep -rn "management\.endpoints\.web\.exposure\.include.*\*" src/main/ --include="*.yml"
```

### 第 5 相：格式化（选配门禁）

```bash
# Maven
mvn spotless:check                 # CI：只校验，不改
mvn spotless:apply                 # 本地：自动修复

# Gradle
./gradlew spotlessCheck
./gradlew spotlessApply
```

`spotless` 建议绑定到 `verify` 阶段；开发时配合 `pre-commit` 钩子自动 `apply`。

### 第 6 相：Diff Review

```bash
git diff --stat origin/main...HEAD
git diff origin/main...HEAD
```

**人工 checklist**：

- [ ] 无调试遗留：`System.out` / `printStackTrace` / `TODO` 无上下文 / 注释掉的代码块
- [ ] 错误响应结构一致，HTTP 状态语义正确
- [ ] 所有 `@Transactional` 方法粒度合理（不在 Controller、不包裹远程调用）
- [ ] Controller 入参有 `@Valid`
- [ ] 新增 application.yml key 有默认值或 README 说明
- [ ] 日志级别合理（INFO 不打每请求，DEBUG 不含敏感字段）
- [ ] 新增依赖在 BOM / dependencyManagement 中受控，无 `LATEST` / `RELEASE`

## 报告模板

结束后按此格式输出：

```
VERIFICATION REPORT
===================
Build:     [PASS|FAIL]        ⏱ 23s
Static:    [PASS|FAIL]        SpotBugs=0  PMD=0  Checkstyle=2(warn)
Tests:     [PASS|FAIL]        132/132 passed · Line 83.4% · Branch 72.1%
Security:  [PASS|FAIL]        CVE High=0 / Critical=0 · Secrets=0
Format:    [PASS|FAIL]        spotless clean
Diff:      [42 files, +980/-214]

Overall:   [READY|NOT READY]

Issues to Fix:
1. ...
2. ...
```

**报告铁律**：

- 不要写"大概""应该"——每项引用具体命令输出
- `PASS/FAIL` 必须与实际退出码一致
- 失败项按修复难度排序，便于顺序处理

## 快速反馈循环（日常迭代）

不要每改一行都跑完整 6 相。日常用最短闭环：

```bash
# Maven 最短闭环（通常 < 30s）
mvn -T 4 test -Dtest='*ChangedClass*Test' spotbugs:check
```

或绑定 IDE 的"改动文件范围测试"功能；全量 6 相留到 PR 前。

## 持续模式（长会话）

- 每 30-60 分钟或每完成一个子任务跑一轮短闭环
- 构建失败立即中断，不要在红灯堆叠的情况下继续写代码
- 静态分析规则有新增（升级依赖后）时，先确认基线是否需要更新

## 反模式红线

| 反模式 | 问题 | 修正 |
|-------|------|------|
| 测试失败 `-Dmaven.test.skip` 绕过发布 | 把线上变成测试环境 | 修测试或修代码，别跳过 |
| Suppression 文件无注释 | 3 个月后没人记得为什么豁免 | 每条 suppress 写 `reason + owner + expires` |
| 覆盖率大幅下降无人拦 | 指标悄悄退化 | 在 JaCoCo `check` 里配增量门禁 |
| 秘密扫描仅跑 HEAD | 历史泄漏继续暴露 | 上 `git secrets` 预提交 + 定期 `gitleaks --log-opts="--all"` |
| 静态分析零告警策略不维护基线 | 升级后瞬间数千告警 | 固化基线，只禁新增 |
| spotless 与 IDE 格式不一致 | PR 刷屏 diff | 团队统一 IDE import `spotless.xml` |

## 自检清单

- [ ] 构建通过，无 `WARNING` 关于未关闭资源 / 循环依赖
- [ ] 静态分析 0 新增告警（相对基线）
- [ ] 测试 100% 通过，JaCoCo 达标
- [ ] `dependency-check` 无 High/Critical CVE 或都有可追溯的 suppression
- [ ] 秘密扫描 0 命中
- [ ] `spotless` clean
- [ ] diff 经人工过读，无调试残留
- [ ] 所有命令输出贴进 PR 或 change 记录

## 关联

- 测试实现规范：`skills/testing/springboot-tdd/`
- 安全编码细则：`skills/security/springboot-security/`
- 多语言命令矩阵：`skills/workflow-steps/language-adapters/`
- GitHub PR 流：`skills/workflow-steps/github-ops/`（若存在）
