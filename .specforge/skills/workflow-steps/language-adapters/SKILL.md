---
name: language-adapters
type: workflow-step
description: >-
  SpecForge 方法论的语言适配层——将"运行测试 / Lint / 构建 / 同步版本号 / .gitignore"等抽象动作映射到 Node、Python、Java(Spring Boot)、Go、Rust、.NET 的具体命令与文件。
  当命令或技能正文出现"参见 language-adapters"、"运行项目测试命令"、"同步版本号"、"统一 ignore 模式"等措辞时自动触发。
  触发词：language-adapter、multi-language、spring、springboot、python、maven、gradle、pytest、cargo、go test、dotnet、技术栈适配。
version: "1.0.0"
author: "wta"
---

# 语言适配层（Language Adapters）

> SpecForge 是**方法论框架**，命令与技能正文不绑定具体技术栈。本技能维护一份"抽象动作 → 具体命令"的权威映射表，是所有命令模板内"参见 language-adapters"软引用的事实来源。

## Iron Law

> **禁止在命令/技能正文里硬编码单一语言的命令。**
> 一切"测试命令"、"Lint 命令"、"版本号同步"、".gitignore 模式"必须以语言无关方式描述，并在需要具体命令时引用本技能。
> 当本技能未覆盖某语言时，先扩展本技能，再回到主流程。

## 何时使用

- 命令/技能正文需要给出"具体命令"示例时
- 项目初始化阶段识别技术栈并决定后续行为时
- `validate-project-setup.sh` 等脚本判断技术栈分支时
- 发布阶段同步版本号、CHANGELOG 时

## 1. 通用动作 → 具体命令映射

| 动作 | Node (pnpm) | Python (poetry/pip) | Java / Spring Boot (Maven) | Java / Spring Boot (Gradle) | Go | Rust | .NET |
|------|-------------|---------------------|----------------------------|-----------------------------|----|----|------|
| 安装依赖 | `pnpm install` | `poetry install` / `pip install -r requirements.txt` | `mvn dependency:resolve` | `gradle dependencies` | `go mod download` | `cargo fetch` | `dotnet restore` |
| 添加依赖 | `pnpm add <pkg>` | `poetry add <pkg>` / `pip install <pkg>` | `mvn -B dependency:get -Dartifact=<g:a:v>` | `gradle dependencies --add` | `go get <pkg>` | `cargo add <pkg>` | `dotnet add package <pkg>` |
| 运行测试 | `pnpm test` | `pytest` | `mvn test` | `gradle test` | `go test ./...` | `cargo test` | `dotnet test` |
| 运行单文件测试 | `pnpm test <file>` | `pytest <file>` | `mvn -Dtest=<Class> test` | `gradle test --tests <Class>` | `go test ./<pkg>/...` | `cargo test <name>` | `dotnet test --filter <Class>` |
| Lint | `pnpm lint` (eslint) | `ruff check .` / `flake8` | `mvn spotless:check` | `gradle spotlessCheck` | `golangci-lint run` | `cargo clippy -- -D warnings` | `dotnet format --verify-no-changes` |
| 格式化 | `pnpm format` (prettier) | `ruff format .` / `black .` | `mvn spotless:apply` | `gradle spotlessApply` | `gofmt -w .` / `goimports -w .` | `cargo fmt` | `dotnet format` |
| 构建 | `pnpm build` (tsc) | `python -m build` | `mvn package -DskipTests` | `gradle build -x test` | `go build ./...` | `cargo build --release` | `dotnet build -c Release` |
| 启动开发服务器 | `pnpm dev` | `python -m <app>` / `uvicorn ...` | `mvn spring-boot:run` | `gradle bootRun` | `go run ./cmd/<name>` | `cargo run` | `dotnet run` |
| 类型检查 | `pnpm tsc --noEmit` | `mypy .` / `pyright` | （javac 编译时） | （javac 编译时） | （go build 自带） | （cargo build 自带） | `dotnet build` |
| 安全审计 | `pnpm audit` | `pip-audit` / `safety check` | `mvn org.owasp:dependency-check-maven:check` | `gradle dependencyCheckAnalyze` | `govulncheck ./...` | `cargo audit` | `dotnet list package --vulnerable` |
| 覆盖率 | `pnpm test --coverage` | `pytest --cov` | `mvn test jacoco:report` | `gradle jacocoTestReport` | `go test -cover ./...` | `cargo tarpaulin` | `dotnet test /p:CollectCoverage=true` |

## 2. 版本号源（release-deploy Step 2 的"同步对象"）

| 语言 | 主版本源 | 同步命令 |
|------|---------|---------|
| Node | `package.json` 的 `version` 字段 | `npm version <new>` 或 `pnpm version <new>` |
| Python | `pyproject.toml` 的 `[project].version` 或 `setup.py` 的 `version=` | `poetry version <new>` |
| Java/Spring (Maven) | `pom.xml` 的 `<version>` | `mvn versions:set -DnewVersion=<new>` |
| Java/Spring (Gradle) | `build.gradle(.kts)` 的 `version =` | 修改文件 + `gradle properties` 验证 |
| Go | `go.mod` 模块版本 + Git tag | `git tag v<new>` |
| Rust | `Cargo.toml` 的 `[package].version` | `cargo set-version <new>`（cargo-edit） |
| .NET | `*.csproj` 的 `<Version>` 或 `Directory.Build.props` | 修改 XML + `dotnet restore` |

`VERSION` 文件作为 SpecForge 项目的语言无关主版本源；具体语言的版本字段由 release 流程同步到对应文件。

## 3. .gitignore 必备模式

| 语言 | 必备模式 |
|------|---------|
| Node | `node_modules/`、`dist/`、`build/`、`*.log`、`.env*`、`.turbo/`、`coverage/` |
| Python | `__pycache__/`、`*.pyc`、`.venv/`、`venv/`、`dist/`、`*.egg-info/`、`.pytest_cache/`、`.mypy_cache/` |
| Java/Spring (Maven) | `target/`、`*.class`、`.idea/`、`*.iml`、`.mvn/wrapper/maven-wrapper.jar`、`logs/` |
| Java/Spring (Gradle) | `build/`、`.gradle/`、`*.class`、`out/`、`gradle-app.setting` |
| Go | `bin/`、`*.test`、`*.out`、`vendor/`（视项目策略）、`coverage.txt` |
| Rust | `target/`、`Cargo.lock`（仅库类项目可忽略）、`*.rs.bk` |
| .NET | `bin/`、`obj/`、`*.user`、`*.suo`、`.vs/`、`TestResults/` |
| 通用 | `.DS_Store`、`Thumbs.db`、`*.tmp`、`.vscode/`、`.idea/`、`.env*` |

## 4. 项目根标识文件（用于自动技术栈识别）

| 语言 | 关键标识文件（任一存在即视为该栈） |
|------|------------------------------------|
| Node | `package.json` |
| Python | `pyproject.toml` / `setup.py` / `requirements.txt` / `Pipfile` |
| Java/Spring (Maven) | `pom.xml` |
| Java/Spring (Gradle) | `build.gradle` / `build.gradle.kts` |
| Go | `go.mod` |
| Rust | `Cargo.toml` |
| .NET | `*.csproj` / `*.sln` / `global.json` |

## 5. 依赖锁文件（CI 缓存键 + reproducibility 关键）

| 语言 | 锁文件 |
|------|-------|
| Node | `pnpm-lock.yaml` / `package-lock.json` / `yarn.lock` |
| Python | `poetry.lock` / `Pipfile.lock` / `requirements.lock` |
| Java/Spring (Maven) | `pom.xml`（无独立锁文件，依赖版本即锁） |
| Java/Spring (Gradle) | `gradle.lockfile`（开启 dependency locking 后） |
| Go | `go.sum` |
| Rust | `Cargo.lock`（应用类必须提交） |
| .NET | `packages.lock.json`（开启 lock mode 后） |

## 6. 部署/打包产物

| 语言 | 主产物 | 推荐部署方式 |
|------|-------|-------------|
| Node | `dist/` 目录 / Docker 镜像 | npm publish / Docker / SaaS（Vercel/Netlify） |
| Python | `dist/*.whl` + `dist/*.tar.gz` / Docker | PyPI / Docker / Lambda |
| Java/Spring (Maven) | `target/*.jar` (fat jar) / `target/*.war` | Docker / `java -jar` / 应用服务器 |
| Java/Spring (Gradle) | `build/libs/*.jar` | 同上 |
| Go | 单一二进制（`bin/<name>`） | Docker / 直接部署（无运行时依赖） |
| Rust | `target/release/<name>` | Docker / 直接部署（无运行时依赖） |
| .NET | `bin/Release/*/publish/` | Docker / IIS / Linux daemon |

## 7. 自检清单（命令模板 / 技能引用本表前）

- [ ] 主流程描述使用动词短语（"运行测试 / Lint / 同步版本"），不写具体命令
- [ ] 需要给出可执行示例时，最少给出 2 种不同语言以体现中立性
- [ ] 引用回本技能时使用相对路径或技能 name，不复制粘贴本表内容
- [ ] 当遇到表格未覆盖的语言/工具，**优先扩展本技能**而非在主流程注入新硬编码

## 8. 反模式

| 反模式 | 说明 | 改进 |
|--------|------|------|
| 主流程出现 `pnpm test` | 假设读者使用 Node | "运行测试命令（参见 language-adapters）" + 可选 4 种示例 |
| 用 `node -e ...` 同步 `package.json` | 仅 Node 适用 | 用动词描述："读取并更新本语言生态的版本源（参见 language-adapters 第 2 节）" |
| `.gitignore` 只列 `node_modules/` | 多技术栈混合项目会漏 | 引用第 3 节，按检测到的技术栈追加 |
| 在每个命令里复制粘贴语言对照表 | 维护成本高，易漂移 | 命令仅写"参见 language-adapters"，本技能为唯一权威源 |

## References 导航

- `references/spring-boot-conventions.md` — Spring Boot 多模块、application.yml profile、Actuator 端点等约定
- `references/node.md` — Node.js 包管理、ESM/CJS、TypeScript、Vitest、CLI 发布等约定
- `references/python.md` — venv/poetry/pyproject、pytest fixture/conftest 约定、async 注意点
- `references/go.md` — Go Modules、项目结构、错误处理、context、pytest 表驱动、golangci-lint 等约定
