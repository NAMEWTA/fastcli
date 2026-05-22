/**
 * `fastcli add`
 *
 * 用 clack 串联式询问完成新增用户工具：
 *
 *   工具名称（必填）
 *   工具 ID（由 name 自动生成）
 *   描述（可选）
 *   是否添加自定义操作 → 是 → 循环（操作名 + 命令；末尾「继续添加？」）
 *
 * 校验：
 * - name 不得与 builtin / 现有 user 工具重复
 * - id 由 name 生成，并避开 builtin / 现有 user 工具冲突
 * - 至少一个 commands 字段非空（避免完全空壳条目）
 *
 * Validates: Requirements 2.4, 3.6, 6.7
 */

import { cancel, intro, isCancel, outro, text } from '@clack/prompts';
import { defineCommand } from 'citty';

import { loadAppConfig, loadToolsFile } from '../../config/reader.js';
import { saveToolsFile } from '../../config/writer.js';
import type {
  ToolCommands,
  ToolEntry,
  ToolsFile,
} from '../../config/schema.js';
import { loadRegistry } from '../../core/registry.js';
import { toSlug, uniqueSlug } from '../../utils/slug.js';
import { hasToolName } from '../../utils/tool-name.js';
import { manageCommandsForNewTool } from './operation-editor.js';
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
    name: 'add',
    description: t('add.description'),
  },
  async run() {
    const appConfig = await loadAppConfig();
    const language = appConfig.language;
    intro(t('add.intro', {}, language));

    // 加载现有工具集合，用于 id 去重
    const registry = await loadRegistry({ appConfig });
    const existingTools = registry.list();
    const existingIds = new Set(existingTools.map((tool) => tool.id));

    // 1. 工具名称（必填）
    const nameRaw = await text({
      message: t('add.namePrompt', {}, language),
      validate(v) {
        if (typeof v !== 'string' || v.trim().length === 0) {
          return t('add.nameRequired', {}, language);
        }
        if (hasToolName(existingTools, v)) {
          return t('add.nameExists', { name: v.trim() }, language);
        }
        return undefined;
      },
    });
    const name = exitIfCanceled<string>(nameRaw, language).trim();

    // 2. 工具 ID 自动生成，不再要求用户填写。
    const id = uniqueSlug(toSlug(name), existingIds);

    // 3. 描述（可选）
    const descRaw = await text({
      message: t('add.descPrompt', {}, language),
      placeholder: t('add.descPlaceholder', {}, language),
    });
    const desc = exitIfCanceled<string>(descRaw, language).trim();

    const commands: ToolCommands = {};
    await manageCommandsForNewTool(commands, language);

    // 5. 至少一个非空命令
    if (Object.keys(commands).length === 0) {
      cancel(t('add.noCommands', {}, language));
      process.exit(1);
    }

    // 6. 写入 tools.json（合并既有条目）
    const toolsFile: ToolsFile = await loadToolsFile();
    const newEntry: ToolEntry = {
      id,
      name,
      description: desc.length > 0 ? desc : undefined,
      commands,
      source: 'user',
    };
    const updated: ToolsFile = {
      ...toolsFile,
      tools: [...toolsFile.tools, newEntry],
    };
    await saveToolsFile(updated);

    outro(t('add.done', { id }, language));
  },
});
