/**
 * `fastcli config` / `fastcli config edit`
 *
 * - 默认子动作：打印格式化后的 `config.json`（如不存在则打印默认值）。
 * - `config edit` 子命令：依次尝试 `config.editor` → `$EDITOR` → `vi`
 *   打开 `~/.fastcli/config.json`；都不可用时报错并提示如何设置 `$EDITOR`。
 *
 * Validates: Requirements 3.9, 3.10
 */

import { spawn } from 'node:child_process';

import { defineCommand } from 'citty';

import {
  getAppConfigPath,
  getConfigDir,
  getToolsPath,
} from '../../config/paths.js';
import { loadAppConfig } from '../../config/reader.js';
import { saveAppConfig } from '../../config/writer.js';
import { t } from '../../i18n.js';

const editCommand = defineCommand({
  meta: {
    name: 'edit',
    description: t('config.edit.description'),
  },
  async run() {
    const config = await loadAppConfig();
    const language = config.language;
    const path = getAppConfigPath();

    // 如果配置文件还没落盘（首次使用），先把默认值写下去再打开。
    // 这样 `config edit` 永远是「编辑现有文件」的语义。
    await saveAppConfig(config);

    // 编辑器优先级：config.editor → $EDITOR → vi
    const candidates = [config.editor, process.env.EDITOR, 'vi']
      .filter((s): s is string => typeof s === 'string' && s.length > 0);

    if (candidates.length === 0) {
      console.error(t('config.noEditor', {}, language));
      process.exit(1);
    }

    const editor = candidates[0]!;

    return new Promise<void>((resolve) => {
      const child = spawn(editor, [path], { stdio: 'inherit' });
      child.on('error', (err) => {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
          console.error(t('config.editorNotFound', { editor }, language));
          console.error(t('config.setEditorHint', {}, language));
        } else {
          console.error(t('config.editorFailed', { message: err.message }, language));
        }
        process.exit(1);
      });
      child.on('exit', (code) => {
        // 编辑器以非 0 退出时也算「正常关闭」（vim :q! 会返回 0）；
        // 仅打印提示，不强行失败。
        if (code !== 0 && code !== null) {
          console.warn(t('config.editorExit', { code }, language));
        }
        resolve();
      });
    });
  },
});

export default defineCommand({
  meta: {
    name: 'config',
    description: t('config.description'),
  },
  subCommands: {
    edit: editCommand,
  },
  async run() {
    const config = await loadAppConfig();
    const language = config.language;
    console.error(t('config.dir', { path: getConfigDir() }, language));
    console.error(t('config.file', { path: getAppConfigPath() }, language));
    console.error(t('config.toolsFile', { path: getToolsPath() }, language));
    // PRD §6.1：JSON 格式化输出，2 空格缩进
    console.log(JSON.stringify(config, null, 2));
  },
});
