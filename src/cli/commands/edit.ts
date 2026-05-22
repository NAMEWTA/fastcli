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

import { loadToolsFile } from '../../config/reader.js';
import { saveToolsFile } from '../../config/writer.js';
import type { ToolEntry, ToolsFile } from '../../config/schema.js';
import { loadRegistry } from '../../core/registry.js';
import { suggestToolId } from '../../utils/fuzzy.js';
import {
  editCommandChain,
  formatOpPreview,
  listConfiguredOps,
  promptNewOperationName,
  promptRenameOperationName,
} from './operation-editor.js';

function exitIfCanceled<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('已取消');
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
    description: '编辑用户工具',
  },
  args: {
    'tool-id': {
      type: 'positional',
      description: '工具 ID',
      required: true,
    },
  },
  async run({ args }) {
    const toolId = String(args['tool-id']);

    const registry = await loadRegistry();
    const target = registry.findById(toolId);

    if (target === undefined) {
      const candidates = registry.list().map((t) => t.id);
      const hint = suggestToolId(toolId, candidates);
      console.error(`找不到工具 "${toolId}"`);
      if (hint !== undefined) {
        console.error(`你是否想要：${hint}？`);
      }
      process.exit(1);
    }

    if (target.source === 'builtin') {
      console.error(`内置工具不可编辑：${toolId}`);
      process.exit(1);
    }

    intro(`编辑工具：${target.id}（${target.name}）`);

    // 直接从 tools.json 读取最新条目（避免 registry 上的潜在副本差异）
    const toolsFile = await loadToolsFile();
    const idx = findUserToolIndex(toolsFile, toolId);
    if (idx < 0) {
      // 理论上不会到这里：registry 命中 user 但 tools.json 中找不到
      console.error(`tools.json 中不存在条目：${toolId}`);
      process.exit(1);
    }
    const entry: ToolEntry = { ...toolsFile.tools[idx]! };
    entry.commands = { ...entry.commands };

    // 主循环：选择动作直到用户选择「保存退出」或「不保存退出」
    let dirty = false;
    while (true) {
      const action = await select({
        message: '选择操作',
        options: [
          { value: 'basic', label: '修改基本信息（name / description）' },
          { value: 'ops', label: '管理操作' },
          { value: 'save', label: '保存并退出' },
          { value: 'discard', label: '放弃修改并退出' },
        ],
      });
      const choice = exitIfCanceled<string>(action);

      if (choice === 'save') {
        if (!dirty) {
          outro('没有改动，退出');
          return;
        }
        const updated: ToolsFile = {
          ...toolsFile,
          tools: toolsFile.tools.map((t, i) => (i === idx ? entry : t)),
        };
        await saveToolsFile(updated);
        outro(`已保存工具 "${entry.id}"`);
        return;
      }

      if (choice === 'discard') {
        outro('已放弃修改');
        return;
      }

      if (choice === 'basic') {
        const newNameRaw = await text({
          message: '工具名称',
          placeholder: entry.name,
          defaultValue: entry.name,
        });
        const newName = exitIfCanceled<string>(newNameRaw).trim();
        if (newName.length > 0) entry.name = newName;

        const newDescRaw = await text({
          message: '描述（可选；输入空字符串即清空）',
          placeholder: entry.description ?? '',
          defaultValue: entry.description ?? '',
        });
        const newDesc = exitIfCanceled<string>(newDescRaw).trim();
        entry.description = newDesc.length > 0 ? newDesc : undefined;
        dirty = true;
        continue;
      }

      if (choice === 'ops') {
        const changed = await manageToolOperations(entry);
        dirty = dirty || changed;
      }
    }
  },
});

async function manageToolOperations(entry: ToolEntry): Promise<boolean> {
  let dirty = false;
  while (true) {
    const ops = listConfiguredOps(entry.commands);
    const selected = await select({
      message: ops.length === 0
        ? '管理操作（该工具暂无已配置操作）'
        : '管理操作',
      options: [
        ...ops.map((op) => ({
          value: `op:${op}`,
          label: formatOpPreview(op, entry.commands[op]!),
        })),
        { value: 'add', label: '[+ 添加新操作]' },
        { value: 'back', label: '[← 返回]' },
      ],
    });

    const choice = exitIfCanceled<string>(selected);
    if (choice === 'back') return dirty;
    if (choice === 'add') {
      const op = await promptNewOperationName(
        entry.commands,
        '操作名称（如 install、docs）',
      );
      entry.commands[op] = await editCommandChain(undefined, op);
      dirty = true;
      continue;
    }

    const op = choice.slice('op:'.length);
    const changed = await manageSingleOperation(entry, op);
    dirty = dirty || changed;
  }
}

async function manageSingleOperation(
  entry: ToolEntry,
  op: string,
): Promise<boolean> {
  const selected = await select({
    message: `编辑操作 "${op}"`,
    options: [
      { value: 'commands', label: '修改命令' },
      { value: 'rename', label: '重命名操作' },
      { value: 'delete', label: '删除操作' },
      { value: 'back', label: '返回' },
    ],
  });
  const choice = exitIfCanceled<string>(selected);

  if (choice === 'back') return false;

  if (choice === 'commands') {
    entry.commands[op] = await editCommandChain(entry.commands[op], op);
    return true;
  }

  if (choice === 'rename') {
    const next = await promptRenameOperationName(entry.commands, op);
    entry.commands[next] = entry.commands[op];
    delete entry.commands[op];
    return true;
  }

  if (choice === 'delete') {
    const yes = await confirm({
      message: `确认删除操作 "${op}"？`,
      initialValue: false,
    });
    if (exitIfCanceled<boolean>(yes)) {
      delete entry.commands[op];
      return true;
    }
  }

  return false;
}
