#!/usr/bin/env python3
"""
技能初始化脚本（SpecForge-aware）

用途：
    为新技能生成符合 SpecForge 规范的骨架目录与 SKILL.md 模板。

用法：
    init_skill.py <skill-name> [--type <skill-type>] [--path <output-dir>] \
        [--resources scripts,references,assets] [--examples]

示例：
    # 按 type 自动路由到 .specforge/skills/<类别目录>/<skill-name>/
    init_skill.py my-new-skill --type workflow-step
    init_skill.py brand-style --type ui-ux-rule --resources assets --examples

    # 显式指定输出根目录（跳过 type 路由）
    init_skill.py my-new-skill --path /custom/location
    init_skill.py api-helper --path skills/private --resources scripts --examples
"""

import argparse
import re
import sys
from pathlib import Path

MAX_SKILL_NAME_LENGTH = 64
ALLOWED_RESOURCES = {"scripts", "references", "assets"}

# SpecForge 技能类型 → 类别目录 映射
# 必须与仓库 src/core/constants.ts 的 SKILL_CATEGORY_DIRS 保持一致
SKILL_TYPE_TO_CATEGORY_DIR = {
    "domain-rule": "domain-rules",
    "code-style": "code-styles",
    "architecture-rule": "architecture",
    "testing-rule": "testing",
    "security-rule": "security",
    "ui-ux-rule": "ui-ux",
    "workflow-step": "workflow-steps",
}

SPECFORGE_SKILLS_ROOT = ".specforge/skills"
DEFAULT_SKILL_TYPE = "workflow-step"
DEFAULT_AUTHOR = "wta"

SKILL_TEMPLATE = """---
name: {skill_name}
type: {skill_type}
description: "[TODO：用一两句话描述技能做什么 + 何时触发；包含明确的触发词或场景。长度 ≤ 200 字。]"
version: "1.0.0"
author: "{author}"
---

# {skill_title}

## 概述

[TODO：1-2 句话说明本技能能解决什么问题]

## 本技能的结构

[TODO：按技能用途选择合适的结构，常见模式：

**1. 工作流式**（适合顺序性流程）
- 有清晰的步骤化过程时使用
- 示例：DOCX 技能按 "工作流决策树" → "读取" → "创建" → "编辑" 组织
- 结构：## 概述 → ## 工作流决策树 → ## 第 1 步 → ## 第 2 步 …

**2. 任务式**（适合工具集合）
- 技能提供多种独立操作/能力时使用
- 示例：PDF 技能按 "快速开始" → "合并" → "拆分" → "抽取文本" 组织
- 结构：## 概述 → ## 快速开始 → ## 任务 1 → ## 任务 2 …

**3. 参考/规范式**（适合标准或规格）
- 适合品牌规范、编码标准、合规要求
- 示例：品牌规范按 "指引" → "配色" → "字体" → "组件" 组织
- 结构：## 概述 → ## 指引 → ## 规格 → ## 使用 …

**4. 能力式**（适合集成系统）
- 技能提供多个互相关联的能力时使用
- 示例：产品管理按 "核心能力" → 编号能力列表组织
- 结构：## 概述 → ## 核心能力 → ### 1. 能力 → ### 2. 能力 …

多种模式可组合。大多数技能会混用（例：以任务式为主，对复杂操作补充工作流式）。

完成后删除整个"本技能的结构"章节——它只是写作指引，不应出现在最终技能里。]

## [TODO：按上面选定的结构替换为正式章节标题]

[TODO：在此处添加内容。可参考其他技能中的常见手法：
- 技术类技能的代码示例
- 复杂流程的决策树
- 以真实用户请求为输入的具体示例
- 对 scripts/templates/references 的引用]

## 资源（可选）

仅为本技能真正需要的资源类型创建对应目录。不需要时请删除本节。

### scripts/

可直接执行的脚本（Python/Bash 等），用于特定操作或自动化。

**参考场景：**
- PDF 技能：`fill_fillable_fields.py`、`extract_form_field_info.py` —— PDF 表单处理
- DOCX 技能：`document.py`、`utilities.py` —— 文档处理模块

**适合存放：** Python 脚本、shell 脚本等可执行代码，用于自动化、数据处理或特定操作。

**注意：** 脚本可在不加载到上下文的前提下执行，但代理仍可能读取以便打补丁或适配环境。

### references/

供代理按需读入上下文的文档与参考资料。

**参考场景：**
- 产品管理：`communication.md`、`context_building.md` —— 详细工作流手册
- BigQuery：API 参考、查询示例
- 财务：schema 文档、公司政策

**适合存放：** 深度文档、API 参考、数据库 schema、完整指南，或任何代理工作时需要查阅的详细信息。

### assets/

不进入代理上下文、但会出现在代理最终产物里的文件。

**参考场景：**
- 品牌规范：PPT 模板（.pptx）、logo 图片
- 前端脚手架：HTML/React 样板项目目录
- 排版：字体文件（.ttf、.woff2）

**适合存放：** 模板、样板代码、文档模板、图片、图标、字体，或任何需要被复制/嵌入到最终产物的文件。

---

**并非所有技能都需要这三类资源。**
"""

EXAMPLE_SCRIPT = '''#!/usr/bin/env python3
"""
{skill_name} 的示例辅助脚本

这是一个占位脚本，可直接执行。请替换为实际实现或删除。

其他技能中的真实脚本参考：
- pdf/scripts/fill_fillable_fields.py —— 填写 PDF 表单域
- pdf/scripts/convert_pdf_to_images.py —— PDF 转图片
"""

def main():
    print("This is an example script for {skill_name}")
    # TODO：在此处实现实际逻辑（数据处理、格式转换、API 调用等）

if __name__ == "__main__":
    main()
'''

EXAMPLE_REFERENCE = """# {skill_title} 参考文档

占位文档，请替换为真实参考内容，或在不需要时删除。

其他技能中的真实参考文档参考：
- product-management/references/communication.md —— 状态同步完整手册
- product-management/references/context_building.md —— 上下文收集深度指南
- bigquery/references/ —— API 参考与查询示例

## 什么时候需要参考文档

参考文档适合承载：
- 完整的 API 文档
- 详细的工作流指南
- 复杂的多步骤流程
- SKILL.md 放不下的长内容
- 仅在特定场景才需要读取的资料

## 结构建议

### API 参考示例
- 概述
- 鉴权
- 端点与示例
- 错误码
- 限流策略

### 工作流指南示例
- 前置条件
- 步骤说明
- 常见模式
- 排障
- 最佳实践
"""

EXAMPLE_ASSET = """# 示例资产文件

占位内容，用于演示 assets/ 目录的摆放位置。请替换为真实资产文件（模板、图片、字体等），或在不需要时删除。

资产文件不会被加载到代理上下文，而是被代理在最终产物中使用。

其他技能中的真实资产参考：
- 品牌规范：logo.png、slides_template.pptx
- 前端脚手架：hello-world/ 样板目录（含 HTML/React 源文件）
- 排版：custom-font.ttf、font-family.woff2
- 数据：sample_data.csv、test_dataset.json

## 常见资产类型

- 模板：.pptx、.docx、样板项目目录
- 图片：.png、.jpg、.svg、.gif
- 字体：.ttf、.otf、.woff、.woff2
- 样板代码：项目目录、起始文件
- 图标：.ico、.svg
- 数据：.csv、.json、.xml、.yaml

备注：本文件是文本占位；实际资产可以是任何文件类型。
"""


def normalize_skill_name(skill_name):
    """把技能名规范化为 kebab-case（小写+连字符）。"""
    normalized = skill_name.strip().lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    normalized = normalized.strip("-")
    normalized = re.sub(r"-{2,}", "-", normalized)
    return normalized


def title_case_skill_name(skill_name):
    """把 kebab-case 技能名转为 Title Case（仅用于显示）。"""
    return " ".join(word.capitalize() for word in skill_name.split("-"))


def parse_resources(raw_resources):
    """解析 --resources 参数为唯一资源列表。"""
    if not raw_resources:
        return []
    resources = [item.strip() for item in raw_resources.split(",") if item.strip()]
    invalid = sorted({item for item in resources if item not in ALLOWED_RESOURCES})
    if invalid:
        allowed = ", ".join(sorted(ALLOWED_RESOURCES))
        print(f"[ERROR] 未知资源类型：{', '.join(invalid)}")
        print(f"   允许的取值：{allowed}")
        sys.exit(1)
    deduped = []
    seen = set()
    for resource in resources:
        if resource not in seen:
            deduped.append(resource)
            seen.add(resource)
    return deduped


def resolve_output_path(explicit_path, skill_type):
    """
    根据用户输入推断技能的父目录。

    优先级：
    1. --path 显式指定 → 直接使用（不再做类型路由）
    2. 提供 --type → 落到 `.specforge/skills/<类别目录>/`
    3. 都未提供 → 落到 `.specforge/skills/<DEFAULT_SKILL_TYPE 对应目录>/`
    """
    if explicit_path:
        return Path(explicit_path)

    category_dir = SKILL_TYPE_TO_CATEGORY_DIR.get(skill_type)
    if category_dir is None:
        category_dir = SKILL_TYPE_TO_CATEGORY_DIR[DEFAULT_SKILL_TYPE]
    return Path(SPECFORGE_SKILLS_ROOT) / category_dir


def create_resource_dirs(skill_dir, skill_name, skill_title, resources, include_examples):
    """按 resources 列表创建资源子目录，可选附带示例文件。"""
    for resource in resources:
        resource_dir = skill_dir / resource
        resource_dir.mkdir(exist_ok=True)
        if resource == "scripts":
            if include_examples:
                example_script = resource_dir / "example.py"
                example_script.write_text(EXAMPLE_SCRIPT.format(skill_name=skill_name))
                example_script.chmod(0o755)
                print("[OK] 已创建 scripts/example.py")
            else:
                print("[OK] 已创建 scripts/")
        elif resource == "references":
            if include_examples:
                example_reference = resource_dir / "api_reference.md"
                example_reference.write_text(EXAMPLE_REFERENCE.format(skill_title=skill_title))
                print("[OK] 已创建 references/api_reference.md")
            else:
                print("[OK] 已创建 references/")
        elif resource == "assets":
            if include_examples:
                example_asset = resource_dir / "example_asset.txt"
                example_asset.write_text(EXAMPLE_ASSET)
                print("[OK] 已创建 assets/example_asset.txt")
            else:
                print("[OK] 已创建 assets/")


def init_skill(skill_name, skill_type, path, resources, include_examples, author):
    """
    在指定位置初始化新技能目录并生成 SKILL.md 模板。

    Args:
        skill_name: 技能名（kebab-case）
        skill_type: 技能类型（写入 frontmatter，同时用于自动路由）
        path: 技能父目录 Path
        resources: 要创建的资源子目录列表
        include_examples: 是否生成示例文件
        author: frontmatter 中的 author 字段

    Returns:
        已创建技能目录的 Path，失败时返回 None
    """
    skill_dir = Path(path).resolve() / skill_name

    if skill_dir.exists():
        print(f"[ERROR] 技能目录已存在：{skill_dir}")
        return None

    try:
        skill_dir.mkdir(parents=True, exist_ok=False)
        print(f"[OK] 已创建技能目录：{skill_dir}")
    except Exception as e:
        print(f"[ERROR] 创建目录失败：{e}")
        return None

    skill_title = title_case_skill_name(skill_name)
    skill_content = SKILL_TEMPLATE.format(
        skill_name=skill_name,
        skill_type=skill_type,
        skill_title=skill_title,
        author=author,
    )

    skill_md_path = skill_dir / "SKILL.md"
    try:
        skill_md_path.write_text(skill_content)
        print("[OK] 已创建 SKILL.md")
    except Exception as e:
        print(f"[ERROR] 创建 SKILL.md 失败：{e}")
        return None

    if resources:
        try:
            create_resource_dirs(skill_dir, skill_name, skill_title, resources, include_examples)
        except Exception as e:
            print(f"[ERROR] 创建资源目录失败：{e}")
            return None

    print(f"\n[OK] 技能 '{skill_name}' 已初始化：{skill_dir}")
    print("\n下一步：")
    print("1. 编辑 SKILL.md，完成 TODO 并补全 description")
    if resources:
        if include_examples:
            print("2. 定制或删除 scripts/、references/、assets/ 中的示例文件")
        else:
            print("2. 按需在 scripts/、references/、assets/ 中补充资源")
    else:
        print("2. 仅在真正需要时创建 scripts/、references/、assets/ 目录")
    print("3. 准备好后运行 quick_validate.py 校验技能结构")

    return skill_dir


def main():
    parser = argparse.ArgumentParser(
        description="创建新的 SpecForge 技能目录并生成 SKILL.md 模板。",
    )
    parser.add_argument("skill_name", help="技能名（会被规范化为 kebab-case）")
    parser.add_argument(
        "--type",
        dest="skill_type",
        default=DEFAULT_SKILL_TYPE,
        choices=sorted(SKILL_TYPE_TO_CATEGORY_DIR.keys()),
        help=(
            "技能类型；未显式指定 --path 时会自动路由到 "
            ".specforge/skills/<类别目录>/（默认：%(default)s）"
        ),
    )
    parser.add_argument(
        "--path",
        default=None,
        help="技能父目录；不传时按 --type 自动路由到 .specforge/skills/<类别目录>/",
    )
    parser.add_argument(
        "--author",
        default=DEFAULT_AUTHOR,
        help=f"写入 frontmatter 的作者标识（默认：{DEFAULT_AUTHOR}）",
    )
    parser.add_argument(
        "--resources",
        default="",
        help="逗号分隔的资源目录：scripts,references,assets",
    )
    parser.add_argument(
        "--examples",
        action="store_true",
        help="在所选资源目录中生成示例文件",
    )
    args = parser.parse_args()

    raw_skill_name = args.skill_name
    skill_name = normalize_skill_name(raw_skill_name)
    if not skill_name:
        print("[ERROR] 技能名至少需要包含一个字母或数字。")
        sys.exit(1)
    if len(skill_name) > MAX_SKILL_NAME_LENGTH:
        print(
            f"[ERROR] 技能名 '{skill_name}' 过长（{len(skill_name)} 字符）。"
            f"上限为 {MAX_SKILL_NAME_LENGTH} 字符。"
        )
        sys.exit(1)
    if skill_name != raw_skill_name:
        print(f"提示：已把技能名从 '{raw_skill_name}' 规范化为 '{skill_name}'。")

    resources = parse_resources(args.resources)
    if args.examples and not resources:
        print("[ERROR] --examples 需要同时指定 --resources。")
        sys.exit(1)

    output_root = resolve_output_path(args.path, args.skill_type)

    print(f"初始化技能：{skill_name}")
    print(f"   类型：{args.skill_type}")
    print(f"   目标目录：{output_root}")
    if resources:
        print(f"   资源：{', '.join(resources)}")
        if args.examples:
            print("   示例：已启用")
    else:
        print("   资源：无（按需再创建）")
    print()

    result = init_skill(
        skill_name=skill_name,
        skill_type=args.skill_type,
        path=output_root,
        resources=resources,
        include_examples=args.examples,
        author=args.author,
    )

    if result:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
