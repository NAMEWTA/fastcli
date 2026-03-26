# fastcli Web 管理后台（v1）实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 fastcli 增加 fastcli web 命令，在本机启动受一次性口令保护的 Web 管理后台，支持配置总览、编辑、严格校验、导入覆盖、导出与保存落盘。

**架构：** CLI 启动本地 Node HTTP 服务并托管静态 React 构建产物，后端提供本地 API 处理配置读写与校验。前端维护 working copy、dirty state 与 validation state，保存时走严格门禁（有错误即阻断）。

**技术栈：** TypeScript, commander, Node.js http/fs, React, esbuild, vitest

---

## 范围与拆分说明

该规格包含“CLI 启动 + 本地 API + 前端后台”三部分，但三者在运行期强耦合（同一命令启动、同一工作态、同一保存门禁）。本计划保持单计划实现，按任务边界拆分为可独立提交的小增量。

---

## 文件结构（本次改动）

- 修改：`package.json`
  - 新增 web 相关依赖与构建脚本（React 打包、静态资源拷贝、总构建串联）。
- 修改：`src/index.ts`
  - 注册 `web` 命令入口。
- 创建：`src/commands/web/index.ts`
  - 导出 `webStart` 命令。
- 创建：`src/commands/web/start.ts`
  - 命令处理：启动服务、打印 URL/口令、自动打开浏览器。
- 创建：`src/core/web/types.ts`
  - 后端 Web 层类型：会话、API 响应、校验错误对象。
- 创建：`src/core/web/token-session.ts`
  - 一次性口令生成与验证、会话生命周期管理。
- 创建：`src/core/web/config-working-copy.ts`
  - working copy 读取、更新、导入覆盖、导出、严格保存门禁。
- 创建：`src/core/web/api-server.ts`
  - 本地 API 路由与静态资源托管；统一鉴权中间层。
- 创建：`src/web-admin/index.html`
  - 管理后台 HTML 宿主。
- 创建：`src/web-admin/main.tsx`
  - React 启动入口。
- 创建：`src/web-admin/App.tsx`
  - 路由/页面容器（登录页 + 三段式后台）。
- 创建：`src/web-admin/styles.css`
  - 后台样式（桌面优先 + 响应式）。
- 创建：`src/web-admin/components/LoginPage.tsx`
  - 口令输入与鉴权提交。
- 创建：`src/web-admin/components/AdminShell.tsx`
  - 顶部/左侧/主区三段式框架。
- 创建：`src/web-admin/components/OverviewCards.tsx`
  - aliases/providers/credentials/workflows 总览卡片与最近更新时间。
- 创建：`src/web-admin/components/ModuleList.tsx`
  - 四类配置列表区（仅已有条目）。
- 创建：`src/web-admin/components/EditDrawer.tsx`
  - 右侧抽屉编辑，表单/JSON 双模式切换与校验触发。
- 创建：`src/web-admin/lib/api.ts`
  - 前端 API 客户端封装。
- 创建：`src/web-admin/lib/state.ts`
  - working copy、dirty、validation、lastUpdated 状态管理。
- 创建：`scripts/build-web-admin.mjs`
  - 使用 esbuild 打包前端并产出到 `dist/web-admin`。
- 创建：`tests/commands/web/start.test.ts`
  - 命令层：启动时日志、token 打印、open 调用。
- 创建：`tests/core/web/token-session.test.ts`
  - 口令会话校验与过期行为。
- 创建：`tests/core/web/config-working-copy.test.ts`
  - 导入覆盖、严格校验门禁、保存落盘行为。
- 创建：`tests/core/web/api-server.test.ts`
  - API 集成测试（auth、config、validate、save、import、export）。
- 创建：`tests/web-admin/state.test.ts`
  - 前端状态机（dirty/validation/lastUpdated）单测。
- 修改：`README.md`
  - 增加 `fastcli web` 使用说明（URL/口令/能力范围）。

参考规格：`docs/superpowers/specs/2026-03-26-fastcli-web-admin-design.md`

---

### 任务 1：搭建 web 命令骨架与启动流程

**文件：**
- 修改：`src/index.ts`
- 创建：`src/commands/web/index.ts`
- 创建：`src/commands/web/start.ts`
- 测试：`tests/commands/web/start.test.ts`

- [ ] **步骤 1：先写失败测试（命令可见性与启动输出）**

在 `tests/commands/web/start.test.ts` 编写：
- 调用 `webStart()` 后会打印访问 URL 与一次性口令。
- 会尝试调用浏览器打开函数。
- 启动失败时输出错误并返回非崩溃路径。

示例断言：

```ts
expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('http://127.0.0.1:'));
expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('一次性口令'));
expect(openBrowserSpy).toHaveBeenCalledTimes(1);
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test -- tests/commands/web/start.test.ts`
预期：FAIL（web 命令未实现）

- [ ] **步骤 3：实现最小命令骨架**

在 `src/index.ts` 注册：

```ts
import { webStart } from './commands/web/index.js';
program.command('web').description('启动本地 Web 管理后台').action(webStart);
```

在 `src/commands/web/start.ts` 实现最小流程：
- 启动服务器（先返回 URL/token 占位）
- logger 输出 URL/token
- 调用浏览器打开函数

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test -- tests/commands/web/start.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

运行：
```bash
git add src/index.ts src/commands/web/index.ts src/commands/web/start.ts tests/commands/web/start.test.ts
git commit -m "feat(web): 增加 fastcli web 命令骨架"
```

---

### 任务 2：实现一次性口令与会话校验

**文件：**
- 创建：`src/core/web/types.ts`
- 创建：`src/core/web/token-session.ts`
- 测试：`tests/core/web/token-session.test.ts`

- [ ] **步骤 1：编写失败测试（one-time token）**

在 `tests/core/web/token-session.test.ts` 覆盖：
- 启动生成 token（长度、字符集可预测规则）
- 首次验证成功并建立会话
- token 不能重复使用
- 错误 token 验证失败

示例断言：

```ts
expect(verifyToken(token)).toEqual({ ok: true, sessionId: expect.any(String) });
expect(verifyToken(token).ok).toBe(false);
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test -- tests/core/web/token-session.test.ts`
预期：FAIL（模块不存在）

- [ ] **步骤 3：实现最小会话管理器**

在 `src/core/web/token-session.ts` 实现：

```ts
export interface WebSessionManager {
  issueOneTimeToken(): string;
  verifyOneTimeToken(token: string): { ok: true; sessionId: string } | { ok: false; reason: string };
  isSessionValid(sessionId: string | undefined): boolean;
}
```

实现要求：
- token 验证成功后立即失效
- 会话仅保存在内存
- 无远程访问能力（仅本地服务使用）

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test -- tests/core/web/token-session.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

运行：
```bash
git add src/core/web/types.ts src/core/web/token-session.ts tests/core/web/token-session.test.ts
git commit -m "feat(web): 增加一次性口令与本地会话管理"
```

---

### 任务 3：实现 working copy 与严格保存门禁

**文件：**
- 创建：`src/core/web/config-working-copy.ts`
- 修改：`src/core/config-manager.ts`
- 测试：`tests/core/web/config-working-copy.test.ts`

- [ ] **步骤 1：编写失败测试（working copy 生命周期）**

在 `tests/core/web/config-working-copy.test.ts` 覆盖：
- 初始化读取 `~/.fastcli/config.json` 进入 working copy
- 配置文件不存在或 JSON 损坏时，返回明确错误与修复建议
- 修改字段后 `dirty=true`
- `validate` 返回结构化错误列表
- `save` 在有错误时被阻断
- `save` 遇到 IO/权限错误时，working copy 与 dirty 状态保持不丢失
- `import` 全量覆盖当前 working copy

示例断言：

```ts
expect(store.getState().dirty).toBe(true);
expect(result.valid).toBe(false);
expect(() => store.save()).toThrow(/校验失败/);
expect(store.getState().workingCopy).toEqual(beforeSave);
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test -- tests/core/web/config-working-copy.test.ts`
预期：FAIL

- [ ] **步骤 3：实现最小 working copy store**

在 `src/core/web/config-working-copy.ts` 实现：

```ts
export interface ConfigWorkingCopyStore {
  getConfig(): Config;
  patchConfig(next: Config): void;
  validate(): ValidationResult;
  save(): void;
  importFromJson(raw: string): ValidationResult;
  exportToJson(): string;
}
```

并在 `save()` 内强制执行：
- 先 `validateConfig`
- 仅当 `valid=true` 才调用 `saveConfig`

- [ ] **步骤 4：补强 config 校验返回（字段定位）**

在 `src/core/config-manager.ts` 为 Web 场景补充可定位错误文本（包含模块和键名），保持现有 CLI 行为兼容。

- [ ] **步骤 5：补充配置缺失/损坏与保存失败错误映射**

在 `src/core/web/config-working-copy.ts` 增加错误分类：
- 配置文件不存在：错误消息包含“请先运行 fastcli config init”
- 配置文件损坏：错误消息包含“配置文件格式错误”与修复建议
- 保存 IO/权限失败：返回失败结果，但不重置 working copy/dirty

- [ ] **步骤 6：运行测试验证通过**

运行：`pnpm test -- tests/core/web/config-working-copy.test.ts`
预期：PASS

- [ ] **步骤 7：Commit**

运行：
```bash
git add src/core/web/config-working-copy.ts src/core/config-manager.ts tests/core/web/config-working-copy.test.ts
git commit -m "feat(web): 实现 working copy 与严格保存门禁"
```

---

### 任务 4：实现本地 API（config/validate/save/import/export/auth）

**文件：**
- 创建：`src/core/web/api-server.ts`
- 测试：`tests/core/web/api-server.test.ts`

- [ ] **步骤 1：编写失败测试（API 契约）**

在 `tests/core/web/api-server.test.ts` 覆盖：
- `GET /api/config` 返回 working copy
- 配置缺失/损坏时 `GET /api/config` 返回可读错误与修复提示
- `POST /api/auth/verify` 成功后可访问写入类接口
- 无会话访问 `POST /api/save` 返回 401
- `POST /api/validate` 返回统一错误列表
- `POST /api/import` 覆盖后触发校验
- `POST /api/save` 在 IO/权限错误时返回失败，且后续 `GET /api/config` 仍可读取原 working copy
- `GET /api/export` 下载 JSON

示例断言：

```ts
expect(response.statusCode).toBe(401);
expect(body.errors).toEqual(expect.any(Array));
expect(exportRes.headers['content-type']).toContain('application/json');
expect(body.message).toContain('请先运行 fastcli config init');
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test -- tests/core/web/api-server.test.ts`
预期：FAIL

- [ ] **步骤 3：实现最小 API 服务**

在 `src/core/web/api-server.ts` 实现：

```ts
export interface StartWebServerResult {
  url: string;
  token: string;
  close: () => Promise<void>;
}

export async function startWebAdminServer(options?: { host?: string; port?: number }): Promise<StartWebServerResult>
```

路由要求：
- `GET /api/config`
- `POST /api/validate`
- `POST /api/save`
- `POST /api/import`
- `GET /api/export`
- `POST /api/auth/verify`

鉴权要求：
- 写入类接口（save/import）必须校验 session
- 认证失败返回明确错误信息

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm test -- tests/core/web/api-server.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

运行：
```bash
git add src/core/web/api-server.ts tests/core/web/api-server.test.ts
git commit -m "feat(web): 增加本地 API 与鉴权门禁"
```

---

### 任务 5：接入静态资源托管与前端构建管线

**文件：**
- 修改：`package.json`
- 创建：`scripts/build-web-admin.mjs`
- 创建：`src/web-admin/index.html`
- 创建：`src/web-admin/main.tsx`
- 创建：`src/web-admin/App.tsx`
- 创建：`src/web-admin/styles.css`
- 修改：`src/core/web/api-server.ts`

- [ ] **步骤 1：编写失败测试（静态资源可达）**

在 `tests/core/web/api-server.test.ts` 增加：访问 `/` 返回 HTML，访问 `/assets/app.js` 返回前端脚本。

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test -- tests/core/web/api-server.test.ts`
预期：FAIL（尚未托管静态资源）

- [ ] **步骤 3：配置前端构建脚本与依赖**

在 `package.json` 增加依赖：
- `react`, `react-dom`
- `esbuild`
- 类型：`@types/react`, `@types/react-dom`

新增脚本：

```json
{
  "scripts": {
    "build:web-admin": "node scripts/build-web-admin.mjs",
    "build": "pnpm run build:web-admin && tsup"
  }
}
```

- [ ] **步骤 4：安装依赖并更新锁文件**

运行：`pnpm install`
预期：
- `pnpm-lock.yaml` 更新
- 本地可执行 `pnpm run build:web-admin`

- [ ] **步骤 5：实现最小 React 壳和打包脚本**

`src/web-admin/App.tsx` 先返回最小可见页面：

```tsx
export function App() {
  return <div>fastcli web admin</div>;
}
```

`scripts/build-web-admin.mjs` 使用 esbuild 输出到 `dist/web-admin`。

- [ ] **步骤 6：更新 API 服务静态托管**

`src/core/web/api-server.ts` 增加：
- `GET /` -> `dist/web-admin/index.html`
- `/assets/*` -> 对应静态文件

- [ ] **步骤 7：运行测试验证通过**

运行：
- `pnpm run build:web-admin`
- `pnpm test -- tests/core/web/api-server.test.ts`

预期：PASS

- [ ] **步骤 8：Commit**

运行：
```bash
git add package.json pnpm-lock.yaml scripts/build-web-admin.mjs src/web-admin src/core/web/api-server.ts tests/core/web/api-server.test.ts
git commit -m "build(web): 增加 web-admin 构建与静态托管"
```

---

### 任务 6：实现登录页与后台三段式骨架

**文件：**
- 创建：`src/web-admin/components/LoginPage.tsx`
- 创建：`src/web-admin/components/AdminShell.tsx`
- 修改：`src/web-admin/App.tsx`
- 修改：`src/web-admin/styles.css`
- 创建：`src/web-admin/lib/api.ts`

- [ ] **步骤 1：编写失败测试（登录态切换）**

创建 `tests/web-admin/state.test.ts`（先只测状态与 API 调用，不做 DOM 测试）：
- 未认证状态显示 login 模式
- 验证成功后进入 admin 模式
- 验证失败保留登录页并记录错误

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test -- tests/web-admin/state.test.ts`
预期：FAIL

- [ ] **步骤 3：实现前端 API 客户端**

在 `src/web-admin/lib/api.ts` 实现：

```ts
export async function verifyToken(token: string): Promise<{ ok: boolean; message?: string }>;
export async function fetchConfig(): Promise<Config>;
```

- [ ] **步骤 4：实现页面骨架**

`App.tsx` 实现：
- 默认展示 `LoginPage`
- 登录成功后渲染 `AdminShell`

`AdminShell.tsx` 必须包含：
- 顶部导航（保存全部/导入/导出按钮占位）
- 左侧导航（任务分组 + 类型分组）
- 中间主区域占位

- [ ] **步骤 5：运行测试验证通过**

运行：`pnpm test -- tests/web-admin/state.test.ts`
预期：PASS

- [ ] **步骤 6：Commit**

运行：
```bash
git add src/web-admin/App.tsx src/web-admin/components/LoginPage.tsx src/web-admin/components/AdminShell.tsx src/web-admin/lib/api.ts src/web-admin/styles.css tests/web-admin/state.test.ts
git commit -m "feat(web-ui): 登录页与后台三段式框架"
```

---

### 任务 7：实现总览页与模块列表+抽屉编辑（表单/JSON）

**文件：**
- 创建：`src/web-admin/components/OverviewCards.tsx`
- 创建：`src/web-admin/components/ModuleList.tsx`
- 创建：`src/web-admin/components/EditDrawer.tsx`
- 创建：`src/web-admin/lib/state.ts`
- 修改：`src/web-admin/App.tsx`
- 测试：`tests/web-admin/state.test.ts`

- [ ] **步骤 1：编写失败测试（状态流）**

在 `tests/web-admin/state.test.ts` 增加：
- 更新任一字段后 dirty=true
- 每个模块最近更新时间独立维护
- JSON 模式校验返回统一错误列表
- 有错误时 `saveAll` 被阻断

示例断言：

```ts
expect(state.dirty).toBe(true);
expect(state.validation.errors.length).toBeGreaterThan(0);
await expect(saveAll()).rejects.toThrow(/校验失败/);
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test -- tests/web-admin/state.test.ts`
预期：FAIL

- [ ] **步骤 3：实现前端状态管理**

在 `src/web-admin/lib/state.ts` 实现：

```ts
export interface AdminState {
  workingCopy: Config;
  dirty: boolean;
  validation: { valid: boolean; errors: string[] };
  lastUpdated: Record<'aliases' | 'providers' | 'credentials' | 'workflows', string | null>;
}
```

并提供 `updateField`、`runValidation`、`saveAll`、`importAll`、`exportAll`。

- [ ] **步骤 4：实现 UI 组件**

- `OverviewCards`：展示四类数量 + 最近更新时间
- `ModuleList`：仅展示已有条目列表
- `EditDrawer`：表单模式与 JSON 模式切换，JSON 模式支持点击“校验”并展示统一错误列表

- [ ] **步骤 5：运行测试验证通过**

运行：`pnpm test -- tests/web-admin/state.test.ts`
预期：PASS

- [ ] **步骤 6：Commit**

运行：
```bash
git add src/web-admin/components/OverviewCards.tsx src/web-admin/components/ModuleList.tsx src/web-admin/components/EditDrawer.tsx src/web-admin/lib/state.ts src/web-admin/App.tsx tests/web-admin/state.test.ts
git commit -m "feat(web-ui): 总览与抽屉双模式编辑"
```

---

### 任务 8：实现保存/导入/导出主操作与导入二次确认

**文件：**
- 修改：`src/web-admin/components/AdminShell.tsx`
- 修改：`src/web-admin/lib/state.ts`
- 修改：`src/web-admin/lib/api.ts`
- 测试：`tests/web-admin/state.test.ts`
- 测试：`tests/core/web/api-server.test.ts`

- [ ] **步骤 1：编写失败测试（主操作）**

增加测试覆盖：
- 点击保存全部前先做校验，错误时阻断并提示
- 点击保存全部若遇到 IO/权限错误，前端 dirty 仍为 true 且编辑内容保持
- 导入时必须先经过二次确认
- 导入后工作态被全量覆盖
- 导出返回当前工作态 JSON

- [ ] **步骤 2：运行测试确认失败**

运行：
- `pnpm test -- tests/web-admin/state.test.ts`
- `pnpm test -- tests/core/web/api-server.test.ts`

预期：FAIL

- [ ] **步骤 3：实现主操作行为**

在 `AdminShell` 顶栏按钮落地：
- 保存全部 -> `saveAll`
- 导入 -> 文件选择 + 普通确认弹窗 + `importAll`
- 导出 -> 触发下载

严格规则：
- 任意校验错误时，保存全部不可成功
- 导入采用全量覆盖，不做局部 merge

- [ ] **步骤 4：运行测试验证通过**

运行：
- `pnpm test -- tests/web-admin/state.test.ts`
- `pnpm test -- tests/core/web/api-server.test.ts`

预期：PASS

- [ ] **步骤 5：Commit**

运行：
```bash
git add src/web-admin/components/AdminShell.tsx src/web-admin/lib/state.ts src/web-admin/lib/api.ts tests/web-admin/state.test.ts tests/core/web/api-server.test.ts
git commit -m "feat(web-ui): 保存导入导出与覆盖确认"
```

---

### 任务 9：收尾文档、回归验证与发布前检查

**文件：**
- 修改：`README.md`
- 测试：`tests/commands/web/start.test.ts`
- 测试：`tests/core/web/token-session.test.ts`
- 测试：`tests/core/web/config-working-copy.test.ts`
- 测试：`tests/core/web/api-server.test.ts`
- 测试：`tests/web-admin/state.test.ts`

- [ ] **步骤 1：补 README 使用说明**

新增：
- `fastcli web` 启动方式
- URL 与一次性口令说明
- v1 能力范围（仅编辑已有条目，不支持新增/删除）

- [ ] **步骤 2：运行单项测试回归**

运行：
- `pnpm test -- tests/commands/web/start.test.ts`
- `pnpm test -- tests/core/web/token-session.test.ts`
- `pnpm test -- tests/core/web/config-working-copy.test.ts`
- `pnpm test -- tests/core/web/api-server.test.ts`
- `pnpm test -- tests/web-admin/state.test.ts`

预期：全部 PASS

- [ ] **步骤 3：运行全量测试与构建验证**

运行：
- `pnpm test`
- `pnpm run build`

预期：
- 测试全绿
- `dist/index.js` 与 `dist/web-admin` 构建成功

- [ ] **步骤 4：手动验收（对照规格）**

运行：`fastcli web`
验证：
- 自动打开浏览器
- 终端打印 URL 与一次性口令
- 未登录不可进入后台
- 保存门禁、导入覆盖确认、导出下载行为符合规格
- 删除或重命名配置文件后启动，确认提示“请先运行 fastcli config init”且系统不崩溃
- 将配置文件改为只读后触发保存，确认提示权限错误且页面工作态不丢失
- 使用损坏 JSON 配置启动，确认提示“配置文件格式错误”并给出修复建议

- [ ] **步骤 5：Commit**

运行：
```bash
git add README.md
git commit -m "docs(web): 补充 fastcli web 使用与验收说明"
```

---

## 计划执行注意事项

- 遵循 DRY/YAGNI：
  - v1 不实现新增/删除条目。
  - 前端状态仅围绕工作态编辑，不引入复杂状态管理库。
- 保持向后兼容：
  - 现有 `fastcli <name>`、`config`、`alias`、`workflow` 命令行为不能回归。
- 本地安全边界：
  - 默认仅绑定 `127.0.0.1`。
  - 会话仅内存驻留，进程结束即失效。

## 交接指令（执行阶段）

- 推荐按任务顺序执行，每完成 1 个任务立即运行该任务的最小测试并提交。
- 每个任务完成后可用 `git show --stat -1` 自检改动范围是否越界。
