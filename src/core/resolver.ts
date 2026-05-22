/**
 * 命令解析器：在工具上查找操作、做变量替换，或在操作未配置时给出诊断信息。
 *
 * 这一层是 `cli/run` 与 TUI 主菜单的共同前置步骤，统一了「命令字符串如何
 * 从 {@link ToolEntry} 上得到」的语义。它不直接面向用户，也不写盘；只做
 * 一次纯函数式的查找与字符串替换，便于属性测试覆盖（详见 design.md
 * §Correctness Properties / Property 4）。
 *
 * 设计要点：
 *
 * - **未配置 vs 空字符串**：仅当 `tool.commands[op] === undefined` 时视为
 *   「未配置」，返回 `unconfigured` 分支；空字符串属于用户的显式选择，
 *   会走正常替换路径（虽然实际上没有可执行的内容）。这保持了与 Property 4
 *   一致的语义边界。
 * - **`availableOps` 的语义**：与 Requirement 2.3 保持一致——列出所有
 *   *已配置* 的操作（`tool.commands[k] !== undefined`），按字母序排序，
 *   方便上层直接拼成 `A, B, C` 形式的提示。
 * - **变量替换边界**：仅替换两个白名单占位符（`{{name}}` / `{{version}}`），
 *   绝不使用 `\{\{(\w+)\}\}` 这样的全局正则。否则未知占位符会被吞掉，
 *   破坏 Requirement 2.5 的「未知占位符保持字面量」要求。
 * - **`{{version}}` 缺省语义**：当 `ctx.version` 为 `undefined` 时不做替换，
 *   占位符在输出中保持字面量。是否在执行前向用户索取版本号，由调用方
 *   （`cli/commands/run.ts` 在任务 4.4 中实现）按 TTY / 非 TTY 与 `--version`
 *   的存在性自行决定。
 *
 * Validates: Requirements 2.2, 2.3, 2.5
 */

import type { ToolEntry } from '../config/schema.js';

/**
 * 命令解析时的运行时上下文。
 *
 * 当前只有 `version` 一个字段；如果将来需要扩展更多变量（设计文档暂未约定），
 * 请同步在 {@link substituteVariables} 中加入对应的白名单分支，并更新
 * Requirement 2.5。
 */
export interface ResolveContext {
  /** 用户在运行时输入或通过 `--version` 透传的版本号；用于替换 `{{version}}`。 */
  version?: string;
}

/**
 * 解析结果。
 *
 * 使用判别联合（`kind` 字段）让上层可以用 `switch` / `if` 精确分流，
 * 避免对 `command` / `availableOps` 的 nullable 取舍。
 *
 * - `ok`：操作存在，命令字符串已完成变量替换，可直接交给 executor
 * - `unconfigured`：操作不存在，附上按字母序排序的已配置操作列表，
 *   供上层组装「该工具已配置的操作：A, B, C」类提示
 */
export type ResolveResult =
  | { kind: 'ok'; commands: string[] }
  | { kind: 'unconfigured'; availableOps: string[] };

/**
 * 列出工具上「已配置」的操作名（值不为 `undefined`），按字母序排序。
 *
 * 注意 `tool.commands` 通过索引签名允许任意键，所以 `Object.keys` 的结果
 * 可能包含值为 `undefined` 的键（例如 `{ install: 'foo', update: undefined }`
 * 这样的中间状态）。这里显式过滤掉 `undefined` 值的键，保证返回结果与
 * Property 4 描述一致。
 */
function listAvailableOps(tool: ToolEntry): string[] {
  return Object.keys(tool.commands)
    .filter((key) => tool.commands[key] !== undefined)
    .sort();
}

/**
 * 在命令字符串中执行白名单变量替换。
 *
 * - `{{name}}` 总是被替换为 `tool.name`
 * - `{{version}}` 仅在 `ctx.version` 为字符串（包括空字符串）时才替换；
 *   `undefined` 时保持字面量，让调用方决定是否要在执行前索取版本号
 * - 其他形如 `{{xxx}}` 的占位符不做处理，原样保留
 *
 * 实现上使用 `String.prototype.replaceAll` 的字符串重载（不是正则），避免
 * 任何对未知占位符的副作用。
 */
export function substituteVariables(
  command: string,
  tool: ToolEntry,
  ctx: ResolveContext | undefined,
): string {
  let result = command.replaceAll('{{name}}', tool.name);
  if (ctx?.version !== undefined) {
    result = result.replaceAll('{{version}}', ctx.version);
  }
  return result;
}

/**
 * 在指定工具上解析某个操作，返回可执行命令或诊断信息。
 *
 * 流程：
 *
 * 1. 取 `tool.commands[op]`；若为 `undefined` → 返回 `unconfigured` 分支，
 *    `availableOps` 为按字母序排序的所有「已配置」操作名
 * 2. 否则做变量替换：
 *    - `{{name}}` → `tool.name`
 *    - `{{version}}` → `ctx.version`（若提供）
 *    - 未知占位符保持字面量
 * 3. 返回 `{ kind: 'ok', command }`
 *
 * 这是一个纯函数：相同输入永远得到相同输出，没有 I/O，便于在 vitest 中
 * 用属性测试覆盖大量随机输入（任务 3.7 / Property 4）。
 *
 * @param tool  目标工具条目，由 {@link Registry.findById} 返回
 * @param op    用户请求的操作名（例如 `install`、`docs`）
 * @param ctx   可选的运行时上下文，目前仅支持 `version`
 *
 * @example
 *   resolveCommand(claude, 'install');
 *   // → { kind: 'ok', command: 'volta install @anthropic-ai/claude-code' }
 *
 *   resolveCommand(claude, 'login');
 *   // → { kind: 'unconfigured', availableOps: ['install', 'uninstall', 'update'] }
 *
 *   resolveCommand(aider, 'install', { version: '0.50.0' });
 *   // 会把 install 字符串里的 {{version}} 替换为 '0.50.0'，未知占位符保留
 */
export function resolveCommand(
  tool: ToolEntry,
  op: string,
  ctx?: ResolveContext,
): ResolveResult {
  const templates = tool.commands[op];

  if (templates === undefined) {
    return {
      kind: 'unconfigured',
      availableOps: listAvailableOps(tool),
    };
  }

  return {
    kind: 'ok',
    commands: templates.map((template) => substituteVariables(template, tool, ctx)),
  };
}
