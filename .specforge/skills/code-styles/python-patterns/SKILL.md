---
name: python-patterns
type: code-style
description: >-
  Python 惯用法与代码风格规范——PEP 8、类型注解、EAFP、数据类、生成器、上下文管理器、装饰器、并发模式、pyproject.toml 组织。
  当编写、审查或重构 Python 代码时自动触发。
  触发词：Python、PEP 8、类型注解、type hints、dataclass、asyncio、pyproject、ruff、mypy、pythonic。
version: "1.0.0"
author: "wta"
---

# Python 惯用法与代码风格

> 内化自社区工程实践，适配 SpecForge 的"显式优先、可读至上"原则。

## Iron Law

> **可读性优先于炫技。** 每一行代码都要让下一个读者（包括未来的你）在 5 秒内理解。能用标准库就不造轮子；能用类型注解就不写猜谜。

## 1. 三条核心原则

### 1.1 Readability Counts

```python
# ✅ 清晰
def get_active_users(users: list[User]) -> list[User]:
    return [u for u in users if u.is_active]

# ❌ 炫技
def gau(u): return [x for x in u if x.a]
```

### 1.2 Explicit is Better Than Implicit

不要依赖"模块导入时的副作用"。配置、初始化、日志格式都要显式声明。

### 1.3 EAFP：先试再说

```python
# ✅ EAFP
try:
    return d[key]
except KeyError:
    return default

# ⚠️ LBYL（可接受，但在并发场景有 TOCTOU 风险）
if key in d:
    return d[key]
```

并发/跨进程访问字典、文件、数据库时优先 EAFP，避免 check-then-act 竞态。

## 2. 类型注解

**准则**：所有对外函数签名必须有类型注解；内部辅助函数按需。

### 2.1 基础注解（Python 3.9+ 使用内置泛型）

```python
# ✅ Python 3.9+
def stats(items: list[str]) -> dict[str, int]:
    return {x: len(x) for x in items}

# ⚠️ 仅在需要兼容 3.8 时使用 typing
from typing import List, Dict
def stats(items: List[str]) -> Dict[str, int]: ...
```

### 2.2 可选值与联合类型（3.10+ 用 `X | None`）

```python
def first(items: list[T]) -> T | None:
    return items[0] if items else None
```

### 2.3 Protocol 做结构化子类型

```python
from typing import Protocol

class Renderable(Protocol):
    def render(self) -> str: ...

def render_all(items: list[Renderable]) -> str:
    return "\n".join(i.render() for i in items)
```

**Protocol 适用场景**：测试替身、鸭子类型接口、跨模块弱耦合。

## 3. 错误处理

| 规则 | 理由 |
|------|------|
| 捕获**具体**异常，禁用裸 `except:` | 裸捕获会吞掉 `KeyboardInterrupt` 与 `SystemExit` |
| 抛出时用 `raise NewError(...) from e` | 保留原始 traceback，便于排障 |
| 自定义异常继承统一根类（`AppError`） | 调用方可一次性拦截领域异常 |
| 不在库代码里 `print` / 直接退出 | 让调用方决定如何响应 |

```python
class AppError(Exception): ...
class ValidationError(AppError): ...
class NotFoundError(AppError): ...

def load_config(path: str) -> Config:
    try:
        with open(path) as f:
            return Config.from_json(f.read())
    except FileNotFoundError as e:
        raise ValidationError(f"配置文件不存在: {path}") from e
    except json.JSONDecodeError as e:
        raise ValidationError(f"配置 JSON 格式错误: {path}") from e
```

## 4. 上下文管理器

任何"获取/释放"语义的资源都用 `with`：文件、锁、数据库事务、临时目录。

### 4.1 函数式：`@contextmanager`

```python
from contextlib import contextmanager
import time

@contextmanager
def timer(name: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        print(f"{name}: {time.perf_counter() - start:.4f}s")
```

### 4.2 类式：`__enter__` / `__exit__`

用于事务/状态机类场景，异常时 `__exit__` 返回 `False` 保证异常继续向上抛。

## 5. 数据容器选型

| 场景 | 选用 | 理由 |
|------|------|------|
| 可变、行为丰富 | `@dataclass` | 自动 `__init__/__repr__/__eq__`，支持 `__post_init__` 校验 |
| 不可变、纯数据 | `frozen=True` 的 dataclass 或 `NamedTuple` | 可哈希、可作字典键 |
| 需严格校验与序列化 | `pydantic.BaseModel` | 自带校验、JSON 支持、FastAPI 友好 |
| 性能敏感、大量实例 | 加 `__slots__ = True` | 减 40%+ 内存，禁止动态属性 |

```python
from dataclasses import dataclass, field
from datetime import datetime

@dataclass(slots=True)
class User:
    id: str
    name: str
    email: str
    created_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True

    def __post_init__(self) -> None:
        if "@" not in self.email:
            raise ValueError(f"无效邮箱: {self.email}")
```

## 6. 推导式与生成器

| 选择 | 判据 |
|------|------|
| 列表推导 | 结果需反复遍历或随机访问 |
| 生成器表达式 / `yield` | 一次性消费、数据量大、流式处理 |
| 显式 `for` 循环 | 条件分支多、单行读不懂 |

**红线**：推导式超过两层嵌套 / 两个 `if` → 拆成函数。

```python
# ✅ 大数据流式
def read_lines(path: str) -> Iterator[str]:
    with open(path) as f:
        for line in f:
            yield line.rstrip()

# ❌ 反模式：拼字符串
result = ""
for x in items:   # O(n²)
    result += str(x)

# ✅ join
result = "".join(str(x) for x in items)
```

## 7. 装饰器

```python
import functools

def timer(func):
    @functools.wraps(func)            # 保留原函数元信息
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            print(f"{func.__name__}: {time.perf_counter()-start:.4f}s")
    return wrapper
```

**参数化装饰器**模板：外层收参数 → 中层收函数 → 内层收调用参数。

**别忘记** `functools.wraps`，否则 `help()`、`__name__`、`__doc__` 都会丢。

## 8. 并发模式选型

| 场景 | 选用 | 注意事项 |
|------|------|----------|
| I/O 密集、少量任务 | `ThreadPoolExecutor` | GIL 下仍对 I/O 有效；线程数 ≈ I/O 并发度 |
| I/O 密集、高并发 | `asyncio` + `aiohttp/httpx` | 全链路异步，禁止在事件循环里 `time.sleep` |
| CPU 密集 | `ProcessPoolExecutor` | 进程有启动成本；数据要可 pickle |
| 混合 | 事件循环 + `loop.run_in_executor` | CPU 任务丢到线程/进程池 |

```python
import asyncio, aiohttp

async def fetch(url: str) -> str:
    async with aiohttp.ClientSession() as s:
        async with s.get(url) as r:
            return await r.text()

async def fetch_all(urls: list[str]) -> list[str]:
    return await asyncio.gather(*(fetch(u) for u in urls), return_exceptions=True)
```

## 9. 包与工程组织

推荐 src-layout：

```
myproject/
├── src/mypackage/
│   ├── __init__.py
│   ├── main.py
│   └── ...
├── tests/
├── pyproject.toml
└── README.md
```

**导入顺序**（交给 `ruff` / `isort` 自动整理）：标准库 → 第三方 → 本地；每组空一行。

**禁止** `from module import *`（IDE/类型检查器无法识别符号）。

**`__init__.py`** 只做对外 API 再导出，不放业务逻辑；用 `__all__` 显式声明公开符号。

## 10. 工具链（pyproject.toml 标配）

```toml
[project]
name = "mypackage"
requires-python = ">=3.10"

[tool.ruff]
line-length = 100
select = ["E", "F", "I", "N", "W", "UP", "B", "SIM"]

[tool.mypy]
python_version = "3.10"
disallow_untyped_defs = true
warn_return_any = true
warn_unused_configs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "--strict-markers --cov=mypackage --cov-report=term-missing"
```

日常命令：

```bash
ruff check . && ruff format .
mypy src/
pytest
pip-audit           # 依赖 CVE 扫描
```

## 11. 反模式红线

| 反模式 | 问题 | 修正 |
|-------|------|------|
| `def f(items=[])` | 可变默认参数跨调用共享 | `items: list \| None = None` + 函数内初始化 |
| `type(x) == list` | 忽略子类 | `isinstance(x, list)` |
| `x == None` | 绕开 `__eq__` 语义 | `x is None` |
| `from mod import *` | 污染命名空间 | 显式列出符号 |
| 裸 `except:` | 吞异常 | 捕获具体异常类型 |
| 循环里拼字符串 | O(n²) | `"".join(...)` / `StringIO` |
| `open(...)` 不配 `with` | 资源泄漏 | 强制 `with` |
| 大列表全量加载 | 内存爆 | 生成器/迭代器 |
| 业务逻辑写进 `__init__.py` | 测试/复用困难 | 下沉到子模块，`__init__` 只做再导出 |

## 12. 自检清单

- [ ] 所有对外函数签名都有类型注解
- [ ] 没有裸 `except:` 与可变默认参数
- [ ] 资源操作使用 `with` / `@contextmanager`
- [ ] 抛出异常时用 `raise ... from e` 保留链路
- [ ] 推导式嵌套 ≤ 1 层、条件 ≤ 1 个
- [ ] 大数据处理走生成器或流式读写
- [ ] 第三方依赖在 `pyproject.toml` 显式声明版本
- [ ] `ruff` / `mypy` / `pytest` 全绿
- [ ] 字符串格式化优先 f-string（3.6+）
- [ ] 路径操作使用 `pathlib.Path` 而非 `os.path` 字符串拼接

## 13. 与其他 SpecForge 技能的关联

- 测试策略与 pytest 细节：`skills/testing/python-testing-pytest/`
- 深度学习/张量代码规范：`skills/code-styles/pytorch-patterns/`
- 提交规范：`skills/code-styles/chinese-commit-conventions/`
- 语言适配命令矩阵：`skills/workflow-steps/language-adapters/`
