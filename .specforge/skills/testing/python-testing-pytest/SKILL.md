---
name: python-testing-pytest
type: testing-rule
description: >-
  Python 测试实战——pytest 断言、fixture、parametrize、mock、async 测试、tmp_path、覆盖率门禁与配置。为 Python 项目写/审查测试时触发。
  触发词：pytest、Python 测试、fixture、parametrize、mock、pytest-asyncio、coverage、tmp_path。
version: "1.0.0"
author: "wta"
---

# Python 测试规范（pytest）

> 本技能聚焦 Python 的**测试实现**层；TDD 节奏与粒度约定见 `skills/testing/tdd-workflow/`；语言命令矩阵见 `skills/workflow-steps/language-adapters/`。

## Iron Law

> **测试独立、可重复、可解释。** 任意顺序运行、任意子集运行、任意环境运行，结果都必须一致；失败信息要能告诉你"什么行为坏了"，而不是"哪一行炸了"。

## 1. 断言风格

直接用内置 `assert`——pytest 会重写表达式，失败信息自动展开。

```python
assert result == expected
assert item in collection
assert isinstance(result, str)
assert 0 <= score <= 100
```

**异常断言**：

```python
with pytest.raises(ValueError, match=r"invalid input"):
    validate("bad")

with pytest.raises(CustomError) as exc:
    do_it()
assert exc.value.code == 400
```

## 2. Fixture 分层

### 2.1 Scope 选型

| scope | 生命周期 | 典型用途 |
|-------|---------|---------|
| `function`（默认） | 每个测试 | 临时目录、mock、纯数据 |
| `class` | 每个测试类 | 共享构造成本低的上下文 |
| `module` | 每个文件 | 只读资源、预编译正则 |
| `session` | 一次测试会话 | Testcontainers、真实 DB schema、TLS 证书 |

### 2.2 setup/teardown 必用 `yield`

```python
@pytest.fixture
def db():
    conn = Database(":memory:")
    conn.create_tables()
    try:
        yield conn
    finally:
        conn.close()
```

### 2.3 `conftest.py` 的层级

- **根 `conftest.py`**：全项目共享（客户端、假数据工厂、autouse 重置）。
- **子目录 `conftest.py`**：仅该目录可见，避免污染无关测试。
- **不要**在测试模块里写 `from ..conftest import ...` —— pytest 自动发现，手动导入会破坏机制。

### 2.4 `autouse` 要克制

自动生效的 fixture 对所有测试都有副作用。仅限**全局状态重置**（日志配置、单例、随机种子）。

```python
@pytest.fixture(autouse=True)
def reset_singletons():
    Config.reset()
    yield
```

## 3. 参数化（parametrize）

```python
@pytest.mark.parametrize(
    "email,valid",
    [
        ("a@b.com", True),
        ("no-at", False),
        ("@no-local.com", False),
    ],
    ids=["valid", "missing-at", "missing-local"],
)
def test_validate_email(email, valid):
    assert is_valid_email(email) is valid
```

**指南**：

- 每个参数行代表**一类**行为，不是数据枚举。
- 用 `ids` 让 CI 报告一眼就能识别失败用例。
- 多维组合可叠加多个 `@pytest.mark.parametrize`（笛卡尔积），但总数 ≤ 20，否则拆成独立测试。

### 参数化 fixture：跨数据库/后端回归

```python
@pytest.fixture(params=["sqlite", "postgres"])
def db(request):
    return make_db(request.param)
```

同一套测试在多个后端下跑一遍，最少的代码换来最大的覆盖。

## 4. Mock 与 Patch

### 4.1 patch 位置口诀

**"patch where it's used, not where it's defined."** 目标路径是**被调用方的导入路径**。

```python
# mypkg/service.py
from mypkg.client import api_call

def do():
    return api_call()

# tests/test_service.py
from unittest.mock import patch

@patch("mypkg.service.api_call")   # ✅ 在 service 模块里 patch
def test_do(mock_api):
    mock_api.return_value = {"ok": True}
    assert do()["ok"] is True
```

### 4.2 `autospec=True` 优先

```python
@patch("mypkg.service.DBClient", autospec=True)
def test_query(mock_cls):
    inst = mock_cls.return_value
    inst.query("SELECT 1")
    # 调用签名与真实类对齐，写错参数立刻红
```

没有 `autospec` 时，mock 会接受任意方法/任意签名，重构时发现不了被孤立的测试。

### 4.3 常用副作用

```python
mock_api.return_value = {"ok": True}
mock_api.side_effect = ConnectionError("network")
mock_api.side_effect = [v1, v2, v3]   # 依次返回
mock_api.assert_called_once_with(...)  # 断言调用
```

## 5. 异步测试（pytest-asyncio）

```python
import pytest

@pytest.mark.asyncio
async def test_fetch(async_client):
    r = await async_client.get("/api/users")
    assert r.status_code == 200

@pytest.mark.asyncio
@patch("mypkg.service.async_call")
async def test_async_mock(mock_call):
    mock_call.return_value = {"ok": True}
    assert (await do_async())["ok"] is True
    mock_call.assert_awaited_once()
```

**配置**（`pyproject.toml`）：

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"     # 自动把 async def test_* 当协程
```

## 6. 文件/目录临时资源

优先使用 pytest 内置：`tmp_path`（`pathlib.Path`）、`tmp_path_factory`（session 级）。

```python
def test_write_and_read(tmp_path):
    f = tmp_path / "hello.txt"
    f.write_text("hi")
    assert f.read_text() == "hi"
```

`tmp_path` 自动清理；不再需要 `tempfile.NamedTemporaryFile` + 手写 `os.unlink`。

## 7. Marker 与用例筛选

```python
@pytest.mark.slow
@pytest.mark.integration
def test_expensive_pipeline(): ...
```

```toml
# pyproject.toml
[tool.pytest.ini_options]
markers = [
  "slow: 耗时 > 1s 的测试",
  "integration: 依赖真实外部资源",
  "unit: 纯内存单元测试",
]
```

**CI 策略**：

```bash
pytest -m "not slow"                 # 本地快反馈
pytest -m "integration"              # 夜间/集成管线
pytest -m "unit and not slow"        # PR 入口门禁
```

**`--strict-markers`** 必开：拼错 marker 立刻失败，防止静默失效。

## 8. 目录组织

```
tests/
├── conftest.py                 # 全局 fixture
├── unit/                       # 纯函数、单模块；毫秒级
├── integration/                # 跨模块、含 I/O；秒级
└── e2e/                        # 通过对外入口；数十秒
```

测试文件命名与生产模块对齐：`src/mypkg/users.py` → `tests/unit/test_users.py`。类测试用 `TestX` 类名聚合。

## 9. 覆盖率门禁

```bash
pytest --cov=mypkg --cov-report=term-missing --cov-report=html --cov-fail-under=80
```

- **项目级门禁**：≥ 80%
- **核心路径**（鉴权、计费、数据一致性）：100%
- **关注分支覆盖**：`--cov-branch`
- **排除**：`__init__.py`、纯 DTO、自动生成代码在 `.coveragerc` 或 `tool.coverage.run.omit` 中声明

## 10. 运行速查

```bash
pytest                           # 全量
pytest tests/unit/               # 目录
pytest tests/unit/test_x.py::test_case
pytest -k "user and not slow"    # 名称匹配
pytest -x                        # 首个失败即停
pytest --lf                      # 只跑上次失败
pytest --ff                      # 失败优先
pytest -v --tb=short             # 精简 traceback
pytest --pdb                     # 失败进 pdb
pytest -p no:cacheprovider       # 禁缓存，CI 纯净运行
```

## 11. 常见陷阱

| 陷阱 | 后果 | 修正 |
|-----|------|------|
| 在 `pytest.raises` 外断言异常类型 | 测试通过但漏抓真实异常 | 全部断言放在 `with` 块内 |
| mock patch 打在"定义处" | 测试绿但生产仍走真实调用 | patch 被调用方的导入路径 |
| 测试间共享可变全局 | 顺序相关、难调试 | 改用 fixture + `autouse` 重置 |
| fixture scope=session 写入数据库没回滚 | 污染后续测试 | `yield` 后显式清理 / 事务回滚 |
| 用 `print` 调试 | CI 日志噪音、依赖 `-s` | 失败断言或 `caplog` |
| 混用 `unittest.TestCase` 与 pytest fixture | fixture 不注入到 `self` 方法 | 保持纯函数式测试，或用 `pytest-style` |
| 忽略 `DeprecationWarning` | 依赖升级静默爆炸 | `filterwarnings = error::DeprecationWarning` |
| 覆盖率排除太激进 | 指标虚高 | 只排除无法测的生成代码 |

## 12. 自检清单

- [ ] 测试名形如 `test_<行为>_<条件>_<期望>`
- [ ] 每个测试只断言一个行为
- [ ] 所有 I/O 通过 fixture 管理，失败也能清理
- [ ] 使用 `parametrize` 替代循环 `assert`
- [ ] 对外依赖用 `patch + autospec` 或真正的 fake，而非 `MagicMock()` 裸奔
- [ ] 异步测试使用 `pytest-asyncio`，断言 `assert_awaited_once`
- [ ] `pytest -m "not slow"` 能在秒级内完成 PR 门禁
- [ ] 覆盖率 ≥ 80%，核心路径 100%
- [ ] `--strict-markers` + `filterwarnings = error` 已开
- [ ] 测试目录与源码目录一一映射

## 13. 关联

- TDD 节奏：`skills/testing/tdd-workflow/`
- 集成测试取舍：`skills/testing/integration-test-strategy/`
- Python 代码风格：`skills/code-styles/python-patterns/`
- 运行命令/CI 适配：`skills/workflow-steps/language-adapters/`
