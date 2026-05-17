# Go 项目约定（Go Conventions）

> 本文件作为 `language-adapters` SKILL 的 Go 适配补充。仅在主流程引用 language-adapters 并需要 Go 细节时按需阅读。

## 1. 模块与版本管理

- 使用 **Go Modules**（`go.mod` + `go.sum`）。禁用 `GOPATH` 模式。
- 模块路径与仓库一致：`github.com/<org>/<repo>`。
- `go.mod` 顶部 `go 1.22+` 固定最低 Go 版本；CI 中校验。
- **禁止**提交 `vendor/` 目录（除非项目明确依赖 vendor 策略）。

## 2. go.mod 推荐结构

```go
module github.com/acme/my-app

go 1.22

require (
    github.com/go-chi/chi/v5 v5.1.0
    github.com/jackc/pgx/v5 v5.7.1
    go.uber.org/zap v1.27.0
)

require (
    // indirect dependencies...
)
```

**约定：**

- 定期运行 `go mod tidy` 清理未使用依赖。
- 升级依赖使用 `go get -u ./...`，在独立 PR 提交。
- 依赖漏洞扫描：`govulncheck ./...`（CI 强制）。

## 3. 项目结构约定

Go 社区存在两种常见约定，**不要同时使用两种**。

### 3.1 简洁型（推荐小型项目 / CLI）

```
my-app/
├── go.mod
├── go.sum
├── main.go                   # 入口
├── cmd/                      # 多个二进制入口时使用
│   └── server/main.go
├── internal/                 # 项目私有代码（外部不可 import）
│   ├── api/                  # HTTP handler
│   ├── service/              # 业务编排
│   ├── domain/               # 纯领域
│   ├── repository/           # 数据访问
│   └── config/
├── pkg/                      # 对外可复用的公共包（谨慎使用）
└── Makefile
```

### 3.2 标准型（中大型项目）

额外引入 `api/`（protobuf / OpenAPI）、`migrations/`、`deploy/`、`scripts/` 等目录。

**约定：**

- `internal/` 优先使用，确保包只在本模块内可见。
- `pkg/` 仅放对外稳定的公共库；不要把项目代码塞进去。
- 避免过早引入 `cmd/<name>/` 多入口结构。

## 4. 包与命名约定

- 包名小写、单数、不含下划线（`user` 而非 `users` / `user_service`）。
- 文件名小写 + 下划线分隔（`user_service.go`）。
- 导出符号首字母大写；包文档写在 `doc.go` 或文件顶部 `// Package user ...`。
- 避免「util」「common」「helper」等万能包名——按领域拆分。

## 5. 错误处理

### 规则

- 显式返回 `error`，不用 panic 替代错误。
- 错误信息**小写开头，不加句号**：`errors.New("user not found")`。
- 使用 `errors.Is` / `errors.As` 做类型判断，不用字符串匹配。
- 错误包装：`fmt.Errorf("load config: %w", err)`（`%w` 保留原因）。
- Go 1.20+ 可返回 `errors.Join(err1, err2)` 组合多个错误。

### 自定义错误类型

```go
type ValidationError struct {
    Field string
    Msg   string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Msg)
}

var ErrNotFound = errors.New("not found")
```

## 6. 上下文与取消

- 任何可能阻塞的函数第一个参数必须是 `ctx context.Context`。
- 禁止 `context.Background()` 贯穿到业务层；从入口（HTTP handler / main）传递。
- 使用 `context.WithTimeout` / `WithCancel` 控制生命周期。
- 测试用 `t.Context()`（Go 1.24+）或 `context.WithTimeout`。

## 7. 测试约定

### 标准库测试

```go
// internal/service/user_test.go
package service

import (
    "testing"

    "github.com/stretchr/testify/assert"
)

func TestCreateUser(t *testing.T) {
    t.Parallel()

    tests := []struct {
        name    string
        input   string
        wantErr bool
    }{
        {"valid", "alice", false},
        {"empty", "", true},
    }

    for _, tt := range tests {
        tt := tt
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            err := CreateUser(tt.input)
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

**约定：**

- 测试文件与源码**同目录**，命名 `*_test.go`。
- 表驱动测试（Table-Driven）是 Go 标准范式。
- 可并行的测试调用 `t.Parallel()`；注意闭包中循环变量陷阱（Go 1.22 已修复但显式拷贝更安全）。
- 覆盖率：`go test -cover ./...`；CI 输出：`go test -coverprofile=coverage.out ./...`。
- 集成测试用 build tag 隔离：`//go:build integration`，运行 `go test -tags=integration ./...`。

### 常用工具

| 工具                    | 职责                                |
| ----------------------- | ----------------------------------- |
| 内置 `testing`          | 单元测试、基准、示例                |
| `stretchr/testify`      | 断言 + mock（可选，保持依赖少）     |
| `testcontainers-go`     | 真实依赖的集成测试                  |
| `gomock` / `mockery`    | Mock 生成                           |
| `gofakeit`              | 随机测试数据                        |
| `golang.org/x/exp/rapid` | 属性测试（PBT）                    |

## 8. 质量工具链

| 工具                    | 职责                                         |
| ----------------------- | -------------------------------------------- |
| **gofmt** / **gofumpt** | 格式化（强制统一）                           |
| **goimports**           | 自动整理 import                              |
| **golangci-lint**       | 集大成的 lint（集成 govet、staticcheck 等） |
| **govulncheck**         | 官方漏洞扫描                                 |
| **errcheck** / **revive** | 通过 golangci-lint 启用                    |

**约定：**

- CI 必跑：`gofmt -l`、`golangci-lint run`、`go test ./...`、`govulncheck ./...`、`go build ./...`。
- `.golangci.yml` 至少启用：`govet`、`staticcheck`、`errcheck`、`ineffassign`、`unused`、`gosimple`。
- 禁用 `gofmt` 差异；PR 中禁止格式化相关 diff。

## 9. 并发与 goroutine

- **不要启动无主的 goroutine**：每个 goroutine 必须有明确的生命周期所有者。
- 使用 `errgroup.Group` 协调并发 + 错误收集：

  ```go
  g, ctx := errgroup.WithContext(ctx)
  for _, task := range tasks {
      task := task
      g.Go(func() error { return task.Run(ctx) })
  }
  if err := g.Wait(); err != nil { return err }
  ```

- 共享状态优先使用 channel；必须共享内存时用 `sync.Mutex`。
- `go vet -race ./...` / `go test -race`：竞态检查作为 CI 必跑。
- 禁止 `time.Sleep` 做同步；用 channel / `sync.WaitGroup` / `context`。

## 10. 部署与构建

```bash
# 静态编译（Linux 容器常用）
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
  go build -trimpath -ldflags="-s -w -X main.version=$(git describe --tags)" \
  -o dist/app ./cmd/server
```

**约定：**

- `-trimpath` 去除本地路径信息；`-ldflags "-s -w"` 减小二进制体积。
- 版本号通过 `-X main.version=...` 注入，避免硬编码。
- 多阶段 Docker：构建阶段用 `golang:1.22`，运行阶段 `gcr.io/distroless/static` 或 `scratch`。

| 场景        | 常用框架 / 方案                   |
| ----------- | --------------------------------- |
| HTTP API    | `net/http` + `chi` / `gin` / `echo` |
| gRPC        | `google.golang.org/grpc`          |
| CLI         | `cobra` / `urfave/cli`            |
| Worker      | `asynq` / `temporal`              |
| 配置        | `viper` / `env` / `koanf`         |
| 结构化日志  | `log/slog`（标准库）/ `zap`       |

## 11. 常见反模式

| 反模式                           | 改进                                                   |
| -------------------------------- | ------------------------------------------------------ |
| `panic` 当错误处理               | 返回 error；仅不可恢复场景使用 panic                   |
| 忽略 error（`_ = doSomething()`） | 显式处理或用 `//nolint:errcheck` 附说明                 |
| 全局变量存储可变状态             | 通过结构体字段或依赖注入                               |
| `context.Background()` 传入业务   | 从入口传递真实 ctx；测试中用 `t.Context()`              |
| 海量 `interface{}` / `any`       | 用具体类型或泛型（Go 1.18+）                            |
| 包循环依赖                       | 重构依赖方向；常见手段是引入接口在高层                 |
| 手写 mock                        | 用 `mockery` 从 interface 生成                          |
| 把 `pkg/` 当垃圾桶               | `internal/` 优先；`pkg/` 只放真正对外复用的代码         |
| goroutine 泄漏                   | 用 ctx 控制退出；测试用 `uber-go/goleak` 检测           |
| 日志字符串拼接                   | 使用结构化日志（`slog.Info("login", "user", u)`）      |
