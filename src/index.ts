import { Command } from 'commander';
import { configInit, configEdit, configShow } from './commands/config/index.js';
import { aliasAdd, aliasRemove, aliasList } from './commands/alias/index.js';
import { workflowList, workflowShow } from './commands/workflow/index.js';
import { webStart } from './commands/web/index.js';
import { run } from './commands/run.js';

const program = new Command();

program
  .name('fastcli')
  .description('终端命令别名和交互式工作流管理工具')
  .version('1.0.0');

// config 命令组
const configCmd = program.command('config').description('配置管理');

configCmd
  .command('init')
  .description('初始化配置文件')
  .action(configInit);

configCmd
  .command('edit')
  .description('编辑配置文件')
  .action(configEdit);

configCmd
  .command('show')
  .description('显示配置内容')
  .action(configShow);

// alias 命令组
const aliasCmd = program.command('alias').description('别名管理');

aliasCmd
  .command('add <name> <command>')
  .description('添加新别名')
  .option('-d, --description <desc>', '别名描述')
  .action(aliasAdd);

aliasCmd
  .command('rm <name>')
  .description('删除别名')
  .action(aliasRemove);

aliasCmd
  .command('ls')
  .description('列出所有别名')
  .action(aliasList);

// workflow 命令组
const workflowCmd = program.command('workflow').description('工作流管理');

workflowCmd
  .command('ls')
  .description('列出所有工作流')
  .action(workflowList);

workflowCmd
  .command('show <name>')
  .description('显示工作流结构')
  .action(workflowShow);

// web 命令
program
  .command('web')
  .description('启动本地 Web 管理后台')
  .action(webStart);

// 默认命令：运行别名或工作流
program
  .argument('[name]', '别名或工作流名称')
  .option('--dry-run', '预览命令但不执行')
  .action(async (name: string | undefined, options: { dryRun?: boolean }) => {
    if (!name) {
      program.help();
      return;
    }
    await run(name, { dryRun: options.dryRun });
  });

program.parse();
