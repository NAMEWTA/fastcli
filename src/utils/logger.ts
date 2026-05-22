/**
 * 统一日志输出封装。
 *
 * 该模块仅做两件事：
 *
 * 1. 把 `@clack/prompts` 的 `log.info / log.success / log.warn / log.error`
 *    包装成内部 `logger` 对象，统一中文前缀和换行风格，避免上层零散调用。
 * 2. 暴露一个 `logger.preview(command)`，用于「将执行：…」式的预览展示。
 *    这是命令执行链路最重要的一处用户提示，单独命名让调用点的语义更明确。
 *
 * 设计要点：
 *
 * - **不引入 picocolors**：颜色完全交由 `@clack/prompts` 处理（其内部已经
 *   带有最小的 ANSI 着色，并能在非 TTY / 不支持的终端下退化）。引入
 *   picocolors 只会复制功能并多一个依赖（Requirement 9.3 已显式禁止）。
 * - **不输出到自定义流**：`@clack/prompts` 的 `log.*` 写到 stderr 与 stdout
 *   的细节由其自行决定；这一层不再暴露 `out` / `err` 选项，保持对外签名
 *   尽可能小。
 * - **preview 与 executor 的关系**：`core/executor.ts` 内部已经在 spawn 之前
 *   打印 `$ <command>`，那是 Requirement 7.1 的硬保证。这里的 `preview` 是
 *   面向 TUI 主菜单与 CLI 交互场景的「可读预览」（含中文前缀），由调用点
 *   按需使用，不与 executor 的内部打印冲突。
 *
 * Validates: Requirements 9.3
 */

import { log } from '@clack/prompts';

/**
 * 统一日志输出对象。
 *
 * 所有方法都同步返回 `void`，与 `@clack/prompts` 的 `log.*` 行为一致；
 * 不抛错也不返回 Promise。
 */
export const logger = {
  /** 一般信息（提示性输出，不强调成败）。 */
  info(message: string): void {
    log.info(message);
  },

  /** 成功提示（命令完成、文件写入成功等）。 */
  success(message: string): void {
    log.success(message);
  },

  /** 警告（非致命，但用户应注意，例如用户工具覆盖了同名内置工具）。 */
  warn(message: string): void {
    log.warn(message);
  },

  /** 错误（致命或半致命，通常伴随退出码 1）。 */
  error(message: string): void {
    log.error(message);
  },

  /**
   * 命令执行前的预览。
   *
   * 用于「将执行：…」类提示；与 `core/executor.ts` 内部的 `$ <command>`
   * 打印不冲突（前者是面向交互菜单的可读提示，后者是 Requirement 7.1
   * 的硬性保证）。调用方按需选择是否使用。
   */
  preview(command: string): void {
    log.info(`将执行：${command}`);
  },
};

/** 仅用于类型推导。 */
export type Logger = typeof logger;
