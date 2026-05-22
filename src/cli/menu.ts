/**
 * 主交互菜单循环。
 *
 * 流程：装载 registry → 「选择工具」分组列表（builtin / user）→
 * 「选择操作」（已配置非空，install/update/uninstall 优先）→
 * 显示完整命令 → `confirmBeforeRun ? clack.confirm` →
 * executor.executeCommand → 显示退出码 → 按回车返回菜单。
 *
 * 任意步骤的取消（Ctrl+C / Esc）→ `cancel('已取消')` + `process.exit(130)`。
 *
 * Validates: Requirements 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 7.2
 */

import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  outro,
  select,
  text,
} from '@clack/prompts';

import { loadAppConfig } from '../config/reader.js';
import { loadRegistry, type Registry } from '../core/registry.js';
import { resolveCommand } from '../core/resolver.js';
import {
  executeCommandChain,
  printCommandList,
} from '../core/executor.js';
import type { ToolEntry } from '../config/schema.js';
import { t, type Language } from '../i18n.js';

/** 菜单中描述截断字符宽度。 */
const DESC_TRUNC = 40;

/** 命令字符串在 hint 中显示的最大长度。 */
const HINT_TRUNC = 60;

/** 按字符数截断字符串。 */
function truncate(s: string | undefined, width: number): string {
  if (s === undefined || s.length === 0) return '';
  if (s.length <= width) return s;
  return `${s.slice(0, width - 1)}…`;
}

/** 已配置（值不为 undefined）的操作名，install/update/uninstall 优先,其他按字母序。 */
function listOps(tool: ToolEntry): string[] {
  const PRIORITY = ['install', 'update', 'uninstall'];
  const all = Object.keys(tool.commands).filter(
    (k) => tool.commands[k] !== undefined,
  );
  const priority = PRIORITY.filter((p) => all.includes(p));
  const rest = all.filter((k) => !PRIORITY.includes(k)).sort();
  return [...priority, ...rest];
}

function exitIfCanceled<T>(value: T | symbol, language: Language): T {
  if (isCancel(value)) {
    cancel(t('common.cancelled', {}, language));
    process.exit(130);
  }
  return value;
}

/**
 * 选择工具：把 builtin / user 分两组展示。clack.select 不原生支持分组,
 * 这里用「分隔行（hint='──── 分组 ────'，value 占位）」的近似方案,
 * 并把分隔行设为不可选（通过过滤选择结果）。
 *
 * 改进版：直接把分组拼接成单一 options 列表，分组之间用 label 标识但
 * 不可选；用户选完后我们用 toolId 反查工具。
 */
async function pickTool(
  registry: Registry,
  language: Language,
): Promise<ToolEntry | null> {
  const builtin = registry
    .list({ source: 'builtin' })
    .sort((a, b) => a.name.localeCompare(b.name));
  const user = registry
    .list({ source: 'user' })
    .sort((a, b) => a.name.localeCompare(b.name));

  if (builtin.length === 0 && user.length === 0) {
    log.warn(t('menu.noTools', {}, language));
    return null;
  }

  type Option = { value: string; label: string; hint?: string };
  const options: Option[] = [];

  if (builtin.length > 0) {
    options.push({
      value: '__builtin_header',
      label: `── ${t('common.builtinTools', {}, language)} ──`,
      hint: t('menu.headerHint', {}, language),
    });
    for (const tool of builtin) {
      const ops = Object.values(tool.commands).filter((v) => v !== undefined).length;
      options.push({
        value: tool.id,
        label: `${tool.name} (${tool.id})`,
        hint: t('menu.configuredOpsHint', {
          desc: truncate(tool.description, DESC_TRUNC),
          count: ops,
        }, language),
      });
    }
  }

  if (user.length > 0) {
    options.push({
      value: '__user_header',
      label: `── ${t('common.userTools', {}, language)} ──`,
      hint: t('menu.headerHint', {}, language),
    });
    for (const tool of user) {
      const ops = Object.values(tool.commands).filter((v) => v !== undefined).length;
      options.push({
        value: tool.id,
        label: `${tool.name} (${tool.id})`,
        hint: t('menu.configuredOpsHint', {
          desc: truncate(tool.description, DESC_TRUNC),
          count: ops,
        }, language),
      });
    }
  }

  while (true) {
    const ans = await select({
      message: t('menu.pickTool', {}, language),
      options,
    });
    const choice = exitIfCanceled<string>(ans, language);
    if (choice === '__builtin_header' || choice === '__user_header') {
      // 分组标题不可选；继续询问
      continue;
    }
    return registry.findById(choice) ?? null;
  }
}

/** 选择操作；返回 op name 或 null（用户取消返回上一层）。 */
async function pickOp(tool: ToolEntry, language: Language): Promise<string | null> {
  const ops = listOps(tool);
  if (ops.length === 0) {
    log.warn(t('menu.noOps', {}, language));
    return null;
  }
  const options = ops.map((op) => ({
    value: op,
    label: op,
    hint: truncate(tool.commands[op]?.[0], HINT_TRUNC),
  }));
  const ans = await select({ message: t('menu.pickOp', {}, language), options });
  return exitIfCanceled<string>(ans, language);
}

/** 主菜单循环。 */
export async function runInteractiveMenu(): Promise<void> {
  intro('fastcli');

  const appConfig = await loadAppConfig();
  const language = appConfig.language;
  const registry = await loadRegistry({ appConfig });

  // 主循环：选工具 → 选操作 → 执行 → 回到选工具
  while (true) {
    const tool = await pickTool(registry, language);
    if (tool === null) {
      outro(t('menu.goodbye', {}, language));
      return;
    }

    const op = await pickOp(tool, language);
    if (op === null) {
      // 操作未配置：回到选工具
      continue;
    }

    let resolved = resolveCommand(tool, op);
    if (resolved.kind === 'unconfigured') {
      log.warn(t('run.unconfigured', { toolId: tool.id, op }, language));
      continue;
    }

    // {{version}} 占位符：交互模式下询问
    if (resolved.commands.some((command) => command.includes('{{version}}'))) {
      const v = await text({
        message: t('menu.versionPrompt', {}, language),
        validate(value) {
          if (typeof value !== 'string' || value.length === 0) {
            return t('run.versionEmpty', {}, language);
          }
          return undefined;
        },
      });
      const version = exitIfCanceled<string>(v, language);
      resolved = resolveCommand(tool, op, { version });
      if (resolved.kind === 'unconfigured') continue;
    }

    printCommandList(resolved.commands);

    if (appConfig.confirmBeforeRun) {
      const yes = await confirm({
        message: t('run.confirmChain', {}, language),
        initialValue: true,
      });
      if (!exitIfCanceled<boolean>(yes, language)) {
        // 拒绝执行：回到选工具
        continue;
      }
    }

    const result = await executeCommandChain(resolved.commands, { language });
    if (result.success) {
      log.success(t('menu.success', { code: result.code }, language));
    } else {
      if (result.failedStep !== undefined) {
        console.error(
          t('run.chainFailed', {
            step: result.failedStep,
            total: result.totalSteps,
            code: result.code,
          }, language),
        );
      }
      log.error(t('menu.failure', { code: result.code }, language));
    }

    // 按回车返回菜单
    const cont = await text({
      message: t('menu.returnPrompt', {}, language),
      placeholder: '',
      defaultValue: '',
    });
    exitIfCanceled<string>(cont, language);
  }
}
