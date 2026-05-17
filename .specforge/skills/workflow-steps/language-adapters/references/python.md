# Python 项目约定（Python Conventions）

> 本文件作为 `language-adapters` SKILL 的 Python 适配补充。仅在主流程引用 language-adapters 第 1 节并需要 Python 细节时按需阅读。

## 1. 包管理与虚拟环境

| 工具 | 适用场景 | 关键文件 |
|------|---------|---------|
| **poetry**（推荐） | 应用 + 库，需要锁文件 | `pyproject.toml` + `poetry.lock` |
| **pip + venv** | 简单脚本/教学项目 | `requirements.txt` + `requirements-dev.txt` |
| **pdm** | 现代标准（PEP 582/621） | `pyproject.toml` + `pdm.lock` |
| **uv** | 高性能新兴方案 | `pyproject.toml` + `uv.lock` |

**约定：**
- 应用类项目优先 poetry/pdm/uv（三者均符合 PEP 621）
- 库项目使用 poetry 或 pdm（生成 `pyproject.toml` 标准元数据）
- **禁止**直接使用全局 `pip install`，必须在 venv/虚拟环境内
- venv 目录约定：`.venv/`（在 `.gitignore` 中）

## 2. pyproject.toml 推荐结构

```toml
[project]
name = "my-app"
version = "0.1.0"
description = "..."
authors = [{name = "...", email = "..."}]
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115",
    "pydantic>=2.9",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-cov>=5.0",
    "ruff>=0.7",
    "mypy>=1.13",
]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --strict-markers"

[tool.mypy]
strict = true
```

## 3. 项目结构约定（src layout）

```
my-app/
├── pyproject.toml
├── README.md
├── src/
│   └── my_app/                # 源码包（与项目名匹配，下划线）
│       ├── __init__.py
│       ├── api/               # FastAPI 路由
│       ├── core/              # 领域逻辑
│       ├── repository/        # 数据访问
│       └── service/           # 应用服务
├── tests/
│   ├── conftest.py            # 共享 fixture
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── .gitignore
```

**为什么 src layout？** 强制以"已安装包"方式导入测试目标，避免 `import my_app` 误用相对路径。

## 4. 测试约定（pytest）

### conftest.py 与 fixture 作用域

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient
from my_app.main import app

@pytest.fixture(scope="session")
def event_loop():
    """整个测试会话共享一个事件循环。"""
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
async def client():
    """每个测试函数独立的 HTTP 客户端。"""
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c
```

**约定：**
- `conftest.py` 放在每个测试目录，fixture 自动被该目录及子目录发现
- fixture 作用域选择：`function`（默认，最严格）→ `class` → `module` → `session`（最宽松）
- 共享数据库 fixture 用 `session` + 事务回滚（每个测试结束 rollback）
- 测试命名：文件 `test_*.py`，函数 `test_*`，类 `Test*`

### async 测试

```python
import pytest

@pytest.mark.asyncio
async def test_create_user(client):
    resp = await client.post("/users", json={"name": "alice"})
    assert resp.status_code == 201
```

需要 `pytest-asyncio` 依赖；或在 `pyproject.toml` 设置 `asyncio_mode = "auto"`。

## 5. 类型与质量工具链推荐

| 工具 | 职责 | 替代品 |
|------|------|-------|
| **ruff** | Lint + 格式化（一体化） | flake8 + black + isort |
| **mypy** | 静态类型检查 | pyright |
| **pytest** | 测试运行 | unittest（标准库） |
| **coverage / pytest-cov** | 覆盖率 | — |
| **pip-audit** | 依赖漏洞 | safety |

**约定：**
- CI 必须包含：`ruff check`、`ruff format --check`、`mypy`、`pytest --cov`
- `mypy.strict = true`：拒绝隐式 Any 与隐式 Optional
- 覆盖率阈值由 DESIGN.md 定义（建议核心模块 ≥ 80%）

## 6. async 注意事项

| 陷阱 | 说明 | 改进 |
|------|------|------|
| 同步阻塞调用未 `await` | `time.sleep` / `requests.get` 阻塞事件循环 | 用 `asyncio.sleep` / `httpx.AsyncClient` |
| `asyncio.run()` 嵌套 | 已在事件循环内再次 `run` 抛错 | 在主入口才 `asyncio.run`，内部用 `await` |
| ThreadPool 默认 max_workers | 用 `loop.run_in_executor` 时默认池太小 | 显式 `concurrent.futures.ThreadPoolExecutor(max_workers=...)` |
| 未关闭资源 | AsyncClient/DB 连接未 `aclose` | 用 `async with` 上下文管理 |

## 7. 部署常见形态

| 场景 | 方式 |
|------|------|
| Web API | uvicorn/gunicorn + FastAPI/Starlette，Docker 部署 |
| CLI 工具 | `pyproject.toml` 中 `[project.scripts]` 定义入口 + `pip install` |
| Serverless | AWS Lambda（mangum 包装 ASGI）/ Cloud Functions |
| Worker | Celery + Redis/RabbitMQ；或 dramatiq/RQ |

## 8. 常见反模式

| 反模式 | 改进 |
|--------|------|
| 全局 `import *` | 显式导入 + `__all__` 控制公开 API |
| 业务异常用 `Exception` 直接抛 | 自定义业务异常类，继承明确语义父类 |
| 配置散落在多个文件 | 用 pydantic-settings 集中管理（环境变量 + .env） |
| 把 `__init__.py` 当模块写代码 | 仅做包标记，业务代码放具名模块 |
| 测试用 `print` 调试 | 用 `pytest -s` + `caplog` fixture 捕获日志 |
| 同步 ORM 在 async 视图里调用 | 用 SQLAlchemy 2.0 async 或 Tortoise ORM |
