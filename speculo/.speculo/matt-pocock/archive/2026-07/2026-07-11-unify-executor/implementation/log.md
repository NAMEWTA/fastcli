# 实现日志 — 统一 Executor

## 变更概要

| 文件 | 变更 | +/- |
|------|------|-----|
| `src/core/executor.ts` | 提取 spawnOnce + 统一 executeCommandChain + 移除 executeCommand | +89 / -145 |
| `tests/core/executor.test.ts` | 两层重组：spawnOnce 层（通过 n=1 路径）+ executeChain 层（保留 + 新增 n=1 覆盖） | +99 / -49 |
| `src/cli/commands/run.ts` | 注释修正 | +1 / -1 |
| `src/cli/menu.ts` | 注释修正 | +1 / -1 |

## 验证结果

- **类型检查**: 预存错误 13 个（reader.ts 8 + server.ts 5），与本次变更无关
- **测试**: 16/16 文件通过，162/162 测试通过，零回归
- **构建**: `tsup` + `vite build` 均成功

## 实现要点

1. `spawnOnce(command, spawnImpl, language)` — 私有原语，~50 行，唯一调用 `spawnImpl(file, args, { stdio: 'inherit' })`
2. `executeCommandChain` — 唯���公共入口，按 n=0/n=1/n>1 分支，n=1 无 trap 开销
3. `executeCommand` — 已移除（无外部调用方）
4. 测试通过 n=1 路径间接覆盖 spawnOnce 行为（私有函数不直接导入测试）
