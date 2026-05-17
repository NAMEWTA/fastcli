# 归档模式与最佳实践

> 本指南补充 release-deploy 命令的归档机制（Step 7）

## 归档的目的

归档不是简单的文件移动，而是项目历史的系统化管理：

1. **区分活跃与已完成变更**：`changes/` 目录只包含进行中的工作
2. **保留完整历史**：归档目录包含变更的所有产物和元数据
3. **支持复盘分析**：归档数据可用于趋势分析和流程改进
4. **避免目录混乱**：不归档会导致 `changes/` 堆满已完成变更

## 归档流程

### Step 1：检查产物完成状态

**目标**：确保变更的所有必需产物已生成

**检查清单**：
- [ ] `proposal.md` — 需求提案
- [ ] `design.md` — 设计文档
- [ ] `tasks.md` — 任务列表
- [ ] `quality-report.md` — 质量报告
- [ ] `.specforge.json` — 元数据

**检查脚本**：

```bash
CHANGE_DIR="specforge/changes/<name>"

REQUIRED_ARTIFACTS=("proposal.md" "design.md" "tasks.md" "quality-report.md" ".specforge.json")
MISSING=()

for artifact in "${REQUIRED_ARTIFACTS[@]}"; do
  if [ ! -f "$CHANGE_DIR/$artifact" ]; then
    MISSING+=("$artifact")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "WARNING: 以下产物缺失："
  for m in "${MISSING[@]}"; do
    echo "  - $m"
  done
  echo ""
  echo "是否继续归档？（未完成产物将永久归档）"
  echo "A) 继续归档"
  echo "B) 取消，先生成缺失产物"
  # 等待用户选择
fi
```

### Step 2：检查任务完成状态

**目标**：了解任务完成情况，提醒未完成任务

**统计脚本**：

```bash
TASKS_FILE="specforge/changes/<name>/tasks.md"

if [ -f "$TASKS_FILE" ]; then
  INCOMPLETE=$(grep -c '\- \[ \]' "$TASKS_FILE" 2>/dev/null || echo "0")
  COMPLETE=$(grep -c '\- \[x\]' "$TASKS_FILE" 2>/dev/null || echo "0")
  TOTAL=$((INCOMPLETE + COMPLETE))
  
  echo "任务完成：$COMPLETE/$TOTAL"
  
  if [ "$INCOMPLETE" -gt 0 ]; then
    echo ""
    echo "WARNING: 有 $INCOMPLETE 个任务未完成"
    echo ""
    echo "未完成任务："
    grep '\- \[ \]' "$TASKS_FILE" | head -10
    echo ""
    echo "是否继续归档？"
    echo "A) 继续归档（未完成任务将永久归档）"
    echo "B) 取消，先完成任务"
    # 等待用户选择
  fi
else
  echo "NO_TASKS_FILE — 跳过任务检查"
fi
```

### Step 3：执行归档

**目标**：将 change 目录移动到归档位置

**归档命名规则**：`YYYY-MM-DD-<change-name>`

**归档脚本**：

```bash
# 创建归档目录
mkdir -p specforge/archive

# 生成归档名
ARCHIVE_DATE=$(date +%Y-%m-%d)
ARCHIVE_NAME="${ARCHIVE_DATE}-<change-name>"

# 检查目标是否已存在
if [ -d "specforge/archive/$ARCHIVE_NAME" ]; then
  echo "ERROR: 归档目标已存在：specforge/archive/$ARCHIVE_NAME"
  echo ""
  echo "可能的原因："
  echo "1. 之前已归档过此变更"
  echo "2. 同一天有多个同名变更"
  echo ""
  echo "建议："
  echo "- 检查 specforge/archive/$ARCHIVE_NAME 的内容"
  echo "- 如果确实需要重新归档，重命名现有归档："
  echo "  mv specforge/archive/$ARCHIVE_NAME specforge/archive/$ARCHIVE_NAME-duplicate"
  echo "- 或使用不同日期"
  exit 1
fi

# 执行归档
echo "归档：specforge/changes/<name> → specforge/archive/$ARCHIVE_NAME"
mv "specforge/changes/<name>" "specforge/archive/$ARCHIVE_NAME"

echo "归档成功"
```

### Step 4：更新元数据

**目标**：记录归档信息，便于后续查询

**更新 `.specforge.json`**：

```bash
ARCHIVE_DIR="specforge/archive/$ARCHIVE_NAME"
METADATA_FILE="$ARCHIVE_DIR/.specforge.json"

if [ -f "$METADATA_FILE" ]; then
  # 使用 jq 更新 JSON
  jq '. + {
    "status": "completed",
    "timestamps": {
      "completedAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    },
    "archive": {
      "location": "'$ARCHIVE_DIR'",
      "archivedAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }' "$METADATA_FILE" > "$METADATA_FILE.tmp" && mv "$METADATA_FILE.tmp" "$METADATA_FILE"
  
  echo "元数据已更新"
else
  echo "WARNING: 未找到 .specforge.json，创建新元数据文件"
  cat > "$METADATA_FILE" <<EOF
{
  "name": "<change-name>",
  "status": "completed",
  "timestamps": {
    "completedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  },
  "archive": {
    "location": "$ARCHIVE_DIR",
    "archivedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF
fi
```

### Step 5：显示归档摘要

**输出格式**：

```markdown
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** specforge/archive/YYYY-MM-DD-<name>/
**Tasks:** $COMPLETE/$TOTAL complete
**Specs:** ✓ Synced to main specs
**Artifacts:** All complete / N incomplete (see warnings above)
```

## 归档 Guardrails（保护规则）

### 规则 1：不阻塞归档

**原则**：归档不应该被未完成的产物或任务阻塞

**实现**：
- 显示警告，但不阻止
- 询问用户确认
- 用户确认后继续

**原因**：
- 有时需要紧急归档（如分支被删除）
- 未完成的产物/任务也应保留历史
- 阻塞归档会导致 changes/ 目录混乱

### 规则 2：保留 .specforge.yaml

**原则**：归档时保留变更目录中的所有文件

**实现**：
- 使用 `mv` 而非 `cp` + `rm`
- 确保隐藏文件（如 `.specforge.yaml`）也被移动

**检查**：

```bash
# 归档后验证
if [ -d "specforge/archive/$ARCHIVE_NAME" ]; then
  echo "归档目录内容："
  ls -la "specforge/archive/$ARCHIVE_NAME"
  
  # 检查关键文件
  if [ -f "specforge/archive/$ARCHIVE_NAME/.specforge.yaml" ]; then
    echo "✓ .specforge.yaml 已保留"
  else
    echo "✗ WARNING: .specforge.yaml 丢失"
  fi
fi
```

### 规则 3：归档名冲突处理

**原则**：归档名冲突时必须明确处理，不可覆盖

**场景**：
- 同一天归档同名变更
- 重复运行归档命令

**处理流程**：

```bash
ARCHIVE_NAME="${ARCHIVE_DATE}-<change-name>"

if [ -d "specforge/archive/$ARCHIVE_NAME" ]; then
  echo "ERROR: 归档冲突"
  echo ""
  echo "已存在的归档："
  ls -la "specforge/archive/$ARCHIVE_NAME"
  echo ""
  echo "选择处理方式："
  echo "A) 重命名现有归档为 ${ARCHIVE_NAME}-old，然后归档新的"
  echo "B) 使用不同日期（手动输入）"
  echo "C) 取消归档"
  
  read -p "选择 [A/B/C]: " choice
  
  case $choice in
    A)
      mv "specforge/archive/$ARCHIVE_NAME" "specforge/archive/${ARCHIVE_NAME}-old"
      echo "现有归档已重命名为 ${ARCHIVE_NAME}-old"
      ;;
    B)
      read -p "输入日期 (YYYY-MM-DD): " custom_date
      ARCHIVE_NAME="${custom_date}-<change-name>"
      ;;
    C)
      echo "归档已取消"
      exit 0
      ;;
    *)
      echo "无效选择"
      exit 1
      ;;
  esac
fi
```

### 规则 4：显示清晰的摘要

**原则**：归档完成后必须显示清晰的摘要

**必须包含**：
- 变更名称
- 使用的 schema
- 归档位置
- 任务完成情况
- 产物完成情况
- 任何警告信息

## 归档目录结构

### 标准结构

```
specforge/archive/YYYY-MM-DD-<name>/
├── proposal.md          # 需求提案
├── design.md            # 设计文档
├── tasks.md             # 任务列表
├── quality-report.md    # 质量报告
├── .specforge.json      # 元数据（含归档信息）
└── artifacts/           # 其他产物（如有）
    └── ...
```

### 元数据格式

```json
{
  "name": "<change-name>",
  "status": "completed",
  "schema": "spec-driven",
  "timestamps": {
    "createdAt": "2026-05-01T10:00:00Z",
    "completedAt": "2026-05-07T15:30:00Z"
  },
  "archive": {
    "location": "specforge/archive/2026-05-07-<name>",
    "archivedAt": "2026-05-07T15:35:00Z"
  },
  "tasks": {
    "total": 15,
    "completed": 15,
    "incomplete": 0
  },
  "artifacts": {
    "proposal": "complete",
    "design": "complete",
    "tasks": "complete",
    "quality-report": "complete"
  }
}
```

## 归档后的操作

### 查询归档

```bash
# 列出所有归档
ls -1 specforge/archive/

# 查找特定变更的归档
ls -d specforge/archive/*<name>*

# 查看归档元数据
cat specforge/archive/YYYY-MM-DD-<name>/.specforge.json | jq .
```

### 归档统计

```bash
# 统计归档数量
ARCHIVE_COUNT=$(ls -1 specforge/archive/ | wc -l | tr -d ' ')
echo "总归档数：$ARCHIVE_COUNT"

# 按月份统计
ls -1 specforge/archive/ | cut -d'-' -f1-2 | sort | uniq -c

# 查看最近的归档
ls -1 specforge/archive/ | tail -5
```

## 常见错误

### E008_archiveExists

**信号**：归档目标已存在

**原因**：
1. 重复运行归档命令
2. 同一天有多个同名变更
3. 之前的归档未正确完成

**修复**：
1. 检查现有归档内容
2. 如果确实需要归档，重命名现有归档
3. 或使用不同日期

### 归档后找不到文件

**信号**：归档成功但找不到文件

**原因**：归档名与预期不同

**修复**：
```bash
# 搜索最近的归档
find specforge/archive/ -name ".specforge.json" -exec grep -l "<name>" {} \;
```

### 元数据未更新

**信号**：归档成功但元数据未更新

**原因**：
1. `.specforge.json` 不存在
2. jq 未安装
3. 权限问题

**修复**：
```bash
# 检查 jq 是否安装
which jq || echo "ERROR: jq 未安装，请安装：brew install jq"

# 手动更新元数据
cat > "specforge/archive/$ARCHIVE_NAME/.specforge.json" <<EOF
{
  "status": "completed",
  "timestamps": {
    "completedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF
```

## 最佳实践

1. **及时归档**：变更完成后立即归档，不要积压
2. **检查完整性**：归档前检查产物和任务完成情况
3. **保留历史**：即使未完成的变更也应归档，保留完整历史
4. **命名一致**：使用统一的归档命名规则
5. **定期清理**：每季度审查归档，删除过时的临时归档
6. **备份归档**：定期备份 specforge/archive/ 目录

## 参考

- SpecForge 目录模型：`.specforge/` vs `specforge/`
- 项目历史管理：归档 vs 删除 vs 保留
