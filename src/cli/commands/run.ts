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

/** 命令字符串中是否含 `{{version}}`。 */
function needsVersion(commands: readonly string[]): boolean {
  return commands.some((command) => command.includes('{{version}}'));
}

/**
 * 把 clack 的取消符号视为「用户主动放弃」：以退出码 130 退出。
 * 同时让类型变窄为 string，方便后续用作变量值。
 */
function exitIfCanceled<T>(value: T | symbol, message = '已取消'): T {
  if (isCancel(value)) {
    console.error(message);
    process.exit(130);
  }
  return value;
}

export default defineCommand({
  meta: {
    name: 'run',
    description: '运行某个工具的某个操作',
  },
  args: {
    'tool-id': {
      type: 'positional',
      description: '工具 ID',
      required: true,
    },
    op: {
      type: 'positional',
      description: '操作名（如 install / update / uninstall）',
      required: true,
    },
    'dry-run': {
      type: 'boolean',
      description: '仅打印命令而不实际执行',
      default: false,
    },
    version: {
      type: 'string',
      description: '透传到 {{version}} 占位符的版本号',
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
    const registry = await loadRegistry({ appConfig });

    // 1. 查工具
    const tool = registry.findById(toolId);
    if (tool === undefined) {
      const candidates = registry.list().map((t) => t.id);
      const hint = suggestToolId(toolId, candidates);
      console.error(`找不到工具 "${toolId}"`);
      if (hint !== undefined) {
        console.error(`你是否想要：${hint}？`);
      }
      console.error('运行 fastcli list 查看所有工具');
      process.exit(1);
    }

    // 2. 第一次解析（先用 cliVersion；为空则保留字面量便于检测是否需要询问）
    let resolved = resolveCommand(tool, op, { version: cliVersion });
    if (resolved.kind === 'unconfigured') {
      const opsList = resolved.availableOps.join(', ');
      console.error(`工具 "${tool.id}" 未配置 "${op}" 操作`);
      if (opsList.length > 0) {
        console.error(`该工具已配置的操作：${opsList}`);
      } else {
        console.error('该工具尚未配置任何操作');
      }
      process.exit(1);
    }

    // 3. {{version}} 处理
    if (needsVersion(resolved.commands) && cliVersion === undefined) {
      if (!process.stdin.isTTY) {
        console.error(
          `命令包含 {{version}} 占位符，请通过 --version=<v> 提供版本号`,
        );
        process.exit(1);
      }
      const input = await text({
        message: `请输入版本号（用于 {{version}} 占位符）`,
        validate(v) {
          if (typeof v !== 'string' || v.length === 0) {
            return '版本号不能为空';
          }
          return undefined;
        },
      });
      const version = exitIfCanceled<string>(input);
      resolved = resolveCommand(tool, op, { version });
      // 仍需校验仍可能落入 unconfigured（理论上不会，因 op 之前已存在）
      if (resolved.kind === 'unconfigured') {
        console.error(`工具 "${tool.id}" 未配置 "${op}" 操作`);
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
        message: '确认执行以上命令链？',
        initialValue: true,
      });
      const ok = exitIfCanceled<boolean>(ans);
      if (!ok) {
        console.log('已取消执行');
        process.exit(0);
      }
    }

    // 6. 执行
    const result = await executeCommandChain(resolved.commands);
    if (!result.success && result.failedStep !== undefined) {
      console.error(
        `命令链在第 ${result.failedStep}/${result.totalSteps} 步失败（退出码 ${result.code}）`,
      );
    }

    // 7. 退出码透传
    process.exit(result.code);
  },
});
