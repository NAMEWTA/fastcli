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

function exitIfCanceled<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('已取消');
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
async function pickTool(registry: Registry): Promise<ToolEntry | null> {
  const builtin = registry
    .list({ source: 'builtin' })
    .sort((a, b) => a.name.localeCompare(b.name));
  const user = registry
    .list({ source: 'user' })
    .sort((a, b) => a.name.localeCompare(b.name));

  if (builtin.length === 0 && user.length === 0) {
    log.warn('当前没有任何工具，可运行 `fastcli add` 添加');
    return null;
  }

  type Option = { value: string; label: string; hint?: string };
  const options: Option[] = [];

  if (builtin.length > 0) {
    options.push({
      value: '__builtin_header',
      label: '── 内置工具 ──',
      hint: '（分组标题）',
    });
    for (const t of builtin) {
      const ops = Object.values(t.commands).filter((v) => v !== undefined).length;
      options.push({
        value: t.id,
        label: `${t.name}（${t.id}）`,
        hint: `${truncate(t.description, DESC_TRUNC)}  · 已配置 ${ops} 个操作`,
      });
    }
  }

  if (user.length > 0) {
    options.push({
      value: '__user_header',
      label: '── 自定义工具 ──',
      hint: '（分组标题）',
    });
    for (const t of user) {
      const ops = Object.values(t.commands).filter((v) => v !== undefined).length;
      options.push({
        value: t.id,
        label: `${t.name}（${t.id}）`,
        hint: `${truncate(t.description, DESC_TRUNC)}  · 已配置 ${ops} 个操作`,
      });
    }
  }

  while (true) {
    const ans = await select({
      message: '选择工具',
      options,
    });
    const choice = exitIfCanceled<string>(ans);
    if (choice === '__builtin_header' || choice === '__user_header') {
      // 分组标题不可选；继续询问
      continue;
    }
    return registry.findById(choice) ?? null;
  }
}

/** 选择操作；返回 op name 或 null（用户取消返回上一层）。 */
async function pickOp(tool: ToolEntry): Promise<string | null> {
  const ops = listOps(tool);
  if (ops.length === 0) {
    log.warn('该工具尚未配置任何操作');
    return null;
  }
  const options = ops.map((op) => ({
    value: op,
    label: op,
    hint: truncate(tool.commands[op]?.[0], HINT_TRUNC),
  }));
  const ans = await select({ message: '选择操作', options });
  return exitIfCanceled<string>(ans);
}

/** 主菜单循环。 */
export async function runInteractiveMenu(): Promise<void> {
  intro('fastcli');

  const appConfig = await loadAppConfig();
  const registry = await loadRegistry({ appConfig });

  // 主循环：选工具 → 选操作 → 执行 → 回到选工具
  while (true) {
    const tool = await pickTool(registry);
    if (tool === null) {
      outro('再见');
      return;
    }

    const op = await pickOp(tool);
    if (op === null) {
      // 操作未配置：回到选工具
      continue;
    }

    let resolved = resolveCommand(tool, op);
    if (resolved.kind === 'unconfigured') {
      log.warn(`工具 "${tool.id}" 未配置 "${op}" 操作`);
      continue;
    }

    // {{version}} 占位符：交互模式下询问
    if (resolved.commands.some((command) => command.includes('{{version}}'))) {
      const v = await text({
        message: '请输入版本号（用于 {{version}}）',
        validate(value) {
          if (typeof value !== 'string' || value.length === 0) {
            return '版本号不能为空';
          }
          return undefined;
        },
      });
      const version = exitIfCanceled<string>(v);
      resolved = resolveCommand(tool, op, { version });
      if (resolved.kind === 'unconfigured') continue;
    }

    printCommandList(resolved.commands);

    if (appConfig.confirmBeforeRun) {
      const yes = await confirm({
        message: '确认执行以上命令链？',
        initialValue: true,
      });
      if (!exitIfCanceled<boolean>(yes)) {
        // 拒绝执行：回到选工具
        continue;
      }
    }

    const result = await executeCommandChain(resolved.commands);
    if (result.success) {
      log.success(`执行完成（退出码 ${result.code}）`);
    } else {
      if (result.failedStep !== undefined) {
        console.error(
          `命令链在第 ${result.failedStep}/${result.totalSteps} 步失败（退出码 ${result.code}）`,
        );
      }
      log.error(`执行失败（退出码 ${result.code}）`);
    }

    // 按回车返回菜单
    const cont = await text({
      message: '按回车返回菜单（Ctrl+C 退出）',
      placeholder: '',
      defaultValue: '',
    });
    exitIfCanceled<string>(cont);
  }
}
