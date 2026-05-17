#!/usr/bin/env python3
"""
技能打包脚本 —— 把技能目录压成可分发的 .skill 文件

用法：
    python scripts/package_skill.py <技能目录> [输出目录]

示例：
    python scripts/package_skill.py .specforge/skills/workflow-steps/my-skill
    python scripts/package_skill.py .specforge/skills/workflow-steps/my-skill ./dist

打包前会调用 quick_validate 进行 frontmatter 与命名校验；校验失败则拒绝打包。
出于安全考虑，目录内若存在符号链接会被跳过并记录告警；未能解析到技能根以内的文件会直接失败。
"""

import sys
import zipfile
from pathlib import Path

from quick_validate import validate_skill


def _is_within(path: Path, root: Path) -> bool:
    """判断 path 是否位于 root 之内（包含相等）。"""
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def package_skill(skill_path, output_dir=None):
    """
    把一个技能目录打包为 .skill 文件。

    Args:
        skill_path: 技能目录路径
        output_dir: 可选的输出目录（默认当前工作目录）

    Returns:
        生成的 .skill 文件 Path；失败返回 None
    """
    skill_path = Path(skill_path).resolve()

    # 校验技能目录存在
    if not skill_path.exists():
        print(f"[ERROR] 技能目录不存在：{skill_path}")
        return None

    if not skill_path.is_dir():
        print(f"[ERROR] 路径不是目录：{skill_path}")
        return None

    # 校验 SKILL.md 存在
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        print(f"[ERROR] {skill_path} 下找不到 SKILL.md")
        return None

    # 打包前先跑校验
    print("正在校验技能...")
    valid, message = validate_skill(skill_path)
    if not valid:
        print(f"[ERROR] 校验失败：{message}")
        print("   请先修复校验错误再重试打包。")
        return None
    print(f"[OK] {message}\n")

    # 决定输出位置
    skill_name = skill_path.name
    if output_dir:
        output_path = Path(output_dir).resolve()
        output_path.mkdir(parents=True, exist_ok=True)
    else:
        output_path = Path.cwd()

    skill_filename = output_path / f"{skill_name}.skill"

    EXCLUDED_DIRS = {".git", ".svn", ".hg", "__pycache__", "node_modules"}

    # 生成 .skill 文件（zip 格式）
    try:
        with zipfile.ZipFile(skill_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
            # 遍历技能目录
            for file_path in skill_path.rglob("*"):
                # 安全：不跟随、不打包符号链接
                if file_path.is_symlink():
                    print(f"[WARN] 跳过符号链接：{file_path}")
                    continue

                rel_parts = file_path.relative_to(skill_path).parts
                if any(part in EXCLUDED_DIRS for part in rel_parts):
                    continue

                if file_path.is_file():
                    resolved_file = file_path.resolve()
                    if not _is_within(resolved_file, skill_path):
                        print(f"[ERROR] 文件解析后逃出技能根目录：{file_path}")
                        return None
                    # 输出目录若位于技能目录下，避免把 .skill 自身写进去
                    if resolved_file == skill_filename.resolve():
                        print(f"[WARN] 跳过输出归档文件：{file_path}")
                        continue

                    # 计算归档内的相对路径
                    arcname = Path(skill_name) / file_path.relative_to(skill_path)
                    zipf.write(file_path, arcname)
                    print(f"  已加入：{arcname}")

        print(f"\n[OK] 技能已成功打包到：{skill_filename}")
        return skill_filename

    except Exception as e:
        print(f"[ERROR] 创建 .skill 文件失败：{e}")
        return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/package_skill.py <技能目录> [输出目录]")
        print("\n示例：")
        print("  python scripts/package_skill.py .specforge/skills/workflow-steps/my-skill")
        print("  python scripts/package_skill.py .specforge/skills/workflow-steps/my-skill ./dist")
        sys.exit(1)

    skill_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"打包技能：{skill_path}")
    if output_dir:
        print(f"   输出目录：{output_dir}")
    print()

    result = package_skill(skill_path, output_dir)

    if result:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
