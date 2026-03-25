import { existsSync } from 'node:fs';
import { loadConfig } from '../../core/config-manager.js';
import { logger } from '../../utils/logger.js';
import { getConfigPath } from '../../utils/path.js';
import pc from 'picocolors';

export function workflowShow(name: string): void {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.error('配置文件不存在，请先运行: fastcli config init');
    return;
  }

  const config = loadConfig(configPath);

  if (!(name in config.workflows)) {
    logger.error(`工作流 "${name}" 不存在`);
    return;
  }

  const workflow = config.workflows[name];

  console.log();
  console.log(pc.bold(`工作流: ${name}`));
  if (workflow.description) {
    console.log(pc.dim(workflow.description));
  }
  console.log();

  for (const step of workflow.steps) {
    console.log(`${pc.cyan('●')} ${pc.bold(step.id)}: ${step.prompt}`);

    for (const option of step.options) {
      const arrow = option.next ? `→ ${pc.yellow(option.next)}` : '';
      const cmd = option.command ? `→ ${pc.green(option.command)}` : '';
      console.log(`  └─ ${option.name} ${arrow}${cmd}`);
    }
    console.log();
  }
}
