/**
 * `fastcli add`
 *
 * 用 clack 串联式询问完成新增用户工具：
 *
 *   工具名称（必填）
 *   工具 ID（留空 → toSlug(name) + uniqueSlug 去重）
 *   描述（可选）
 *   install / update / uninstall 命令（各自可空）
 *   是否添加自定义操作 → 是 → 循环（操作名 + 命令；末尾「继续添加？」）
 *
 * 校验：
 * - id 正则 `^[a-z0-9][a-z0-9-]*$`，长度 1–64
 * - id 不得与 builtin / 现有 user 工具冲突
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
import { manageCommandsForNewTool } from './operation-editor.js';
import { t, type Language } from '../../i18n.js';

/** id 合法性校验。 */
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const ID_MAX = 64;

function exitIfCanceled<T>(value: T | symbol, language: Language): T {
  if (isCancel(value)) {
    cancel(t('common.cancelled', {}, language));
    process.exit(130);
  }
  return value;
}

function validateId(
  input: string,
  existing: Set<string>,
  language: Language,
): string | undefined {
  if (input.length === 0) return t('add.idRequired', {}, language);
  if (input.length > ID_MAX) return t('add.idTooLong', { max: ID_MAX }, language);
  if (!ID_RE.test(input)) {
    return t('add.idInvalid', {}, language);
  }
  if (existing.has(input)) return t('add.idExists', { id: input }, language);
  return undefined;
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
    const existingIds = new Set(registry.list().map((t) => t.id));

    // 1. 工具名称（必填）
    const nameRaw = await text({
      message: t('add.namePrompt', {}, language),
      validate(v) {
        if (typeof v !== 'string' || v.trim().length === 0) {
          return t('add.nameRequired', {}, language);
        }
        return undefined;
      },
    });
    const name = exitIfCanceled<string>(nameRaw, language).trim();

    // 2. 工具 ID（留空 → 自动生成）
    const baseSlug = uniqueSlug(toSlug(name), existingIds);
    const idRaw = await text({
      message: t('add.idPrompt', { id: baseSlug }, language),
      placeholder: baseSlug,
      validate(v) {
        if (typeof v !== 'string') return t('add.idInvalidInput', {}, language);
        if (v.length === 0) return undefined; // 允许留空走默认
        return validateId(v, existingIds, language);
      },
    });
    const idInput = exitIfCanceled<string>(idRaw, language).trim();
    const id = idInput.length > 0 ? idInput : baseSlug;

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
