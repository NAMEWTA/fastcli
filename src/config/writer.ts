import {
  getAppConfigPath,
  getToolsPath,
} from './paths.js';
import type { AppConfig, ToolsFile } from './schema.js';
import { atomicWriteJson } from './atomic.js';

/**
 * 原子地写入 `~/.fastcli/config.json`。
 *
 * 写入完成后,在 POSIX 平台上文件权限为 `0o600`,在 Windows 上权限调用
 * 失败会被静默忽略(NTFS 无对应语义)。任一步骤失败都不会留下半写入的
 * 目标文件。
 *
 * @param config 要写入的 {@link AppConfig} 对象。
 */
export async function saveAppConfig(config: AppConfig): Promise<void> {
  await atomicWriteJson(getAppConfigPath(), config);
}

/**
 * 原子地写入 `~/.fastcli/tools.json`。
 *
 * 写入完成后,在 POSIX 平台上文件权限为 `0o600`,在 Windows 上权限调用
 * 失败会被静默忽略(NTFS 无对应语义)。任一步骤失败都不会留下半写入的
 * 目标文件。
 *
 * @param tools 要写入的 {@link ToolsFile} 对象。
 */
export async function saveToolsFile(tools: ToolsFile): Promise<void> {
  await atomicWriteJson(getToolsPath(), tools);
}
