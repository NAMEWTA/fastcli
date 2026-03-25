import { loadConfig, saveConfig } from '../../core/config-manager.js';
import { logger } from '../../utils/logger.js';
import { getConfigPath } from '../../utils/path.js';
import { existsSync } from 'node:fs';

export function aliasRemove(name: string): void {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.error('配置文件不存在，请先运行: fastcli config init');
    return;
  }

  const config = loadConfig(configPath);

  if (!(name in config.aliases)) {
    logger.error(`别名 "${name}" 不存在`);
    return;
  }

  delete config.aliases[name];
  saveConfig(config, configPath);
  logger.success(`别名已删除: ${name}`);
}
