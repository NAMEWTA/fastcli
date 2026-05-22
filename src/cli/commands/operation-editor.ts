import {
  cancel,
  confirm,
  isCancel,
  select,
  text,
} from '@clack/prompts';

import type { ToolCommands } from '../../config/schema.js';
import { t, type Language } from '../../i18n.js';

const PREVIEW_LIMIT = 60;

function exitIfCanceled<T>(value: T | symbol, language: Language): T {
  if (isCancel(value)) {
    cancel(t('common.cancelled', {}, language));
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

export function formatOpPreview(
  op: string,
  commands: readonly string[],
  language: Language,
): string {
  const first = commands[0] ?? '';
  return t('op.preview', {
    op,
    count: commands.length,
    command: truncate(first),
  }, language);
}

function printCommandEntries(commands: readonly string[]): void {
  for (let i = 0; i < commands.length; i += 1) {
    console.log(`[${i + 1}/${commands.length}] ${commands[i]}`);
  }
}

async function promptCommand(
  message: string,
  language: Language,
  defaultValue?: string,
): Promise<string> {
  const value = await text({
    message,
    placeholder: defaultValue ?? t('common.exampleCommand', {}, language),
    defaultValue,
    validate(v) {
      if (typeof v !== 'string' || v.trim().length === 0) {
        return t('op.commandRequired', {}, language);
      }
      return undefined;
    },
  });
  return exitIfCanceled<string>(value, language).trim();
}

async function pickCommandIndex(
  commands: readonly string[],
  message: string,
  language: Language,
): Promise<number> {
  const picked = await select({
    message,
    options: commands.map((command, index) => ({
      value: String(index),
      label: `[${index + 1}/${commands.length}] ${truncate(command)}`,
    })),
  });
  return Number.parseInt(exitIfCanceled<string>(picked, language), 10);
}

export async function editCommandChain(
  initial: string[] | undefined,
  opName: string,
  language: Language,
): Promise<string[]> {
  const commands = initial === undefined
    ? [await promptCommand(t('op.firstCommand', { op: opName }, language), language)]
    : [...initial];

  while (true) {
    printCommandEntries(commands);

    const action = await select({
      message: t('op.editChain', { op: opName }, language),
      options: [
        { value: 'edit', label: t('op.editCommand', {}, language) },
        { value: 'delete', label: t('op.deleteCommand', {}, language) },
        { value: 'append', label: t('op.appendCommand', {}, language) },
        { value: 'done', label: t('op.done', {}, language) },
      ],
    });

    const choice = exitIfCanceled<string>(action, language);
    if (choice === 'done') {
      if (
        commands.length >= 1 &&
        commands.every((command) => command.trim().length > 0)
      ) {
        return commands;
      }
      console.error(t('op.chainRequired', {}, language));
      continue;
    }

    if (choice === 'append') {
      commands.push(await promptCommand(t('op.newCommand', {}, language), language));
      continue;
    }

    if (choice === 'edit') {
      const index = await pickCommandIndex(
        commands,
        t('op.pickEdit', {}, language),
        language,
      );
      commands[index] = await promptCommand(
        t('op.replacementCommand', {}, language),
        language,
        commands[index],
      );
      continue;
    }

    if (choice === 'delete') {
      if (commands.length <= 1) {
        console.error(t('op.keepOneCommand', {}, language));
        continue;
      }
      const index = await pickCommandIndex(
        commands,
        t('op.pickDelete', {}, language),
        language,
      );
      const yes = await confirm({
        message: t('op.confirmDeleteCommand', {
          index: index + 1,
          total: commands.length,
        }, language),
        initialValue: false,
      });
      if (exitIfCanceled<boolean>(yes, language)) {
        commands.splice(index, 1);
      }
    }
  }
}

export async function promptNewOperationName(
  commands: ToolCommands,
  language: Language,
  message = t('op.namePrompt', {}, language),
): Promise<string> {
  const existing = new Set(listConfiguredOps(commands));
  const value = await text({
    message,
    validate(v) {
      if (typeof v !== 'string' || v.trim().length === 0) {
        return t('op.nameRequired', {}, language);
      }
      const op = v.trim();
      if (existing.has(op)) {
        return t('op.exists', { op }, language);
      }
      return undefined;
    },
  });
  return exitIfCanceled<string>(value, language).trim();
}

export async function promptRenameOperationName(
  commands: ToolCommands,
  oldName: string,
  language: Language,
): Promise<string> {
  const existing = new Set(listConfiguredOps(commands).filter((op) => op !== oldName));
  const value = await text({
    message: t('op.renamePrompt', { oldName }, language),
    defaultValue: oldName,
    validate(v) {
      if (typeof v !== 'string' || v.trim().length === 0) {
        return t('op.nameRequired', {}, language);
      }
      const op = v.trim();
      if (op === oldName) {
        return t('op.sameName', {}, language);
      }
      if (existing.has(op)) {
        return t('op.exists', { op }, language);
      }
      return undefined;
    },
  });
  return exitIfCanceled<string>(value, language).trim();
}

export async function manageCommandsForNewTool(
  commands: ToolCommands,
  language: Language,
): Promise<void> {
  while (true) {
    const ops = listConfiguredOps(commands);
    const selected = await select({
      message: ops.length === 0
        ? t('op.configureEmpty', {}, language)
        : t('op.configure', {}, language),
      options: [
        ...ops.map((op) => ({
          value: `op:${op}`,
          label: formatOpPreview(op, commands[op]!, language),
        })),
        { value: 'add', label: t('op.addNew', {}, language) },
        { value: 'done', label: t('op.doneArrow', {}, language) },
      ],
    });
    const choice = exitIfCanceled<string>(selected, language);
    if (choice === 'done') return;
    if (choice === 'add') {
      const op = await promptNewOperationName(
        commands,
        language,
        t('op.nameExample', {}, language),
      );
      commands[op] = await editCommandChain(undefined, op, language);
      continue;
    }

    const op = choice.slice('op:'.length);
    commands[op] = await editCommandChain(commands[op], op, language);
  }
}
