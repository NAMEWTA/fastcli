#!/usr/bin/env python3
"""
Quick validation for SpecForge command templates.

用法：
  quick_validate_command.py <path/to/command-directory>

校验点：
  1. 目录结构：<cmd>/<cmd>.md 必须存在
  2. Frontmatter：
     - 必须是 YAML 字典
     - 必含 name / type / description / version / author
     - name 与目录名一致，且为 kebab-case
     - type ∈ {workflow-command, tool-command}
     - description 非空，≤ 200 字符（Level 1 契约），不含 < 和 >
  3. 结构块（Level 2）：
     - # 标题
     - ## Iron Law
     - 至少一个 ## Step 开头的步骤
     - ## 产物清单
     - ## 完成衔接（handoff）或 ## Handoff
     - ## 常见阻断与纠偏 或 errors 引用块
  4. 渐进式披露：
     - 主体行数 ≤ 500（软告警）
     - 未遗留 [TODO] / TODO: / <TODO> 占位符

退出码：
  0 → 全部通过
  1 → 存在 ERROR
  0 + 打印 WARN 行 → 仅 WARN，未阻断
"""

import re
import sys
from pathlib import Path
from typing import Optional

try:
    import yaml
except ModuleNotFoundError:  # 允许在无 PyYAML 环境下降级
    yaml = None

ALLOWED_TYPES = {"workflow-command", "tool-command"}
REQUIRED_FIELDS = ["name", "type", "description", "version", "author"]
MAX_NAME_LENGTH = 64
MAX_DESC_LENGTH = 200
MAX_BODY_LINES = 500

RE_NAME = re.compile(r"^[a-z][a-z0-9-]*$")
RE_TODO = re.compile(r"\[TODO\]|TODO:|<TODO", re.IGNORECASE)

# 结构信号：每个 Section 允许多种写法。
# 分两类：strict（必须通过，触发 ERROR）和 advisory（缺失只给 WARN）。
STRICT_SECTIONS = [
    ("Iron Law", re.compile(r"^##\s+Iron\s*Law", re.MULTILINE | re.IGNORECASE)),
    (
        "Step / Phase 步骤",
        re.compile(r"^##\s+(?:Step|Phase)\s+\d+", re.MULTILINE | re.IGNORECASE),
    ),
    (
        "产物清单 / Artifacts",
        re.compile(
            r"^#{2,4}\s+(?:\d+(?:\.\d+)*\s+)?(?:产物清单|Artifacts?)\b|"
            r"(?:^|\n)\*\*产物(?:清单)?\*\*\s*[：:]",
            re.MULTILINE | re.IGNORECASE,
        ),
    ),
]

# 在 frontmatter 或正文任一处命中即视为满足（handoff 允许 hands-off-to: 字段兜底）。
ADVISORY_SECTIONS = [
    (
        "完成衔接 / handoff",
        re.compile(
            r"^##\s+(?:完成衔接|Handoff)|^##\s+Step\s+\d+:\s*完成衔接|"
            r"^hands-off-to\s*:|handoffs\.[a-z][a-z0-9-]*\.next",
            re.MULTILINE | re.IGNORECASE,
        ),
        "full",
    ),
    (
        "常见阻断与纠偏 / errors 引用",
        re.compile(
            r"^##\s+(?:常见阻断与纠偏|Errors?|错误字典)|E0\d{2}_",
            re.MULTILINE,
        ),
        "body",
    ),
]


def _extract_frontmatter(content: str) -> Optional[str]:
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            return "\n".join(lines[1:idx])
    return None


def _parse_simple(frontmatter_text: str) -> Optional[dict[str, str]]:
    """无 PyYAML 环境下的降级解析器，仅支持简单 key: value 与折叠标量首行。"""
    parsed: dict[str, str] = {}
    current_key: Optional[str] = None
    pending_folded = False

    for raw_line in frontmatter_text.splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        is_indented = raw_line[:1].isspace()

        if is_indented and current_key is not None:
            joiner = " " if pending_folded else "\n"
            parsed[current_key] = (
                f"{parsed[current_key]}{joiner}{stripped}"
                if parsed[current_key]
                else stripped
            )
            pending_folded = False
            continue

        if ":" not in stripped:
            return None
        key, value = stripped.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            return None

        pending_folded = value in {">-", ">", "|", "|-"}
        if pending_folded:
            parsed[key] = ""
        else:
            if (value.startswith('"') and value.endswith('"')) or (
                value.startswith("'") and value.endswith("'")
            ):
                value = value[1:-1]
            parsed[key] = value
        current_key = key
    return parsed


def _strip_frontmatter(content: str) -> str:
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return content
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            return "\n".join(lines[idx + 1 :])
    return content


def validate_command(command_dir: Path) -> tuple[list[str], list[str]]:
    """Return (errors, warnings)."""
    errors: list[str] = []
    warnings: list[str] = []

    if not command_dir.exists():
        return [f"Command directory not found: {command_dir}"], []
    if not command_dir.is_dir():
        return [f"Not a directory: {command_dir}"], []

    cmd_name = command_dir.name
    md_path = command_dir / f"{cmd_name}.md"
    if not md_path.exists():
        return [f"Missing required file: {md_path.name}"], []

    content = md_path.read_text(encoding="utf-8")

    fm_text = _extract_frontmatter(content)
    if fm_text is None:
        errors.append("Invalid frontmatter: missing --- delimiters")
        return errors, warnings

    if yaml is not None:
        try:
            fm = yaml.safe_load(fm_text)
        except yaml.YAMLError as exc:
            return [f"Invalid YAML frontmatter: {exc}"], warnings
        if not isinstance(fm, dict):
            return ["Frontmatter must be a YAML dictionary"], warnings
    else:
        fm = _parse_simple(fm_text)
        if fm is None:
            return [
                "Invalid YAML frontmatter (PyYAML not installed; only simple key:value supported)"
            ], warnings

    # ---- Frontmatter 字段 ----
    missing = [field for field in REQUIRED_FIELDS if field not in fm]
    if missing:
        errors.append(f"Missing required frontmatter key(s): {', '.join(missing)}")

    name = str(fm.get("name", "")).strip()
    if name and name != cmd_name:
        errors.append(f"Frontmatter name '{name}' must match directory name '{cmd_name}'")
    if name and not RE_NAME.match(name):
        errors.append(f"Invalid command name '{name}' (must be kebab-case, start with a letter)")
    if name and len(name) > MAX_NAME_LENGTH:
        errors.append(
            f"Command name too long ({len(name)} chars). Max {MAX_NAME_LENGTH}."
        )

    cmd_type = str(fm.get("type", "")).strip()
    if cmd_type and cmd_type not in ALLOWED_TYPES:
        errors.append(
            f"Invalid type '{cmd_type}'. Allowed: {', '.join(sorted(ALLOWED_TYPES))}"
        )

    description = str(fm.get("description", "")).strip()
    if not description:
        errors.append("Description must be non-empty")
    else:
        if "<" in description or ">" in description:
            errors.append("Description cannot contain angle brackets (< or >)")
        if len(description) > MAX_DESC_LENGTH:
            warnings.append(
                f"Description is {len(description)} chars (> {MAX_DESC_LENGTH}); "
                "Level 1 过载风险，建议精简并把细节下沉到 Level 2。"
            )

    # ---- 结构块（Level 2 必备 Section）----
    body = _strip_frontmatter(content)
    for label, pattern in STRICT_SECTIONS:
        if not pattern.search(body):
            errors.append(f"Missing required section: {label}")

    for label, pattern, scope in ADVISORY_SECTIONS:
        haystack = content if scope == "full" else body
        if not pattern.search(haystack):
            warnings.append(
                f"Missing recommended section: {label} "
                "（可选但强烈建议；有助于 AI 在 handoff/纠偏时对齐机器源）"
            )

    # ---- 渐进式披露：主体行数 ----
    body_lines = [line for line in body.splitlines() if line.strip()]
    if len(body_lines) > MAX_BODY_LINES:
        warnings.append(
            f"Body has {len(body_lines)} non-empty lines (> {MAX_BODY_LINES}); "
            "考虑把长内容迁移到 references/。"
        )

    # ---- 占位符残留 ----
    todo_matches = RE_TODO.findall(body)
    if todo_matches:
        errors.append(
            f"Unresolved placeholder(s) found ({len(todo_matches)} occurrence(s)): "
            "请替换所有 [TODO] / TODO: / <TODO> 再提交。"
        )

    # ---- 标题 ----
    if not re.search(r"^#\s+\S", body, re.MULTILINE):
        errors.append("Missing top-level markdown title (`# ...`)")

    return errors, warnings


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: quick_validate_command.py <path/to/command-directory>")
        sys.exit(1)

    target = Path(sys.argv[1]).expanduser().resolve()
    errors, warnings = validate_command(target)

    if warnings:
        for warn in warnings:
            print(f"[WARN] {warn}")

    if errors:
        print("")
        for err in errors:
            print(f"[ERROR] {err}")
        print(f"\n[FAIL] {len(errors)} error(s), {len(warnings)} warning(s).")
        sys.exit(1)

    if warnings:
        print(f"\n[OK] No errors, {len(warnings)} warning(s). Command template structure is valid.")
    else:
        print("[OK] Command template is valid!")
    sys.exit(0)


if __name__ == "__main__":
    main()
