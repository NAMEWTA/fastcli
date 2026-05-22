/**
 * `fastcli run <tool-id> <op> [--dry-run] [--version=<v>]`
 *
 * 流程：
 *
 * 1. 加载注册中心；查工具
 *    - 找不到 → fuzzy 建议 + 退出码 1
 * 2. 解析操作（resolveCommand）
 *    - unconfigured → 输出可用 ops + 退出码 1
 * 3. `{{version}}` 占位符处理：
 *    - `--version=<v>` 提供 → 直接替换
 *    - 未提供 + TTY → clack.text 询问
 *    - 未提供 + 非 TTY → 报错退出
 * 4. confirmBeforeRun（来自 AppConfig）→ 用 clack.confirm 二次确认
 * 5. 调用 executor.executeCommand（透传 dryRun）
 * 6. 退出码 = 子进程退出码（dry-run 为 0）
 *
 * Validates: Requirements 3.1, 2.6, 6.1, 6.3, 6.4, 7.1, 7.2
 */

import { confirm, isCancel, text } from '@clack/prompts';
import { defineCommand } from 'citty';

import { loadAppConfig } from '../../config/reader.js';
import { loadRegistry } from '../../core/registry.js';
import { resolveCommand } from '../../core/resolver.js';
import {
  executeCommandChain,
  printCommandList,
} from '../../core/executor.js';
import { suggestToolId } from '../../utils/fuzzy.js';
import { t, type Language } from '../../i18n.js';

/** 命令字符串中是否含 `{{version}}`。 */
function needsVersion(commands: readonly string[]): boolean {
  return commands.some((command) => command.includes('{{version}}'));
}

/**
 * 把 clack 的取消符号视为「用户主动放弃」：以退出码 130 退出。
 * 同时让类型变窄为 string，方便后续用作变量值。
 */
function exitIfCanceled<T>(
  value: T | symbol,
  language: Language,
  message = t('common.cancelled', {}, language),
): T {
  if (isCancel(value)) {
    console.error(message);
    process.exit(130);
  }
  return value;
}

export default defineCommand({
  meta: {
    name: 'run',
    description: t('run.description'),
  },
  args: {
    'tool-id': {
      type: 'positional',
      description: t('cli.toolId.description'),
      required: true,
    },
    op: {
      type: 'positional',
      description: t('run.op.description'),
      required: true,
    },
    'dry-run': {
      type: 'boolean',
      description: t('run.dryRun.description'),
      default: false,
    },
    version: {
      type: 'string',
      description: t('run.version.description'),
    },
  },
  async run({ args }) {
    const toolId = String(args['tool-id']);
    const op = String(args.op);
    const dryRun = args['dry-run'] === true;
    const cliVersion = typeof args.version === 'string' && args.version.length > 0
      ? args.version
      : undefined;

    const appConfig = await loadAppConfig();
    const language = appConfig.language;
    const registry = await loadRegistry({ appConfig });

    // 1. 查工具
    const tool = registry.findById(toolId);
    if (tool === undefined) {
      const candidates = registry.list().map((t) => t.id);
      const hint = suggestToolId(toolId, candidates);
      console.error(t('cli.notFound.tool', { toolId }, language));
      if (hint !== undefined) {
        console.error(t('cli.notFound.hint', { hint }, language));
      }
      console.error(t('cli.notFound.listHint', {}, language));
      process.exit(1);
    }

    // 2. 第一次解析（先用 cliVersion；为空则保留字面量便于检测是否需要询问）
    let resolved = resolveCommand(tool, op, { version: cliVersion });
    if (resolved.kind === 'unconfigured') {
      const opsList = resolved.availableOps.join(', ');
      console.error(t('run.unconfigured', { toolId: tool.id, op }, language));
      if (opsList.length > 0) {
        console.error(t('run.availableOps', { ops: opsList }, language));
      } else {
        console.error(t('run.noOps', {}, language));
      }
      process.exit(1);
    }

    // 3. {{version}} 处理
    if (needsVersion(resolved.commands) && cliVersion === undefined) {
      if (!process.stdin.isTTY) {
        console.error(t('run.versionRequired', {}, language));
        process.exit(1);
      }
      const input = await text({
        message: t('run.versionPrompt', {}, language),
        validate(v) {
          if (typeof v !== 'string' || v.length === 0) {
            return t('run.versionEmpty', {}, language);
          }
          return undefined;
        },
      });
      const version = exitIfCanceled<string>(input, language);
      resolved = resolveCommand(tool, op, { version });
      // 仍需校验仍可能落入 unconfigured（理论上不会，因 op 之前已存在）
      if (resolved.kind === 'unconfigured') {
        console.error(t('run.unconfigured', { toolId: tool.id, op }, language));
        process.exit(1);
      }
    }

    // 4. 展示命令清单 / dry-run
    printCommandList(resolved.commands);

    if (dryRun) {
      process.exit(0);
    }

    // 5. confirmBeforeRun
    if (appConfig.confirmBeforeRun && !dryRun) {
      const ans = await confirm({
        message: t('run.confirmChain', {}, language),
        initialValue: true,
      });
      const ok = exitIfCanceled<boolean>(ans, language);
      if (!ok) {
        console.log(t('run.cancelledExecution', {}, language));
        process.exit(0);
      }
    }

    // 6. 执行
    const result = await executeCommandChain(resolved.commands, { language });
    if (!result.success && result.failedStep !== undefined) {
      console.error(
        t('run.chainFailed', {
          step: result.failedStep,
          total: result.totalSteps,
          code: result.code,
        }, language),
      );
    }

    // 7. 退出码透传
    process.exit(result.code);
  },
});
