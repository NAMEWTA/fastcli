import { existsSync } from 'node:fs';
import { getConfigPath } from '../../utils/path.js';
import { ensureConfigExists } from '../../core/config-manager.js';
import { logger } from '../../utils/logger.js';

export function configInit(): void {
  const configPath = getConfigPath();

  if (existsSync(configPath)) {
    logger.warn(`配置文件已存在: ${configPath}`);
    return;
  }

  ensureConfigExists(configPath);
  logger.success(`配置文件已创建: ${configPath}`);
}
