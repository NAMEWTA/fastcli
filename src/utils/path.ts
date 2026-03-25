import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * 获取配置目录路径
 * @returns ~/.fastcli/
 */
export function getConfigDir(): string {
  return join(homedir(), '.fastcli');
}

/**
 * 获取配置文件路径
 * @returns ~/.fastcli/config.json
 */
export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}
