import { existsSync } from 'node:fs';
import { loadConfig } from '../../core/config-manager.js';
import { logger } from '../../utils/logger.js';
import { getConfigPath } from '../../utils/path.js';
import pc from 'picocolors';

export function aliasList(): void {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.error('配置文件不存在，请先运行: fastcli config init');
    return;
  }

  const config = loadConfig(configPath);
  const aliases = Object.entries(config.aliases);

  if (aliases.length === 0) {
    logger.info('暂无别名');
    return;
  }

  console.log();
  console.log(pc.bold('别名列表:'));
  console.log();

  for (const [name, alias] of aliases) {
    console.log(`  ${pc.cyan(name)} → ${alias.command}`);
    if (alias.description) {
      console.log(`    ${pc.dim(alias.description)}`);
    }
  }
  console.log();
}
