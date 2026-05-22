/**
 * `fastcli info <tool-id>`
 *
 * 输出该工具的基本字段（id、name、description、tags、source）以及所有
 * 已配置操作的 `op: command` 明细。找不到工具时走 fuzzy 建议。
 *
 * Validates: Requirements 3.5, 6.3
 */

import { defineCommand } from 'citty';

import { loadAppConfig } from '../../config/reader.js';
import { loadRegistry } from '../../core/registry.js';
import { suggestToolId } from '../../utils/fuzzy.js';
import { t } from '../../i18n.js';

export default defineCommand({
  meta: {
    name: 'info',
    description: t('info.description'),
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
    const tool = registry.findById(toolId);

    if (tool === undefined) {
      const candidates = registry.list().map((t) => t.id);
      const hint = suggestToolId(toolId, candidates);
      console.error(t('cli.notFound.tool', { toolId }, language));
      if (hint !== undefined) {
        console.error(t('cli.notFound.hint', { hint }, language));
      }
      console.error(t('cli.notFound.listHint', {}, language));
      process.exit(1);
    }

    // 基本信息
    console.log(`ID:          ${tool.id}`);
    console.log(t('info.name', { name: tool.name }, language));
    console.log(t('info.desc', {
      description: tool.description ?? t('common.none', {}, language),
    }, language));
    console.log(t('info.source', {
      source: tool.source === 'builtin'
        ? t('common.builtin', {}, language)
        : t('common.user', {}, language),
    }, language));
    if (tool.tags && tool.tags.length > 0) {
      console.log(t('info.tags', { tags: tool.tags.join(', ') }, language));
    }

    // 操作明细：仅列出值不为 undefined 的键，按字母序
    const ops = Object.entries(tool.commands)
      .filter(([, commands]) => commands !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));

    console.log('');
    console.log(t('info.ops', {}, language));
    if (ops.length === 0) {
      console.log(`  ${t('common.none', {}, language)}`);
    } else {
      for (const [op, commands] of ops) {
        console.log(`  ${op}:`);
        commands!.forEach((command, index) => {
          console.log(`    - [${index + 1}/${commands!.length}] ${command}`);
        });
      }
    }
  },
});
