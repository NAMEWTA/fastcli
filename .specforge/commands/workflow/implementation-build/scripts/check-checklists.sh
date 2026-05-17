#!/bin/bash
# check-checklists.sh - 检查 checklists/ 目录中所有清单的完成状态
# 用法: ./check-checklists.sh [--checklists-dir <path>] [--json]

set -euo pipefail

# 默认配置
CHECKLISTS_DIR="${CHECKLISTS_DIR:-checklists}"
OUTPUT_JSON=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --checklists-dir)
            CHECKLISTS_DIR="$2"
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

# 检查目录是否存在
if [ ! -d "$CHECKLISTS_DIR" ]; then
    if $OUTPUT_JSON; then
        echo '{"status":"SKIP","reason":"CHECKLISTS_DIR_NOT_FOUND","dir":"'"$CHECKLISTS_DIR"'"}'
    else
        echo "⚠️  Checklists directory not found: $CHECKLISTS_DIR (skipping)"
    fi
    exit 0
fi

# 查找所有清单文件
CHECKLIST_FILES=()
while IFS= read -r -d '' file; do
    CHECKLIST_FILES+=("$file")
done < <(find "$CHECKLISTS_DIR" -name "*.md" -type f -print0 2>/dev/null || true)

if [ ${#CHECKLIST_FILES[@]} -eq 0 ]; then
    if $OUTPUT_JSON; then
        echo '{"status":"SKIP","reason":"NO_CHECKLISTS_FOUND","dir":"'"$CHECKLISTS_DIR"'"}'
    else
        echo "ℹ️  No checklists found in $CHECKLISTS_DIR"
    fi
    exit 0
fi

# 检查每个清单
OVERALL_STATUS="PASS"
RESULTS=()

for checklist in "${CHECKLIST_FILES[@]}"; do
    filename=$(basename "$checklist")
    
    # 统计清单项
    total=$(grep -cE "^- \[[ xX]\]" "$checklist" 2>/dev/null || echo "0")
    completed=$(grep -cE "^- \[[xX]\]" "$checklist" 2>/dev/null || echo "0")
    incomplete=$((total - completed))
    
    # 计算状态
    if [ "$incomplete" -eq 0 ]; then
        status="✓ PASS"
    else
        status="✗ FAIL"
        OVERALL_STATUS="FAIL"
    fi
    
    RESULTS+=("$filename|$total|$completed|$incomplete|$status")
done

# 输出结果
if $OUTPUT_JSON; then
    echo -n '{"status":"'"$OVERALL_STATUS"'","checklists":['
    first=true
    for result in "${RESULTS[@]}"; do
        IFS='|' read -r name total completed incomplete status <<< "$result"
        if ! $first; then echo -n ','; fi
        echo -n '{"name":"'"$name"'","total":'"$total"',"completed":'"$completed"',"incomplete":'"$incomplete"',"status":"'"$status"'"}'
        first=false
    done
    echo ']}'
else
    echo "## Checklist Status"
    echo ""
    echo "| Checklist | Total | Completed | Incomplete | Status |"
    echo "|-----------|-------|-----------|------------|--------|"
    
    for result in "${RESULTS[@]}"; do
        IFS='|' read -r name total completed incomplete status <<< "$result"
        echo "| $name | $total | $completed | $incomplete | $status |"
    done
    
    echo ""
    echo "Overall Status: $OVERALL_STATUS"
    
    if [ "$OVERALL_STATUS" = "FAIL" ]; then
        echo ""
        echo "⚠️  Some checklists are incomplete. Do you want to proceed with implementation anyway? (yes/no)"
        exit 1
    fi
fi
