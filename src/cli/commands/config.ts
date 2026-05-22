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

const editCommand = defineCommand({
  meta: {
    name: 'edit',
    description: '使用编辑器打开 config.json',
  },
  async run() {
    const config = await loadAppConfig();
    const path = getAppConfigPath();

    // 如果配置文件还没落盘（首次使用），先把默认值写下去再打开。
    // 这样 `config edit` 永远是「编辑现有文件」的语义。
    await saveAppConfig(config);

    // 编辑器优先级：config.editor → $EDITOR → vi
    const candidates = [config.editor, process.env.EDITOR, 'vi']
      .filter((s): s is string => typeof s === 'string' && s.length > 0);

    if (candidates.length === 0) {
      console.error('未找到可用的编辑器。请设置 config.editor 或 $EDITOR 环境变量。');
      process.exit(1);
    }

    const editor = candidates[0]!;

    return new Promise<void>((resolve) => {
      const child = spawn(editor, [path], { stdio: 'inherit' });
      child.on('error', (err) => {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
          console.error(`未找到编辑器：${editor}`);
          console.error('请设置 config.editor 或 $EDITOR 环境变量为可用编辑器。');
        } else {
          console.error(`启动编辑器失败：${err.message}`);
        }
        process.exit(1);
      });
      child.on('exit', (code) => {
        // 编辑器以非 0 退出时也算「正常关闭」（vim :q! 会返回 0）；
        // 仅打印提示，不强行失败。
        if (code !== 0 && code !== null) {
          console.warn(`编辑器以退出码 ${code} 关闭`);
        }
        resolve();
      });
    });
  },
});

export default defineCommand({
  meta: {
    name: 'config',
    description: '查看或编辑 fastcli 配置',
  },
  subCommands: {
    edit: editCommand,
  },
  async run() {
    const config = await loadAppConfig();
    console.error(`配置目录：${getConfigDir()}`);
    console.error(`config.json：${getAppConfigPath()}`);
    console.error(`tools.json：${getToolsPath()}`);
    // PRD §6.1：JSON 格式化输出，2 空格缩进
    console.log(JSON.stringify(config, null, 2));
  },
});
