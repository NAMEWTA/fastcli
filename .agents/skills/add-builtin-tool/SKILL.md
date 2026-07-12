---
name: add-builtin-tool
description: 向 fastcli 添加新的内置工具。当用户要求添加新 CLI 工具、新增 builtin、加一个 install 命令、或新增 AI 编程工具时使用。覆盖 npm 工具和 curl/brew 工具的两种路径。
---

向 fastcli 添加内置工具的**登记流程**：在元数据清单中注册，同步测试中的硬编码计数，验证全绿。

## 注册（唯一必须修改的源代码文件）

在 `src/builtin/tools.ts` 的 `BUILTIN_TOOLS` 数组中新增一个 `BuiltinSpec` 条目。

**npm 工具**（提供 `npmPackage`，命令自动生成）：

```typescript
{
  id: '<kebab-id>',              // 全局唯一，与用户工具共用命名空间
  name: '<Display Name>',        // 亦用于 {{name}} 变量替换
  description: '<一句话描述>',
  npmPackage: '<npm-pkg-name>',  // 提供此项则省略 commands
  tags: ['<vendor>', 'coding'],  // 格式：[厂商标识, 'coding'|'tool']
  category: 'coding',            // 'coding' = AI 编程工具，'tool' = 通用开发工具
},
```

**非 npm 工具**（提供 `commands`，省略 `npmPackage`）：

```typescript
{
  id: '<kebab-id>',
  name: '<Display Name>',
  description: '<一句话描述>',
  tags: ['<vendor>', 'coding'],
  category: 'coding',
  commands: {
    install: ['curl -fsSL <url> | bash'],
  },
},
```

- `id` 必须匹配 `^[a-z0-9][a-z0-9-]*$`，不与现有 builtin 的 id 冲突。
- `npmPackage` 的安装/卸载命令由 `src/core/builtin-templates.ts` 的 `buildBuiltinCommands()` 根据 `AppConfig.packageManager` 自动生成 —— volta 产生 `volta install <pkg>@latest`，npm 产生 `npm install -g <pkg>`。**不要在 BuiltinSpec 中硬编码命令。**
- 如需 danger 全权限启动命令，在 `src/core/builtin-templates.ts` 的 `DANGER_COMMANDS` 中新增一条，key 为 `npmPackage` 值。

## 同步测试计数

添加新工具后，三个测试文件的硬编码数字需要更新。每处都必须匹配新总数，**一处不漏**：

### `tests/core/builtin-templates.test.ts`

1. `EXPECTED_NPM_BUILTINS` 数组新增一条 `{ id, npmPackage }` 映射（npm 工具），或 `EXPECTED_CURL_BUILTINS` 新增一条（curl 工具）
2. `'coding 分类包含 N 个工具'` 测试中的 `.toHaveLength(N)` 计数 +1

### `tests/core/registry.test.ts`

搜索所有 `.toHaveLength(N)` 和注释中的数字，逐一更新：
- builtin 总数 9→10（类推）
- coding 分类数 8→9（类推）
- `list()` 测试的 expected id 数组新增 `'<new-id>'`
- tag `'coding'` 过滤结果计数 +1

### `tests/cli/list.test.ts`

- 注释中的 builtin 数量
- `'包含全部 N 个 builtin'` 测试名
- 新增 `expect(r.stdout).toContain('<new-id>')` 断言

## 验证

```bash
pnpm build && pnpm test
```

**完成标准**：`pnpm test` 全部通过（16 个文件，无失败）。构建成功。

## 参考架构

```
src/builtin/tools.ts          ← BuiltinSpec 元数据（你改的文件）
  ↓
src/core/registry.ts          ← buildBuiltinEntries 组装 ToolEntry
  ↓
src/core/builtin-templates.ts ← buildBuiltinCommands 生成命令字符串
  ↓                              DANGER_COMMANDS 可选全权限命令
src/config/schema.ts          ← ToolEntry / ToolCommands 类型定义
```

**依赖规则**：`builtin` → `core` → `config`。builtin 层只放元数据，不放逻辑。
