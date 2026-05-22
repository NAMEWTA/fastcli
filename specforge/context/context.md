# 项目规则（Rules）

> 本文件是项目级常驻知识的 **rules 层**，记录技术栈、命名约定、既有抽象索引、禁动清单与代码风格要点。
> 由 `specforge init` 首建；后续由 `evolution-retrospect` promote DESIGN § 9 条目更新。
> AI 代理在 `implementation-build` 阶段 grep 本文件以对齐项目约定。

---

## 技术栈

| 类别 | 技术 | 版本约束 | 备注 |
|------|------|---------|------|
| 语言 | TypeScript | 6.x | strict 模式启用 |
| 运行时 | Node.js | >=18 | CLI 与 Web API 共用 |
| 框架 | Express | 5.x | 本地 Web API 服务 |
| 构建工具 | tsup / Vite | tsup 8.x / Vite 6.x | 分别用于 CLI 与 Web |
| 包管理器 | pnpm | 10.x | workspace 管理 |
| 测试框架 | Vitest | 4.x | 覆盖 core/config/cli/web-server |

---

## 命名约定

| 范围 | 约定 | 示例 |
|------|------|------|
| 文件名 | kebab-case，按领域分层 | `operation-editor.ts` |
| 变量 / 函数 | camelCase | `loadAppConfig`, `resolveCommand` |
| 类 / 接口 | PascalCase，接口语义化 | `ConfigCorruptError`, `ToolEntry` |
| 常量 | UPPER_SNAKE_CASE | `SCHEMA_VERSION`, `DEFAULT_APP_CONFIG` |
| CSS 类名 | Tailwind 工具类组合 | `border-zinc-300`, `focus:border-emerald-600` |
| 数据库表 / 列 | 不适用 | 本项目无数据库 |
| API 路径 | `/api/<resource>`，本地服务 | `/api/tools/:id`, `/api/config` |

---

## 既有抽象索引

| 抽象名称 | 所在路径 | 职责简述 | 使用场景 |
|----------|---------|---------|---------|
| Registry | `src/core/registry.ts` | 合并 builtin 与 user 工具并处理覆盖关系 | `list`, `info`, `run`, Web API |
| Resolver | `src/core/resolver.ts` | 将工具 operation 解析为命令链并替换变量 | CLI run / Web preview |
| Executor | `src/core/executor.ts` | 顺序执行命令链并返回结构化结果 | 运行 operation、dry-run 输出 |
| Config Reader/Writer | `src/config/reader.ts`, `src/config/writer.ts` | 配置迁移、校验、原子写入与权限控制 | 启动时加载、编辑后保存 |
| I18n Dictionary | `src/i18n.ts`, `packages/web/src/i18n.ts` | 管理 en/zh-CN 文案与参数替换 | CLI 提示、Web UI 文案 |

---

## 禁动清单

| 禁止项 | 原因 | 替代方案 |
|--------|------|---------|
| 省略相对 import 的 `.js` 后缀 | ESM 运行时会出现模块解析失败 | 统一使用 `./x.js` 形式 |
| 修改 schema 版本为非 `2` | 会破坏配置迁移与兼容约束 | 保持 `version: "2"`，新增字段走迁移逻辑 |
| 让 Web 服务绑定非回环地址 | 增加暴露面，违反本地编辑器安全约束 | 仅绑定 `127.0.0.1` |
| 在 release workflow 先测后构建 | clean checkout 的 CLI 集成测试依赖 dist 产物 | 先 `pnpm build` 再 `pnpm test` |

---

## Code-Style 要点

| 要点 | 说明 | 示例 |
|------|------|------|
| 注释优先解释约束而非逐行翻译 | 复杂迁移逻辑、边界条件需要背景说明 | `reader.ts` 中版本迁移段落注释 |
| 错误消息可国际化 | CLI 与 API 输出统一走 i18n 字典 | `t('run.unconfigured', ...)` |
| 命令参数显式命名 | CLI 参数约束与帮助信息保持一致 | `--source`, `--tag`, `--dry-run` |
| 配置写入保持原子性 | 防止中断导致配置损坏 | 先写 `.tmp` 再 `rename` |
