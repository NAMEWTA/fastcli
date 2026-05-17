#!/bin/bash
# check-constitution.sh - 验证 TASKS.md 中的任务是否符合宪法原则
# 用法: ./check-constitution.sh [--tasks-file <path>] [--constitution-file <path>] [--json]

set -euo pipefail

# 默认配置
TASKS_FILE="${TASKS_FILE:-TASKS.md}"
CONSTITUTION_FILE="${CONSTITUTION_FILE:-.specforge/constitution.md}"
OUTPUT_JSON=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --tasks-file)
            TASKS_FILE="$2"
            shift 2
            ;;
        --constitution-file)
            CONSTITUTION_FILE="$2"
            shift 2
            ;;
        --json)
            OUTPUT_JSON=true
            shift
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

# 检查文件是否存在
if [ ! -f "$TASKS_FILE" ]; then
    if $OUTPUT_JSON; then
        echo '{"status":"FAIL","reason":"TASKS_FILE_NOT_FOUND","file":"'"$TASKS_FILE"'"}'
    else
        echo "❌ TASKS.md not found: $TASKS_FILE"
    fi
    exit 1
fi

if [ ! -f "$CONSTITUTION_FILE" ]; then
    if $OUTPUT_JSON; then
        echo '{"status":"SKIP","reason":"CONSTITUTION_FILE_NOT_FOUND","file":"'"$CONSTITUTION_FILE"'"}'
    else
        echo "⚠️  Constitution file not found: $CONSTITUTION_FILE (skipping)"
    fi
    exit 0
fi

# 提取宪法原则
TEST_FIRST=false
REUSE_FIRST=false

if grep -qi "test.first\|测试优先" "$CONSTITUTION_FILE"; then
    TEST_FIRST=true
fi

if grep -qi "reuse.first\|复用优先" "$CONSTITUTION_FILE"; then
    REUSE_FIRST=true
fi

# 检查任务列表
VIOLATIONS=()

# 检查测试优先原则
if $TEST_FIRST; then
    # 查找有实现步骤但没有对应测试步骤的任务
    while IFS= read -r line; do
        task_id=$(echo "$line" | grep -oP '^\S+' || true)
        if [ -n "$task_id" ]; then
            # 检查任务描述中是否有实现相关词汇
            if echo "$line" | grep -qi "implement\|create\|build\|实现\|创建\|构建"; then
                # 检查同一任务是否有测试相关词汇
                if ! echo "$line" | grep -qi "test\|verify\|测试\|验证"; then
                    VIOLATIONS+=("TEST_FIRST:$task_id:Task mentions implementation but not testing")
                fi
            fi
        fi
    done < <(grep -E "^- \[.\]" "$TASKS_FILE" || true)
fi

# 检查复用优先原则
if $REUSE_FIRST; then
    # 查找有"新建"但没有"检索"或"复用"的任务
    while IFS= read -r line; do
        task_id=$(echo "$line" | grep -oP '^\S+' || true)
        if [ -n "$task_id" ]; then
            if echo "$line" | grep -qi "new file\|create new\|新建文件\|新增"; then
                if ! echo "$line" | grep -qi "reuse\|search existing\|复用\|检索"; then
                    VIOLATIONS+=("REUSE_FIRST:$task_id:Task creates new file without checking existing")
                fi
            fi
        fi
    done < <(grep -E "^- \[.\]" "$TASKS_FILE" || true)
fi

# 输出结果
if [ ${#VIOLATIONS[@]} -eq 0 ]; then
    if $OUTPUT_JSON; then
        echo '{"status":"PASS","violations":[]}'
    else
        echo "✅ Constitution check passed - no violations found"
    fi
    exit 0
else
    if $OUTPUT_JSON; then
        echo -n '{"status":"FAIL","violations":['
        first=true
        for v in "${VIOLATIONS[@]}"; do
            IFS=':' read -r type id desc <<< "$v"
            if ! $first; then echo -n ','; fi
            echo -n '{"type":"'"$type"'","id":"'"$id"'","description":"'"$desc"'"}'
            first=false
        done
        echo ']}'
    else
        echo "❌ Constitution check failed - ${#VIOLATIONS[@]} violation(s) found:"
        for v in "${VIOLATIONS[@]}"; do
            IFS=':' read -r type id desc <<< "$v"
            echo "  - [$type] $id: $desc"
        done
    fi
    exit 1
fi
