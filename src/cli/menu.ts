/**
 * 主交互菜单循环。
 *
 * 流程：装载 registry → 「选择分类」（系统内置 / 自定义 / 可视化配置）→
 * 「选择工具」→「选择操作」（已配置非空，install/danger/uninstall 优先）→
 * 显示完整命令 → `confirmBeforeRun ? clack.confirm` →
 * executor.executeCommandChain → 显示退出码 → 按回车返回菜单。
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
import { loadRegistry, type Registry, type ListFilter } from '../core/registry.js';
import { resolveCommand } from '../core/resolver.js';
import {
  executeCommandChain,
  printCommandList,
} from '../core/executor.js';
import type { ToolEntry } from '../config/schema.js';
import { t, type Language } from '../i18n.js';
import { startViewEditor } from './commands/view.js';

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

type MenuSection = 'coding' | 'tool' | 'custom' | 'config';

/** 已配置（值不为 undefined）的操作名，install/danger/uninstall 优先,其他按字母序。 */
function listOps(tool: ToolEntry): string[] {
  const PRIORITY = ['install', 'danger', 'uninstall'];
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

async function pickSection(language: Language): Promise<MenuSection> {
  const ans = await select({
    message: t('menu.pickSection', {}, language),
    options: [
      { value: 'coding', label: t('menu.codingSection', {}, language) },
      { value: 'tool', label: t('menu.toolSection', {}, language) },
      { value: 'custom', label: t('menu.customSection', {}, language) },
      { value: 'config', label: t('menu.configSection', {}, language) },
    ],
  });
  return exitIfCanceled<MenuSection>(ans, language);
}

/** 选择指定过滤条件的工具；展示名只使用 name，id 仅作为内部值。 */
async function pickTool(
  registry: Registry,
  filter: ListFilter,
  language: Language,
): Promise<ToolEntry | null> {
  const tools = registry.list(filter);
  if (filter.source === 'user') {
    tools.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (tools.length === 0) {
    log.warn(t('menu.noTools', {}, language));
    return null;
  }

  type Option = { value: string; label: string; hint?: string };
  const options: Option[] = tools.map((tool) => {
    const ops = Object.values(tool.commands).filter((v) => v !== undefined).length;
    return {
      value: tool.id,
      label: tool.name,
      hint: t('menu.configuredOpsHint', {
        desc: truncate(tool.description, DESC_TRUNC),
        count: ops,
      }, language),
    };
  });

  const ans = await select({
    message: t('menu.pickTool', {}, language),
    options,
  });
  const choice = exitIfCanceled<string>(ans, language);
  return registry.findById(choice) ?? null;
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

  let appConfig = await loadAppConfig();
  let language = appConfig.language;
  let registry = await loadRegistry({ appConfig });

  async function reloadMenuState(): Promise<void> {
    appConfig = await loadAppConfig();
    language = appConfig.language;
    registry = await loadRegistry({ appConfig });
  }

  // 主循环：选分类 → 选工具 → 选操作 → 执行 → 回到分类
  while (true) {
    const section = await pickSection(language);
    if (section === 'config') {
      await startViewEditor();
      await reloadMenuState();
      continue;
    }

    let filter: ListFilter;
    if (section === 'coding') {
      filter = { category: 'coding' };
    } else if (section === 'tool') {
      filter = { category: 'tool' };
    } else {
      filter = { source: 'user' };
    }

    const tool = await pickTool(registry, filter, language);
    if (tool === null) {
      continue;
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
