#!/bin/bash
# validate-project-setup.sh - 验证项目忽略文件配置
# 用法: ./validate-project-setup.sh [--design-file <path>] [--json]

set -euo pipefail

# 默认配置
DESIGN_FILE="${DESIGN_FILE:-DESIGN.md}"
OUTPUT_JSON=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --design-file)
            DESIGN_FILE="$2"
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

# 检测技术栈
TECH_STACK=()
HAS_DOCKER=false
HAS_ESLINT=false
HAS_PRETTIER=false
HAS_TERRAFORM=false
HAS_NODE=false
HAS_PYTHON=false
HAS_JAVA_MAVEN=false
HAS_JAVA_GRADLE=false
HAS_GO=false
HAS_RUST=false
HAS_DOTNET=false

# 从 DESIGN.md 提取技术栈
if [ -f "$DESIGN_FILE" ]; then
    if grep -qi "node.js\|typescript\|javascript" "$DESIGN_FILE"; then
        HAS_NODE=true
        TECH_STACK+=("node")
    fi
    if grep -qi "python" "$DESIGN_FILE"; then
        HAS_PYTHON=true
        TECH_STACK+=("python")
    fi
    if grep -qi "spring\s*boot\|spring\b\|java\b\|maven" "$DESIGN_FILE"; then
        HAS_JAVA_MAVEN=true
        TECH_STACK+=("java-maven")
    fi
    if grep -qi "gradle" "$DESIGN_FILE"; then
        HAS_JAVA_GRADLE=true
        TECH_STACK+=("java-gradle")
    fi
    if grep -qi "\bgolang\b\|\bgo lang\b" "$DESIGN_FILE"; then
        HAS_GO=true
        TECH_STACK+=("go")
    fi
    if grep -qi "\brust\b\|cargo" "$DESIGN_FILE"; then
        HAS_RUST=true
        TECH_STACK+=("rust")
    fi
    if grep -qi "\b\.net\b\|dotnet\|c#\|csharp" "$DESIGN_FILE"; then
        HAS_DOTNET=true
        TECH_STACK+=("dotnet")
    fi
fi

# 检测项目文件
if [ -f "Dockerfile" ] || grep -qi "docker" "$DESIGN_FILE" 2>/dev/null; then
    HAS_DOCKER=true
fi

if ls .eslintrc* &>/dev/null || ls eslint.config.* &>/dev/null; then
    HAS_ESLINT=true
fi

if ls .prettierrc* &>/dev/null; then
    HAS_PRETTIER=true
fi

if ls *.tf &>/dev/null 2>/dev/null; then
    HAS_TERRAFORM=true
fi

if [ -f "package.json" ] || [ -f ".npmrc" ]; then
    HAS_NODE=true
    if [[ ! " ${TECH_STACK[@]} " =~ " node " ]]; then
        TECH_STACK+=("node")
    fi
fi

if [ -f "requirements.txt" ] || [ -f "setup.py" ] || [ -f "pyproject.toml" ] || [ -f "Pipfile" ]; then
    HAS_PYTHON=true
    if [[ ! " ${TECH_STACK[@]} " =~ " python " ]]; then
        TECH_STACK+=("python")
    fi
fi

if [ -f "pom.xml" ]; then
    HAS_JAVA_MAVEN=true
    if [[ ! " ${TECH_STACK[@]} " =~ " java-maven " ]]; then
        TECH_STACK+=("java-maven")
    fi
fi

if [ -f "build.gradle" ] || [ -f "build.gradle.kts" ] || [ -f "settings.gradle" ] || [ -f "settings.gradle.kts" ]; then
    HAS_JAVA_GRADLE=true
    if [[ ! " ${TECH_STACK[@]} " =~ " java-gradle " ]]; then
        TECH_STACK+=("java-gradle")
    fi
fi

if [ -f "go.mod" ]; then
    HAS_GO=true
    if [[ ! " ${TECH_STACK[@]} " =~ " go " ]]; then
        TECH_STACK+=("go")
    fi
fi

if [ -f "Cargo.toml" ]; then
    HAS_RUST=true
    if [[ ! " ${TECH_STACK[@]} " =~ " rust " ]]; then
        TECH_STACK+=("rust")
    fi
fi

if ls *.csproj &>/dev/null 2>/dev/null || ls *.sln &>/dev/null 2>/dev/null || [ -f "global.json" ]; then
    HAS_DOTNET=true
    if [[ ! " ${TECH_STACK[@]} " =~ " dotnet " ]]; then
        TECH_STACK+=("dotnet")
    fi
fi

# 检查忽略文件
ISSUES=()

# 检查 .gitignore
if git rev-parse --git-dir &>/dev/null; then
    if [ ! -f ".gitignore" ]; then
        ISSUES+=("MISSING:.gitignore:No .gitignore found in git repository")
    else
        # 检查常见模式（参见 skills/workflow-steps/language-adapters 第 3 节）
        if $HAS_NODE; then
            if ! grep -q "node_modules" ".gitignore" 2>/dev/null; then
                ISSUES+=("INCOMPLETE:.gitignore:Missing node_modules pattern")
            fi
        fi
        if $HAS_PYTHON; then
            if ! grep -q "__pycache__" ".gitignore" 2>/dev/null; then
                ISSUES+=("INCOMPLETE:.gitignore:Missing __pycache__ pattern")
            fi
        fi
        if $HAS_JAVA_MAVEN; then
            if ! grep -q "target/" ".gitignore" 2>/dev/null; then
                ISSUES+=("INCOMPLETE:.gitignore:Missing target/ pattern (Maven)")
            fi
        fi
        if $HAS_JAVA_GRADLE; then
            if ! grep -qE "^build/|^\.gradle/" ".gitignore" 2>/dev/null; then
                ISSUES+=("INCOMPLETE:.gitignore:Missing build/ or .gradle/ pattern (Gradle)")
            fi
        fi
        if $HAS_GO; then
            if ! grep -qE "^bin/|\*\.test" ".gitignore" 2>/dev/null; then
                ISSUES+=("INCOMPLETE:.gitignore:Missing bin/ or *.test pattern (Go)")
            fi
        fi
        if $HAS_RUST; then
            if ! grep -q "^target/" ".gitignore" 2>/dev/null; then
                ISSUES+=("INCOMPLETE:.gitignore:Missing target/ pattern (Rust)")
            fi
        fi
        if $HAS_DOTNET; then
            if ! grep -qE "^bin/|^obj/" ".gitignore" 2>/dev/null; then
                ISSUES+=("INCOMPLETE:.gitignore:Missing bin/ or obj/ pattern (.NET)")
            fi
        fi
    fi
fi

# 检查 .dockerignore
if $HAS_DOCKER; then
    if [ ! -f ".dockerignore" ]; then
        ISSUES+=("MISSING:.dockerignore:No .dockerignore found but Dockerfile exists")
    else
        if ! grep -q "node_modules" ".dockerignore" 2>/dev/null && $HAS_NODE; then
            ISSUES+=("INCOMPLETE:.dockerignore:Missing node_modules pattern")
        fi
    fi
fi

# 检查 .eslintignore
if $HAS_ESLINT; then
    if [ -f "eslint.config.*" ]; then
        # 新版 ESLint 使用 config 中的 ignores
        if ! grep -q "ignores" eslint.config.* 2>/dev/null; then
            ISSUES+=("INCOMPLETE:eslint.config.js:Missing ignores configuration")
        fi
    elif [ ! -f ".eslintignore" ]; then
        ISSUES+=("MISSING:.eslintignore:No .eslintignore found but ESLint config exists")
    fi
fi

# 检查 .prettierignore
if $HAS_PRETTIER && [ ! -f ".prettierignore" ]; then
    ISSUES+=("MISSING:.prettierignore:No .prettierignore found but Prettier config exists")
fi

# 检查 .terraformignore
if $HAS_TERRAFORM && [ ! -f ".terraformignore" ]; then
    ISSUES+=("MISSING:.terraformignore:No .terraformignore found but Terraform files exist")
fi

# 输出结果
if [ ${#ISSUES[@]} -eq 0 ]; then
    if $OUTPUT_JSON; then
        echo '{"status":"PASS","issues":[]}'
    else
        echo "✅ Project setup validation passed - all ignore files configured"
    fi
    exit 0
else
    if $OUTPUT_JSON; then
        echo -n '{"status":"FAIL","issues":['
        first=true
        for issue in "${ISSUES[@]}"; do
            IFS=':' read -r type file desc <<< "$issue"
            if ! $first; then echo -n ','; fi
            echo -n '{"type":"'"$type"'","file":"'"$file"'","description":"'"$desc"'"}'
            first=false
        done
        echo ']}'
    else
        echo "❌ Project setup validation failed - ${#ISSUES[@]} issue(s) found:"
        for issue in "${ISSUES[@]}"; do
            IFS=':' read -r type file desc <<< "$issue"
            echo "  - [$type] $file: $desc"
        done
        echo ""
        echo "Suggested fixes:"
        if echo "${ISSUES[@]}" | grep -q "MISSING"; then
            echo "  - Run: specforge doctor --fix-ignore-files"
        fi
    fi
    exit 1
fi
