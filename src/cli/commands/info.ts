/**
 * `fastcli info <tool-id>`
 *
 * 输出该工具的基本字段（id、name、description、tags、source）以及所有
 * 已配置操作的 `op: command` 明细。找不到工具时走 fuzzy 建议。
 *
 * Validates: Requirements 3.5, 6.3
 */

import { defineCommand } from 'citty';

import { loadRegistry } from '../../core/registry.js';
import { suggestToolId } from '../../utils/fuzzy.js';

export default defineCommand({
  meta: {
    name: 'info',
    description: '查看某个工具的详细信息',
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
    const tool = registry.findById(toolId);

    if (tool === undefined) {
      const candidates = registry.list().map((t) => t.id);
      const hint = suggestToolId(toolId, candidates);
      console.error(`找不到工具 "${toolId}"`);
      if (hint !== undefined) {
        console.error(`你是否想要：${hint}？`);
      }
      console.error('运行 fastcli list 查看所有工具');
      process.exit(1);
    }

    // 基本信息
    console.log(`ID:          ${tool.id}`);
    console.log(`名称:        ${tool.name}`);
    console.log(`描述:        ${tool.description ?? '（无）'}`);
    console.log(`来源:        ${tool.source === 'builtin' ? '内置' : '自定义'}`);
    if (tool.tags && tool.tags.length > 0) {
      console.log(`标签:        ${tool.tags.join(', ')}`);
    }

    // 操作明细：仅列出值不为 undefined 的键，按字母序
    const ops = Object.entries(tool.commands)
      .filter(([, commands]) => commands !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));

    console.log('');
    console.log('操作:');
    if (ops.length === 0) {
      console.log('  （无）');
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
