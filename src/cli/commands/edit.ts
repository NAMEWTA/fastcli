/**
 * `fastcli edit <tool-id>`（v0.2）
 *
 * 仅允许编辑 `source: 'user'` 的工具；builtin 拒绝并提示。
 *
 * 子菜单：
 *   - 修改基本信息（name / description）
 *   - 增加 / 修改 / 删除操作（删除通过移除 `commands.<op>` 实现）
 *
 * Validates: Requirements 3.7
 */

import {
  cancel,
  confirm,
  intro,
  isCancel,
  outro,
  select,
  text,
} from '@clack/prompts';
import { defineCommand } from 'citty';

import { loadAppConfig, loadToolsFile } from '../../config/reader.js';
import { saveToolsFile } from '../../config/writer.js';
import type { ToolEntry, ToolsFile } from '../../config/schema.js';
import { loadRegistry } from '../../core/registry.js';
import { suggestToolId } from '../../utils/fuzzy.js';
import { hasToolName } from '../../utils/tool-name.js';
import {
  editCommandChain,
  formatOpPreview,
  listConfiguredOps,
  promptNewOperationName,
  promptRenameOperationName,
} from './operation-editor.js';
import { t, type Language } from '../../i18n.js';

function exitIfCanceled<T>(value: T | symbol, language: Language): T {
  if (isCancel(value)) {
    cancel(t('common.cancelled', {}, language));
    process.exit(130);
  }
  return value;
}

/** 从 tools.json 中找到指定 id 的条目，返回索引（-1 = 不存在）。 */
function findUserToolIndex(toolsFile: ToolsFile, id: string): number {
  return toolsFile.tools.findIndex((t) => t.id === id);
}

export default defineCommand({
  meta: {
    name: 'edit',
    description: t('edit.description'),
  },
  args: {
    'tool-id': {
      type: 'positional',
      description: t('cli.toolId.description'),
      required: true,
    },
  },
  async run({ args }) {
    const toolId = String(args['tool-id']);
    const appConfig = await loadAppConfig();
    const language = appConfig.language;

    const registry = await loadRegistry({ appConfig });
    const target = registry.findById(toolId);
    const existingTools = registry.list();

    if (target === undefined) {
      const candidates = registry.list().map((t) => t.id);
      const hint = suggestToolId(toolId, candidates);
      console.error(t('cli.notFound.tool', { toolId }, language));
      if (hint !== undefined) {
        console.error(t('cli.notFound.hint', { hint }, language));
      }
      process.exit(1);
    }

    if (target.source === 'builtin') {
      console.error(t('cli.builtin.readonly.edit', { toolId }, language));
      process.exit(1);
    }

    intro(t('edit.intro', { id: target.id, name: target.name }, language));

    // 直接从 tools.json 读取最新条目（避免 registry 上的潜在副本差异）
    const toolsFile = await loadToolsFile();
    const idx = findUserToolIndex(toolsFile, toolId);
    if (idx < 0) {
      // 理论上不会到这里：registry 命中 user 但 tools.json 中找不到
      console.error(t('edit.missingInTools', { toolId }, language));
      process.exit(1);
    }
    const entry: ToolEntry = { ...toolsFile.tools[idx]! };
    entry.commands = { ...entry.commands };

    // 主循环：选择动作直到用户选择「保存退出」或「不保存退出」
    let dirty = false;
    while (true) {
      const action = await select({
        message: t('edit.actionPrompt', {}, language),
        options: [
          { value: 'basic', label: t('edit.basic', {}, language) },
          { value: 'ops', label: t('edit.ops', {}, language) },
          { value: 'save', label: t('edit.saveExit', {}, language) },
          { value: 'discard', label: t('edit.discardExit', {}, language) },
        ],
      });
      const choice = exitIfCanceled<string>(action, language);

      if (choice === 'save') {
        if (!dirty) {
          outro(t('edit.noChanges', {}, language));
          return;
        }
        const updated: ToolsFile = {
          ...toolsFile,
          tools: toolsFile.tools.map((t, i) => (i === idx ? entry : t)),
        };
        await saveToolsFile(updated);
        outro(t('edit.saved', { id: entry.id }, language));
        return;
      }

      if (choice === 'discard') {
        outro(t('edit.discarded', {}, language));
        return;
      }

      if (choice === 'basic') {
        const newNameRaw = await text({
          message: t('common.name', {}, language),
          placeholder: entry.name,
          defaultValue: entry.name,
          validate(v) {
            if (typeof v !== 'string' || v.trim().length === 0) {
              return t('add.nameRequired', {}, language);
            }
            if (hasToolName(existingTools, v, entry.id)) {
              return t('add.nameExists', { name: v.trim() }, language);
            }
            return undefined;
          },
        });
        const newName = exitIfCanceled<string>(newNameRaw, language).trim();
        entry.name = newName;

        const newDescRaw = await text({
          message: t('edit.descPrompt', {}, language),
          placeholder: entry.description ?? '',
          defaultValue: entry.description ?? '',
        });
        const newDesc = exitIfCanceled<string>(newDescRaw, language).trim();
        entry.description = newDesc.length > 0 ? newDesc : undefined;
        dirty = true;
        continue;
      }

      if (choice === 'ops') {
        const changed = await manageToolOperations(entry, language);
        dirty = dirty || changed;
      }
    }
  },
});

async function manageToolOperations(
  entry: ToolEntry,
  language: Language,
): Promise<boolean> {
  let dirty = false;
  while (true) {
    const ops = listConfiguredOps(entry.commands);
    const selected = await select({
      message: ops.length === 0
        ? t('edit.manageOpsEmpty', {}, language)
        : t('edit.manageOps', {}, language),
      options: [
        ...ops.map((op) => ({
          value: `op:${op}`,
          label: formatOpPreview(op, entry.commands[op]!, language),
        })),
        { value: 'add', label: t('edit.addOperation', {}, language) },
        { value: 'back', label: t('edit.back', {}, language) },
      ],
    });

    const choice = exitIfCanceled<string>(selected, language);
    if (choice === 'back') return dirty;
    if (choice === 'add') {
      const op = await promptNewOperationName(
        entry.commands,
        language,
        t('op.nameExample', {}, language),
      );
      entry.commands[op] = await editCommandChain(undefined, op, language);
      dirty = true;
      continue;
    }

    const op = choice.slice('op:'.length);
    const changed = await manageSingleOperation(entry, op, language);
    dirty = dirty || changed;
  }
}

async function manageSingleOperation(
  entry: ToolEntry,
  op: string,
  language: Language,
): Promise<boolean> {
  const selected = await select({
    message: t('edit.singlePrompt', { op }, language),
    options: [
      { value: 'commands', label: t('edit.modifyCommands', {}, language) },
      { value: 'rename', label: t('edit.renameOperation', {}, language) },
      { value: 'delete', label: t('edit.deleteOperation', {}, language) },
      { value: 'back', label: t('edit.backPlain', {}, language) },
    ],
  });
  const choice = exitIfCanceled<string>(selected, language);

  if (choice === 'back') return false;

  if (choice === 'commands') {
    entry.commands[op] = await editCommandChain(entry.commands[op], op, language);
    return true;
  }

  if (choice === 'rename') {
    const next = await promptRenameOperationName(entry.commands, op, language);
    entry.commands[next] = entry.commands[op];
    delete entry.commands[op];
    return true;
  }

  if (choice === 'delete') {
    const yes = await confirm({
      message: t('edit.confirmDeleteOperation', { op }, language),
      initialValue: false,
    });
    if (exitIfCanceled<boolean>(yes, language)) {
      delete entry.commands[op];
      return true;
    }
  }

  return false;
}
