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

import { loadAppConfig, loadToolsFile } from '../../config/reader.js';
import { saveToolsFile } from '../../config/writer.js';
import type { ToolsFile } from '../../config/schema.js';
import { loadRegistry } from '../../core/registry.js';
import { suggestToolId } from '../../utils/fuzzy.js';
import { t, type Language } from '../../i18n.js';

function exitIfCanceled<T>(value: T | symbol, language: Language): T {
  if (isCancel(value)) {
    cancel(t('common.cancelled', {}, language));
    process.exit(130);
  }
  return value;
}

export default defineCommand({
  meta: {
    name: 'remove',
    description: t('remove.description'),
  },
  args: {
    'tool-id': {
      type: 'positional',
      description: t('cli.toolId.description'),
      required: true,
    },
    yes: {
      type: 'boolean',
      description: t('remove.yes.description'),
      default: false,
    },
  },
  async run({ args }) {
    const toolId = String(args['tool-id']);
    const skipConfirm = args.yes === true;
    const appConfig = await loadAppConfig();
    const language = appConfig.language;

    const registry = await loadRegistry({ appConfig });
    const target = registry.findById(toolId);

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
      console.error(t('cli.builtin.readonly.delete', { toolId }, language));
      process.exit(1);
    }

    if (!skipConfirm) {
      const yes = await confirm({
        message: t('remove.confirm', { toolId }, language),
        initialValue: false,
      });
      if (!exitIfCanceled<boolean>(yes, language)) {
        outro(t('common.cancelled', {}, language));
        return;
      }
    }

    const toolsFile = await loadToolsFile();
    const updated: ToolsFile = {
      ...toolsFile,
      tools: toolsFile.tools.filter((t) => t.id !== toolId),
    };
    await saveToolsFile(updated);
    outro(t('remove.done', { toolId }, language));
  },
});
