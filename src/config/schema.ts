/**
 * fastcli 配置层的数据结构、默认值与版本常量。
 *
 * 这一层不依赖任何 I/O，只负责定义类型与默认对象。配置读取（`reader.ts`）、
 * 写入（`writer.ts`）以及上层运行时（`registry.ts`、`resolver.ts` 等）都基于
 * 这里导出的类型进行交互。
 */

/**
 * 当前配置文件 schema 版本。
 *
 * 写在 `config.json` / `tools.json` 的 `version` 字段中，作为字面量类型 `'2'`，
 * 以便 reader 在加载时做精确比较：
 *
 * - 文件含 `version` 但不等于 `SCHEMA_VERSION` 且高于已知值 → 拒绝启动并提示升级
 * - 文件不含 `version` → 视为旧 schema，备份后写入默认值
 */
export const SCHEMA_VERSION = '2' as const;

/**
 * 工具上的命令链集合。
 *
 * - `install` / `update` / `uninstall` 是约定的语义操作，会在 `list` / TUI 中
 *   优先排序展示，但同样是可选的
 * - 通过索引签名允许任意自定义操作名（例如 `docs`、`login` 等）
 * - 所有字段都是 `string[] | undefined`，缺失代表「该操作未配置」
 * - 单条命令也使用单元素数组表示，避免运行时兼容两种形状
 *
 * 注意：在 TypeScript 中显式声明 `install?` 等具名字段并配合 `[op: string]`
 * 索引签名时，三个具名字段的类型必须与索引签名相容（都允许 `undefined`）。
 */
export interface ToolCommands {
  /** 安装命令（可选）。 */
  install?: string[];
  /** 升级命令（可选）。 */
  update?: string[];
  /** 卸载命令(可选)。 */
  uninstall?: string[];
  /** 任意自定义操作名 → 命令链。 */
  [op: string]: string[] | undefined;
}

/**
 * 一个工具条目。
 *
 * `id` 在全局唯一（builtin 与 user 共同命名空间）。当 user 中的 `id` 与
 * builtin 冲突时，registry 会让 user 覆盖 builtin 并打印一次性 warn。
 */
export interface ToolEntry {
  /** 全局唯一 slug，正则 `^[a-z0-9][a-z0-9-]*$`。 */
  id: string;
  /** 显示名，会被 `{{name}}` 变量替换引用。 */
  name: string;
  /** 描述，可选；用于 `list` / `info` 展示。 */
  description?: string;
  /** 标签，可选；用于 `list --tag=<T>` 过滤。 */
  tags?: string[];
  /** 该工具的全部已配置操作。 */
  commands: ToolCommands;
  /** 来源。`builtin` 由二进制内置；`user` 来自 `~/.fastcli/tools.json`。 */
  source: 'builtin' | 'user';
}

/**
 * 全局配置 `~/.fastcli/config.json` 的结构。
 */
export interface AppConfig {
  /** Schema 版本，恒为 `'2'`，便于未来升级时识别。 */
  version: '2';
  /** 用户选择的包管理器，决定内置工具命令模板生成方式。 */
  packageManager: 'volta' | 'npm';
  /** 用户偏好的编辑器；为空字符串时回退到 `$EDITOR` → `vi`。 */
  editor: string;
  /** 执行命令前是否需要 clack 二次确认。 */
  confirmBeforeRun: boolean;
  /** 是否首次运行；首次运行引导会把它置为 `false`。 */
  firstRun: boolean;
  /** 用户界面语言。 */
  language: Language;
}

/**
 * 用户工具条目文件 `~/.fastcli/tools.json` 的结构。
 *
 * 仅承载 `source: 'user'` 的工具；内置工具不写入此文件。
 */
export interface ToolsFile {
  /** Schema 版本，恒为 `'2'`。 */
  version: '2';
  /** 用户工具列表。 */
  tools: ToolEntry[];
}

/**
 * 命令执行结果，由 `core/executor.ts` 返回。
 *
 * - `success`：是否以退出码 0 结束（dry-run 视为成功）
 * - `code`：子进程退出码；dry-run 时为 0
 * - `signal`：若子进程被信号终止则为信号名，否则为 `null` 或 `undefined`
 */
export interface ExecResult {
  /** 是否被视为成功（退出码 0）。 */
  success: boolean;
  /** 子进程退出码；dry-run 为 0。 */
  code: number;
  /** 终止信号，若有。 */
  signal?: NodeJS.Signals | null;
}

/**
 * `config.json` 的默认内容。
 *
 * 在以下场景被写入：
 * - 首次运行引导未启动时（reader 在文件不存在时返回此对象，但不写盘）
 * - reader 检测到旧 schema（合法 JSON 但缺 `version` 字段）后，备份原文件再写入
 *
 * 默认值含义：
 * - `packageManager: 'volta'`：与 PRD §3.5 一致，volta 优先
 * - `confirmBeforeRun: true`：默认开启执行前确认，更安全
 * - `firstRun: true`：让首次运行引导有机会执行
 */
export const DEFAULT_APP_CONFIG: AppConfig = {
  version: SCHEMA_VERSION,
  packageManager: 'volta',
  editor: '',
  confirmBeforeRun: true,
  firstRun: true,
  language: 'en',
};

/**
 * `tools.json` 的默认内容：空工具列表。
 */
export const DEFAULT_TOOLS_FILE: ToolsFile = {
  version: SCHEMA_VERSION,
  tools: [],
};
import type { Language } from '../i18n.js';
