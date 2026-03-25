import { existsSync, readFileSync } from 'node:fs';
import { getConfigPath } from '../../utils/path.js';
import { logger } from '../../utils/logger.js';

export function configShow(): void {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.error(`配置文件不存在: ${configPath}`);
    logger.info('请先运行: fastcli config init');
    return;
  }

  logger.info(`配置文件路径: ${configPath}`);
  console.log();
  console.log(readFileSync(configPath, 'utf-8'));
}
