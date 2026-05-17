#!/usr/bin/env python3
"""
技能快速校验脚本（最小版本）

校验 SKILL.md frontmatter 是否符合 SpecForge 的最小契约：
- 存在闭合的 frontmatter 栅栏
- frontmatter 为 YAML 字典
- 至少包含 name 与 description
- 其余键必须在允许集合内（SpecForge 5 字段 + 兼容性扩展字段）
- name 合法 kebab-case 且长度 ≤ 64
- description 不含尖括号且长度 ≤ 1024

注意：为保持回归测试稳定，部分错误消息保持英文原串不变。
"""

import re
import sys
from pathlib import Path
from typing import Optional

try:
    import yaml
except ModuleNotFoundError:
    yaml = None

MAX_SKILL_NAME_LENGTH = 64


def _extract_frontmatter(content: str) -> Optional[str]:
    """从 SKILL.md 中抽取位于首尾 `---` 栅栏之间的 YAML frontmatter。"""
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return "\n".join(lines[1:i])
    return None


_BLOCK_SCALAR_INDICATORS = {">", ">-", ">+", "|", "|-", "|+"}


def _parse_simple_frontmatter(frontmatter_text: str) -> Optional[dict[str, str]]:
    """
    PyYAML 不可用时的最小回退解析器。

    支持：
    - 简单 `key: value` 映射
    - 单/双引号字面值
    - YAML 块标量指示符（`>`、`>-`、`>+`、`|`、`|-`、`|+`），折叠 (`>`) 以空格连接
      行，字面 (`|`) 以换行连接；不保留 YAML 指示符本身，避免与 description 校验冲突
    """
    parsed: dict[str, str] = {}
    current_key: Optional[str] = None
    # 当前键是否处于块标量模式，及其折叠方式（"fold" | "literal" | None）
    block_mode: Optional[str] = None

    def unquote(value: str) -> str:
        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            return value[1:-1]
        return value

    for raw_line in frontmatter_text.splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        is_indented = raw_line[:1].isspace()
        if is_indented:
            if current_key is None:
                return None
            current_value = parsed[current_key]
            if block_mode == "fold":
                # 折叠风格 (>)：以空格连接
                parsed[current_key] = (
                    f"{current_value} {stripped}" if current_value else stripped
                )
            elif block_mode == "literal":
                # 字面风格 (|)：保留换行
                parsed[current_key] = (
                    f"{current_value}\n{stripped}" if current_value else stripped
                )
            else:
                # 普通多行续行：退化为换行拼接（保持旧行为）
                parsed[current_key] = (
                    f"{current_value}\n{stripped}" if current_value else stripped
                )
            continue

        if ":" not in stripped:
            return None
        key, value = stripped.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            return None

        if value in _BLOCK_SCALAR_INDICATORS:
            # 进入块标量模式；实际值由后续缩进行提供
            parsed[key] = ""
            current_key = key
            block_mode = "literal" if value.startswith("|") else "fold"
            continue

        parsed[key] = unquote(value)
        current_key = key
        block_mode = None
    return parsed


def validate_skill(skill_path):
    """对一个技能目录做基础校验，返回 (是否通过, 文案)。"""
    skill_path = Path(skill_path)

    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return False, "SKILL.md not found"

    try:
        content = skill_md.read_text(encoding="utf-8")
    except OSError as e:
        return False, f"Could not read SKILL.md: {e}"

    frontmatter_text = _extract_frontmatter(content)
    if frontmatter_text is None:
        return False, "Invalid frontmatter format"
    if yaml is not None:
        try:
            frontmatter = yaml.safe_load(frontmatter_text)
            if not isinstance(frontmatter, dict):
                return False, "Frontmatter must be a YAML dictionary"
        except yaml.YAMLError as e:
            return False, f"Invalid YAML in frontmatter: {e}"
    else:
        frontmatter = _parse_simple_frontmatter(frontmatter_text)
        if frontmatter is None:
            return (
                False,
                "Invalid YAML in frontmatter: unsupported syntax without PyYAML installed",
            )

    # SpecForge 统一 5 字段 + 兼容历史字段
    allowed_properties = {
        # SpecForge 统一 5 字段
        "name",
        "type",
        "description",
        "version",
        "author",
        # 兼容历史/外部字段
        "license",
        "allowed-tools",
        "metadata",
    }

    unexpected_keys = set(frontmatter.keys()) - allowed_properties
    if unexpected_keys:
        allowed = ", ".join(sorted(allowed_properties))
        unexpected = ", ".join(sorted(unexpected_keys))
        return (
            False,
            f"Unexpected key(s) in SKILL.md frontmatter: {unexpected}. Allowed properties are: {allowed}",
        )

    if "name" not in frontmatter:
        return False, "Missing 'name' in frontmatter"
    if "description" not in frontmatter:
        return False, "Missing 'description' in frontmatter"

    name = frontmatter.get("name", "")
    if not isinstance(name, str):
        return False, f"Name must be a string, got {type(name).__name__}"
    name = name.strip()
    if name:
        if not re.match(r"^[a-z0-9-]+$", name):
            return (
                False,
                f"Name '{name}' should be hyphen-case (lowercase letters, digits, and hyphens only)",
            )
        if name.startswith("-") or name.endswith("-") or "--" in name:
            return (
                False,
                f"Name '{name}' cannot start/end with hyphen or contain consecutive hyphens",
            )
        if len(name) > MAX_SKILL_NAME_LENGTH:
            return (
                False,
                f"Name is too long ({len(name)} characters). "
                f"Maximum is {MAX_SKILL_NAME_LENGTH} characters.",
            )

    description = frontmatter.get("description", "")
    if not isinstance(description, str):
        return False, f"Description must be a string, got {type(description).__name__}"
    description = description.strip()
    if description:
        if "<" in description or ">" in description:
            return False, "Description cannot contain angle brackets (< or >)"
        if len(description) > 1024:
            return (
                False,
                f"Description is too long ({len(description)} characters). Maximum is 1024 characters.",
            )

    return True, "Skill is valid!"


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python quick_validate.py <skill_directory>")
        sys.exit(1)

    valid, message = validate_skill(sys.argv[1])
    print(message)
    sys.exit(0 if valid else 1)
