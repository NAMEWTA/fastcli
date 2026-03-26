import { existsSync } from 'node:fs';
import { loadConfig } from '../core/config-manager.js';
import { resolveName, findSimilarNames } from '../core/name-resolver.js';
import { executeCommand } from '../core/executor.js';
import { runWorkflow } from '../core/workflow-runner.js';
import { logger } from '../utils/logger.js';
import { getConfigPath } from '../utils/path.js';

export interface RunOptions {
  dryRun?: boolean;
}

export async function run(name: string, options: RunOptions = {}): Promise<void> {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.error('配置文件不存在');
    logger.info('请先运行: fastcli config init');
    return;
  }

  const config = loadConfig(configPath);
  const result = resolveName(name, config);

  if (!result) {
    logger.error(`未找到: ${name}`);

    const similar = findSimilarNames(name, config);
    if (similar.length > 0) {
      logger.info(`你是否想要: ${similar.join(', ')}？`);
    }
    return;
  }

  if (result.type === 'alias') {
    console.log();
    if (options.dryRun) {
      logger.preview(`将执行: ${result.data.command}`);
    } else {
      await executeCommand(result.data.command);
    }
  } else {
    await runWorkflow(result.data, options.dryRun, { config });
  }
}
