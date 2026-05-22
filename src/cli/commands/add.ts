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

import { loadToolsFile } from '../../config/reader.js';
import { saveToolsFile } from '../../config/writer.js';
import type {
  ToolCommands,
  ToolEntry,
  ToolsFile,
} from '../../config/schema.js';
import { loadRegistry } from '../../core/registry.js';
import { toSlug, uniqueSlug } from '../../utils/slug.js';
import { manageCommandsForNewTool } from './operation-editor.js';

/** id 合法性校验。 */
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const ID_MAX = 64;

function exitIfCanceled<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('已取消');
    process.exit(130);
  }
  return value;
}

function validateId(input: string, existing: Set<string>): string | undefined {
  if (input.length === 0) return '工具 ID 不能为空';
  if (input.length > ID_MAX) return `工具 ID 长度不能超过 ${ID_MAX}`;
  if (!ID_RE.test(input)) {
    return '工具 ID 只能包含小写字母、数字、连字符，且首字符为字母或数字';
  }
  if (existing.has(input)) return `工具 ID "${input}" 已存在`;
  return undefined;
}

export default defineCommand({
  meta: {
    name: 'add',
    description: '交互式添加用户工具',
  },
  async run() {
    intro('添加新工具');

    // 加载现有工具集合，用于 id 去重
    const registry = await loadRegistry();
    const existingIds = new Set(registry.list().map((t) => t.id));

    // 1. 工具名称（必填）
    const nameRaw = await text({
      message: '工具名称（必填）',
      validate(v) {
        if (typeof v !== 'string' || v.trim().length === 0) {
          return '工具名称不能为空';
        }
        return undefined;
      },
    });
    const name = exitIfCanceled<string>(nameRaw).trim();

    // 2. 工具 ID（留空 → 自动生成）
    const baseSlug = uniqueSlug(toSlug(name), existingIds);
    const idRaw = await text({
      message: `工具 ID（留空使用「${baseSlug}」）`,
      placeholder: baseSlug,
      validate(v) {
        if (typeof v !== 'string') return '请输入合法的工具 ID';
        if (v.length === 0) return undefined; // 允许留空走默认
        return validateId(v, existingIds);
      },
    });
    const idInput = exitIfCanceled<string>(idRaw).trim();
    const id = idInput.length > 0 ? idInput : baseSlug;

    // 3. 描述（可选）
    const descRaw = await text({
      message: '描述（可选）',
      placeholder: '一句话描述',
    });
    const desc = exitIfCanceled<string>(descRaw).trim();

    const commands: ToolCommands = {};
    await manageCommandsForNewTool(commands);

    // 5. 至少一个非空命令
    if (Object.keys(commands).length === 0) {
      cancel('至少需要配置一个命令，已放弃添加');
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

    outro(`已添加工具 "${id}"`);
  },
});
