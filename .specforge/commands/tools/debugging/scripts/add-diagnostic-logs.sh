#!/bin/bash
# 自动添加诊断日志到指定函数
# 用法: ./add-diagnostic-logs.sh <文件路径> <函数名>
#
# 适用场景:
# - 多组件系统,需要追踪数据流
# - 不确定问题出现在哪个组件
# - 需要快速添加诊断埋点
#
# 注意事项:
# - 仅适用于 macOS/Linux (使用 sed)
# - Windows 用户需要手动添加诊断日志
# - 调试完成后记得移除日志

set -e

FILE=$1
FUNC=$2

if [ -z "$FILE" ] || [ -z "$FUNC" ]; then
  echo "用法: $0 <文件路径> <函数名>"
  echo ""
  echo "示例:"
  echo "  $0 src/services/api.ts fetchData"
  echo "  $0 src/controllers/user.ts getUserProfile"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "错误: 文件不存在: $FILE"
  exit 1
fi

# 在函数入口添加日志
DIAGNOSTIC_CODE="  console.error('DEBUG ${FUNC}:', { input: arguments[0], cwd: process.cwd(), timestamp: new Date().toISOString() });"

# 检测函数定义格式并添加日志
if grep -q "async function ${FUNC}" "$FILE"; then
  sed -i '' "/async function ${FUNC}/a\\
${DIAGNOSTIC_CODE}" "$FILE"
  echo "✓ 已为 async function ${FUNC} 添加诊断日志"
elif grep -q "function ${FUNC}" "$FILE"; then
  sed -i '' "/function ${FUNC}/a\\
${DIAGNOSTIC_CODE}" "$FILE"
  echo "✓ 已为 function ${FUNC} 添加诊断日志"
elif grep -q "const ${FUNC} = " "$FILE"; then
  sed -i '' "/const ${FUNC} = /a\\
${DIAGNOSTIC_CODE}" "$FILE"
  echo "✓ 已为 const ${FUNC} 添加诊断日志"
else
  echo "警告: 未找到函数定义: ${FUNC}"
  echo "请检查函数名称是否正确,或手动添加诊断日志"
  exit 1
fi

echo ""
echo "查看日志:"
echo "  npm run dev 2>&1 | grep 'DEBUG ${FUNC}'"
echo ""
echo "调试完成后请移除诊断日志!"
