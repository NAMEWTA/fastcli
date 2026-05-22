import {
  cancel,
  confirm,
  isCancel,
  select,
  text,
} from '@clack/prompts';

import type { ToolCommands } from '../../config/schema.js';

const PREVIEW_LIMIT = 60;

function exitIfCanceled<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('已取消');
    process.exit(130);
  }
  return value;
}

function truncate(input: string, max = PREVIEW_LIMIT): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1)}…`;
}

export function listConfiguredOps(commands: ToolCommands): string[] {
  return Object.keys(commands)
    .filter((key) => commands[key] !== undefined)
    .sort();
}

export function formatOpPreview(op: string, commands: readonly string[]): string {
  const first = commands[0] ?? '';
  return `${op} → [${commands.length} 条] ${truncate(first)}`;
}

function printCommandEntries(commands: readonly string[]): void {
  for (let i = 0; i < commands.length; i += 1) {
    console.log(`[${i + 1}/${commands.length}] ${commands[i]}`);
  }
}

async function promptCommand(
  message: string,
  defaultValue?: string,
): Promise<string> {
  const value = await text({
    message,
    placeholder: defaultValue ?? '例：npm install -g foo',
    defaultValue,
    validate(v) {
      if (typeof v !== 'string' || v.trim().length === 0) {
        return '命令不能为空';
      }
      return undefined;
    },
  });
  return exitIfCanceled<string>(value).trim();
}

async function pickCommandIndex(
  commands: readonly string[],
  message: string,
): Promise<number> {
  const picked = await select({
    message,
    options: commands.map((command, index) => ({
      value: String(index),
      label: `[${index + 1}/${commands.length}] ${truncate(command)}`,
    })),
  });
  return Number.parseInt(exitIfCanceled<string>(picked), 10);
}

export async function editCommandChain(
  initial: string[] | undefined,
  opName: string,
): Promise<string[]> {
  const commands = initial === undefined
    ? [await promptCommand(`操作 "${opName}" 的第一条命令`)]
    : [...initial];

  while (true) {
    printCommandEntries(commands);

    const action = await select({
      message: `编辑操作 "${opName}" 的命令链`,
      options: [
        { value: 'edit', label: '修改某条命令' },
        { value: 'delete', label: '删除某条命令' },
        { value: 'append', label: '在末尾追加新命令' },
        { value: 'done', label: '完成编辑' },
      ],
    });

    const choice = exitIfCanceled<string>(action);
    if (choice === 'done') {
      if (
        commands.length >= 1 &&
        commands.every((command) => command.trim().length > 0)
      ) {
        return commands;
      }
      console.error('命令链至少需要一条非空命令');
      continue;
    }

    if (choice === 'append') {
      commands.push(await promptCommand('新增命令'));
      continue;
    }

    if (choice === 'edit') {
      const index = await pickCommandIndex(commands, '选择要修改的命令');
      commands[index] = await promptCommand('新的命令', commands[index]);
      continue;
    }

    if (choice === 'delete') {
      if (commands.length <= 1) {
        console.error('至少需要保留一条命令');
        continue;
      }
      const index = await pickCommandIndex(commands, '选择要删除的命令');
      const yes = await confirm({
        message: `确认删除第 ${index + 1}/${commands.length} 条命令？`,
        initialValue: false,
      });
      if (exitIfCanceled<boolean>(yes)) {
        commands.splice(index, 1);
      }
    }
  }
}

export async function promptNewOperationName(
  commands: ToolCommands,
  message = '操作名称',
): Promise<string> {
  const existing = new Set(listConfiguredOps(commands));
  const value = await text({
    message,
    validate(v) {
      if (typeof v !== 'string' || v.trim().length === 0) {
        return '操作名称不能为空';
      }
      const op = v.trim();
      if (existing.has(op)) {
        return `操作 "${op}" 已配置过`;
      }
      return undefined;
    },
  });
  return exitIfCanceled<string>(value).trim();
}

export async function promptRenameOperationName(
  commands: ToolCommands,
  oldName: string,
): Promise<string> {
  const existing = new Set(listConfiguredOps(commands).filter((op) => op !== oldName));
  const value = await text({
    message: `将 "${oldName}" 重命名为`,
    defaultValue: oldName,
    validate(v) {
      if (typeof v !== 'string' || v.trim().length === 0) {
        return '操作名称不能为空';
      }
      const op = v.trim();
      if (op === oldName) {
        return '新操作名不能与原操作名相同';
      }
      if (existing.has(op)) {
        return `操作 "${op}" 已配置过`;
      }
      return undefined;
    },
  });
  return exitIfCanceled<string>(value).trim();
}

export async function manageCommandsForNewTool(
  commands: ToolCommands,
): Promise<void> {
  while (true) {
    const ops = listConfiguredOps(commands);
    const selected = await select({
      message: ops.length === 0 ? '配置操作（当前暂无已配置操作）' : '配置操作',
      options: [
        ...ops.map((op) => ({
          value: `op:${op}`,
          label: formatOpPreview(op, commands[op]!),
        })),
        { value: 'add', label: '[+ 添加新操作]' },
        { value: 'done', label: '[完成 →]' },
      ],
    });
    const choice = exitIfCanceled<string>(selected);
    if (choice === 'done') return;
    if (choice === 'add') {
      const op = await promptNewOperationName(commands, '操作名称（如 install、docs）');
      commands[op] = await editCommandChain(undefined, op);
      continue;
    }

    const op = choice.slice('op:'.length);
    commands[op] = await editCommandChain(commands[op], op);
  }
}
