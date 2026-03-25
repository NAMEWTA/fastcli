import { existsSync } from 'node:fs';
import { loadConfig } from '../../core/config-manager.js';
import { logger } from '../../utils/logger.js';
import { getConfigPath } from '../../utils/path.js';
import pc from 'picocolors';

export function workflowList(): void {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.error('配置文件不存在，请先运行: fastcli config init');
    return;
  }

  const config = loadConfig(configPath);
  const workflows = Object.entries(config.workflows);

  if (workflows.length === 0) {
    logger.info('暂无工作流');
    return;
  }

  console.log();
  console.log(pc.bold('工作流列表:'));
  console.log();

  for (const [name, workflow] of workflows) {
    const stepCount = workflow.steps.length;
    console.log(`  ${pc.cyan(name)} (${stepCount} 步)`);
    if (workflow.description) {
      console.log(`    ${pc.dim(workflow.description)}`);
    }
  }
  console.log();
}
