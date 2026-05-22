/**
 * `fastcli remove <tool-id> [--yes]`（v0.2）
 *
 * - 仅 `source: 'user'` 的工具可删；builtin 拒绝。
 * - 默认通过 clack.confirm 二次确认；`--yes` 跳过确认。
 *
 * Validates: Requirements 3.7, 3.8
 */

import { cancel, confirm, isCancel, outro } from '@clack/prompts';
import { defineCommand } from 'citty';

import { loadToolsFile } from '../../config/reader.js';
import { saveToolsFile } from '../../config/writer.js';
import type { ToolsFile } from '../../config/schema.js';
import { loadRegistry } from '../../core/registry.js';
import { suggestToolId } from '../../utils/fuzzy.js';

function exitIfCanceled<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('已取消');
    process.exit(130);
  }
  return value;
}

export default defineCommand({
  meta: {
    name: 'remove',
    description: '删除用户工具',
  },
  args: {
    'tool-id': {
      type: 'positional',
      description: '工具 ID',
      required: true,
    },
    yes: {
      type: 'boolean',
      description: '跳过二次确认',
      default: false,
    },
  },
  async run({ args }) {
    const toolId = String(args['tool-id']);
    const skipConfirm = args.yes === true;

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
      console.error(`内置工具不可删除：${toolId}`);
      process.exit(1);
    }

    if (!skipConfirm) {
      const yes = await confirm({
        message: `确认删除工具 "${toolId}"？此操作不可撤销。`,
        initialValue: false,
      });
      if (!exitIfCanceled<boolean>(yes)) {
        outro('已取消');
        return;
      }
    }

    const toolsFile = await loadToolsFile();
    const updated: ToolsFile = {
      ...toolsFile,
      tools: toolsFile.tools.filter((t) => t.id !== toolId),
    };
    await saveToolsFile(updated);
    outro(`已删除工具 "${toolId}"`);
  },
});
