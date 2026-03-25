import { loadConfig, saveConfig, ensureConfigExists } from '../../core/config-manager.js';
import { isNameAvailable } from '../../core/name-resolver.js';
import { logger } from '../../utils/logger.js';
import { getConfigPath } from '../../utils/path.js';

export function aliasAdd(
  name: string,
  command: string,
  options: { description?: string }
): void {
  const configPath = getConfigPath();
  ensureConfigExists(configPath);

  const config = loadConfig(configPath);

  if (!isNameAvailable(name, config)) {
    logger.error(`名称 "${name}" 已被使用`);
    return;
  }

  config.aliases[name] = {
    command,
    description: options.description,
  };

  saveConfig(config, configPath);
  logger.success(`别名已添加: ${name} → ${command}`);
}
