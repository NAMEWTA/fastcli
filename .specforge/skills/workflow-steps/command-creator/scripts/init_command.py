#!/usr/bin/env python3
"""
Command Initializer - 为 SpecForge 创建新的 command 模板目录。

用法：
  init_command.py <command-name> --path <输出目录> --type <workflow-command|tool-command>
      [--resources references,scripts,assets] [--examples]

示例：
  init_command.py requirements-clarify \\
    --path templates/.specforge/commands/workflow \\
    --type workflow-command \\
    --resources references
  init_command.py review \\
    --path templates/.specforge/commands/tools \\
    --type tool-command \\
    --resources references,scripts --examples

脚本职责：
  1. 校验命令名、类型、资源列表
  2. 在 <--path>/<command-name>/ 下创建 <command-name>.md（含完整七块骨架）
  3. 可选创建 references/ / scripts/ / assets/ 子目录与 example 占位文件

骨架对齐 `references/command-anatomy.md` 的七块结构；
生成后请用 scripts/quick_validate_command.py 做一次结构校验。
"""

import argparse
import re
import sys
from pathlib import Path

MAX_NAME_LENGTH = 64
ALLOWED_TYPES = {"workflow-command", "tool-command"}
ALLOWED_RESOURCES = {"scripts", "references", "assets"}

# ---------------------------------------------------------------------------
# 触发词 / 阶段映射（与 src/services/command-service.ts 的 *_TRIGGER_MAP 对齐）
# ---------------------------------------------------------------------------

WORKFLOW_TRIGGER_MAP: dict[str, dict[str, str]] = {
    "foundation-init": {"triggers": "init,foundation,project,setup", "phase": ""},
    "requirements-clarify": {"triggers": "clarify,specify,brainstorm,requirements", "phase": "requirements"},
    "design-explore": {"triggers": "architecture,design,interface,contract", "phase": "design"},
    "planning-breakdown": {"triggers": "tasks,breakdown,planning,complexity", "phase": "planning"},
    "implementation-build": {"triggers": "implement,subagent,tdd,build", "phase": "implementation"},
    "quality-verify": {"triggers": "verify,test,review,checklist,qa", "phase": "quality"},
    "release-deploy": {"triggers": "release,deploy,ship,publish,runbook,monitor", "phase": "release"},
    "evolution-retrospect": {"triggers": "retrospective,learn,improve,evolve,tune", "phase": "evolution"},
}

TOOL_TRIGGER_MAP: dict[str, dict[str, str]] = {
    "debugging": {"triggers": "debug,bug,fix,排查,调试"},
    "documentation": {"triggers": "文档,规范,documentation,写作"},
    "review": {"triggers": "review,quality,coherence,一致性,审查"},
    "qa": {"triggers": "qa,test,verify,回归,质量"},
    "worktree": {"triggers": "worktree,branch,change,并行,分支"},
}


def _lookup_preamble_config(command_type: str, command_name: str) -> dict[str, str]:
    if command_type == "workflow-command":
        return WORKFLOW_TRIGGER_MAP.get(
            command_name,
            {"triggers": "workflow", "phase": "requirements"},
        )
    if command_type == "tool-command":
        return TOOL_TRIGGER_MAP.get(command_name, {"triggers": "tool"})
    return {"triggers": "general"}


# ---------------------------------------------------------------------------
# 七块骨架模板
# ---------------------------------------------------------------------------

COMMAND_TEMPLATE = """---
name: {command_name}
type: {command_type}
description: >-
  [TODO] 一句话说明命令做什么，并点明触发场景与中英关键词。
  结构建议：能力句 + 触发场景（用户会怎么说）+ 关键词（中英混合 ≥ 5 个）。
version: "1.0.0"
author: "wta"
---

<!-- preamble:bash
# 技能注入（按命令特性调整触发词）
specforge list --skills --triggers={triggers} --format=json
{phase_line}
# 环境检测
specforge doctor --check-deps --quiet
-->

# {command_title}

## Iron Law

> [TODO] 写出一条具体可阻断的 HARD-GATE（含"禁止/必须"类动词）。
> 反例："认真对待质量"（口号）。
> 正例："无新验证证据，禁止声称完成。"

---

## Step 1: [动词短语，如"加载上下文"]

- [ ] 读取 `.specforge/config.yaml`（框架机器源）
- [ ] 读取 `specforge/config.yaml`（项目机器源）
- [ ] [TODO] 其他本阶段需要的上下文

---

## Step 2: [动词短语，如"执行核心动作"]

- [ ] [TODO] 动词开头的可执行条目 1
- [ ] [TODO] 动词开头的可执行条目 2

---

## Step 3: [动词短语，如"生成产物"]

- [ ] [TODO] 按下方"产物清单"生成对应文件
- [ ] [TODO] 同步更新 specforge 状态（如适用）

---

## 产物清单

本命令执行后应生成/更新以下产物：

- **[TODO 产物名]**：`[TODO 路径，例如 specforge/changes/<change-id>/<file>.md]`
  - [TODO] 必需章节 / 字段 1
  - [TODO] 必需章节 / 字段 2

---

## 完成衔接（handoff）

**下一步**：按 `.specforge/config.yaml` 的 `handoffs.{command_name}.next` 推荐执行。
- [TODO] 填入默认推荐命令与原因。

---

## 常见阻断与纠偏（errors 引用）

- **E001_missingPrerequisiteArtifact**：[TODO] 本命令下触发该错误的具体表现与修复路径。
- [TODO] 必要时补充其他 E00X 错误引用。

---

## 反规避提醒

| 借口 | 现实 |
| ---- | ---- |
| "[TODO] 一条常见规避借口" | [TODO] 打破该借口的事实 |

---

## References 导航（按需读取）

> 主体接近或超过 500 行时，把长清单/模式库/案例库迁到 `references/` 并在此表中链接。

| 场景 | 参考文档 | 核心内容 |
| ---- | -------- | -------- |
| [TODO 何时读取] | `references/[TODO].md` | [TODO] |
"""

EXAMPLE_REFERENCE = """# [TODO] 参考文档标题

> 本文档回答一个问题：[TODO 这个文件解决什么问题]。
> 主体超过 500 行或出现 ≥ 10 条并列条目时迁移到此文件。

## TOC

- [章节 1](#章节-1)
- [章节 2](#章节-2)

## 章节 1

[TODO] 具体内容
"""

EXAMPLE_SCRIPT = """#!/usr/bin/env bash
# [TODO] 一句话说明脚本用途。
# 脚本命名规范：一脚本一职责，支持 --help。

set -euo pipefail

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  cat <<'USAGE'
Usage: example.sh [options]

[TODO] 参数与用法。
USAGE
  exit 0
fi

echo "[example] 替换为真实逻辑"
"""


# ---------------------------------------------------------------------------
# 辅助函数
# ---------------------------------------------------------------------------


def _normalize_name(name: str) -> str:
    normalized = name.strip().lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    normalized = normalized.strip("-")
    normalized = re.sub(r"-{2,}", "-", normalized)
    return normalized


def _title_case(name: str) -> str:
    return " ".join(part.capitalize() for part in name.split("-"))


def _parse_resources(raw: str) -> list[str]:
    if not raw:
        return []
    items = [x.strip() for x in raw.split(",") if x.strip()]
    invalid = sorted({x for x in items if x not in ALLOWED_RESOURCES})
    if invalid:
        print(f"[ERROR] Unknown resource type(s): {', '.join(invalid)}")
        print(f"   Allowed: {', '.join(sorted(ALLOWED_RESOURCES))}")
        sys.exit(1)
    seen: set[str] = set()
    ordered: list[str] = []
    for x in items:
        if x not in seen:
            ordered.append(x)
            seen.add(x)
    return ordered


def _build_phase_line(phase: str) -> str:
    if phase:
        return (
            "\n# 前置产物检测\n"
            f"specforge status --phase={phase} --check-requires\n"
        )
    return "\n# 前置产物检测（如适用，取消注释并调整）\n# specforge status --check-artifacts=... --quiet\n"


def _create_resource_dirs(
    command_dir: Path,
    resources: list[str],
    include_examples: bool,
) -> None:
    for resource in resources:
        target = command_dir / resource
        target.mkdir(parents=True, exist_ok=True)
        if not include_examples:
            continue

        if resource == "references":
            (target / "overview.md").write_text(EXAMPLE_REFERENCE, encoding="utf-8")
            print("[OK] Created references/overview.md")
        elif resource == "scripts":
            script_path = target / "example.sh"
            script_path.write_text(EXAMPLE_SCRIPT, encoding="utf-8")
            script_path.chmod(0o755)
            print("[OK] Created scripts/example.sh")
        elif resource == "assets":
            (target / ".keep").write_text(
                "# 保留目录标记，替换为真实样板后可删除\n",
                encoding="utf-8",
            )
            print("[OK] Created assets/.keep")


# ---------------------------------------------------------------------------
# 主逻辑
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Initialize a SpecForge command template directory.",
    )
    parser.add_argument("command_name", help="命令名称（kebab-case）")
    parser.add_argument(
        "--path",
        required=True,
        help="输出父目录（命令目录的上级），如 templates/.specforge/commands/workflow",
    )
    parser.add_argument(
        "--type",
        required=True,
        dest="command_type",
        help="命令类型：workflow-command 或 tool-command",
    )
    parser.add_argument(
        "--resources",
        default="",
        help="可选资源目录：references,scripts,assets（逗号分隔）",
    )
    parser.add_argument(
        "--examples",
        action="store_true",
        help="在资源目录内生成 example 占位文件",
    )
    args = parser.parse_args()

    raw_name = args.command_name
    command_name = _normalize_name(raw_name)
    if not command_name:
        print("[ERROR] Empty command name after normalization.")
        sys.exit(1)
    if len(command_name) > MAX_NAME_LENGTH:
        print(
            f"[ERROR] Command name too long ({len(command_name)} chars). "
            f"Max {MAX_NAME_LENGTH}."
        )
        sys.exit(1)
    if not re.match(r"^[a-z][a-z0-9-]*$", command_name):
        print(f"[ERROR] Invalid command name: {command_name}")
        print("   Must be kebab-case and start with a letter.")
        sys.exit(1)
    if command_name != raw_name:
        print(f"Note: Normalized command name from '{raw_name}' to '{command_name}'.")

    command_type = args.command_type.strip()
    if command_type not in ALLOWED_TYPES:
        print(f"[ERROR] Invalid type: {command_type}")
        print(f"   Allowed: {', '.join(sorted(ALLOWED_TYPES))}")
        sys.exit(1)

    resources = _parse_resources(args.resources)
    if args.examples and not resources:
        print("[ERROR] --examples requires --resources to be set.")
        sys.exit(1)

    out_parent = Path(args.path).expanduser().resolve()
    command_dir = out_parent / command_name
    if command_dir.exists():
        print(f"[ERROR] Command directory already exists: {command_dir}")
        sys.exit(1)

    try:
        command_dir.mkdir(parents=True, exist_ok=False)
    except OSError as exc:
        print(f"[ERROR] Error creating directory: {exc}")
        sys.exit(1)

    config = _lookup_preamble_config(command_type, command_name)
    phase = config.get("phase", "")
    content = COMMAND_TEMPLATE.format(
        command_name=command_name,
        command_type=command_type,
        command_title=_title_case(command_name),
        triggers=config.get("triggers", ""),
        phase_line=_build_phase_line(phase),
    )

    md_path = command_dir / f"{command_name}.md"
    md_path.write_text(content, encoding="utf-8")
    print(f"[OK] Created {md_path.relative_to(out_parent)}")

    _create_resource_dirs(command_dir, resources, args.examples)

    print(f"\n[OK] Command '{command_name}' initialized at {command_dir}")
    print("\nNext steps:")
    print("1. 打开 <command>.md 替换所有 [TODO] 内容（Iron Law、Steps、产物、handoff、errors、反规避）")
    print("2. 对照 references/command-anatomy.md 检查七块骨架是否完整")
    print("3. 运行 `python scripts/quick_validate_command.py <目录>` 做结构校验")
    if resources:
        print("4. 按需在 references/ / scripts/ / assets/ 里添加真实内容并从主体链接")


if __name__ == "__main__":
    main()
