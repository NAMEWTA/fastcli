/**
 * `fastcli list [--source=builtin|user] [--tag=<T>]`
 *
 * 输出格式（PRD §6.1）：
 *
 * ── 内置工具 ──
 *   <id>  <name>  <description-trunc>  已配置 N 个操作
 *   ...
 *
 * ── 自定义工具 ──
 *   <id>  <name>  <description-trunc>  已配置 N 个操作
 *
 * 同组内按 `name` 字母序排序。`--source` / `--tag` 过滤直接透传到
 * `Registry.list({ source?, tag? })`。
 *
 * Validates: Requirements 3.2, 3.3, 3.4
 */

import { defineCommand } from 'citty';

import { loadAppConfig } from '../../config/reader.js';
import { loadRegistry } from '../../core/registry.js';
import type { ToolEntry } from '../../config/schema.js';
import { t, type Language } from '../../i18n.js';

/** 描述截断字符宽度（PRD §6.1 提到 ~40 字符）。 */
const DESC_TRUNC = 40;

/** 把字符串截断到 width；超出时尾部加 `…`。 */
function truncate(s: string | undefined, width: number): string {
  if (s === undefined) return '';
  if (s.length <= width) return s;
  return `${s.slice(0, width - 1)}…`;
}

/** 统计已配置（值不为 undefined）的操作数。 */
function countOps(tool: ToolEntry): number {
  return Object.values(tool.commands).filter((v) => v !== undefined).length;
}

/** 把单个工具格式化成一行。 */
function formatLine(tool: ToolEntry, language: Language): string {
  const desc = truncate(tool.description, DESC_TRUNC);
  const ops = countOps(tool);
  return `  ${tool.id}  ${tool.name}  ${desc}  ${t('list.configuredOps', { count: ops }, language)}`;
}

/** 校验 `--source` 取值；无效时返回 undefined（视为不过滤）。 */
function parseSource(input: unknown): 'builtin' | 'user' | undefined {
  if (input === 'builtin' || input === 'user') return input;
  return undefined;
}

export default defineCommand({
  meta: {
    name: 'list',
    description: t('list.description'),
  },
  args: {
    source: {
      type: 'string',
      description: t('list.source.description'),
    },
    tag: {
      type: 'string',
      description: t('list.tag.description'),
    },
  },
  async run({ args }) {
    const appConfig = await loadAppConfig();
    const language = appConfig.language;
    const source = parseSource(args.source);
    const tag = typeof args.tag === 'string' && args.tag.length > 0
      ? args.tag
      : undefined;

    const registry = await loadRegistry({ appConfig });
    const filtered = registry.list({ source, tag });

    // 分组：仅在没指定 source 或 source === 'builtin' 时输出 builtin 段；
    // user 同理。这样 `--source=user` 时不会出现「── 内置工具 ──\n（空）」的
    // 视觉割裂。
    const builtin = filtered
      .filter((t) => t.source === 'builtin')
      .sort((a, b) => a.name.localeCompare(b.name));
    const user = filtered
      .filter((t) => t.source === 'user')
      .sort((a, b) => a.name.localeCompare(b.name));

    const showBuiltin = source === undefined || source === 'builtin';
    const showUser = source === undefined || source === 'user';

    if (showBuiltin) {
      console.log(`── ${t('common.builtinTools', {}, language)} ──`);
      if (builtin.length === 0) {
        console.log(`  ${t('common.none', {}, language)}`);
      } else {
        for (const tool of builtin) console.log(formatLine(tool, language));
      }
    }

    if (showBuiltin && showUser) {
      // 两组之间留一个空行作为视觉分隔。
      console.log('');
    }

    if (showUser) {
      console.log(`── ${t('common.userTools', {}, language)} ──`);
      if (user.length === 0) {
        console.log(`  ${t('common.none', {}, language)}`);
      } else {
        for (const tool of user) console.log(formatLine(tool, language));
      }
    }
  },
});
