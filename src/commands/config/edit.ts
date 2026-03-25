import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { getConfigPath } from '../../utils/path.js';
import { logger } from '../../utils/logger.js';

export function configEdit(): void {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.error(`配置文件不存在: ${configPath}`);
    logger.info('请先运行: fastcli config init');
    return;
  }

  const isWindows = process.platform === 'win32';
  const editor = process.env.EDITOR || (isWindows ? 'notepad' : 'vi');

  logger.info(`使用 ${editor} 打开配置文件...`);

  const child = spawn(editor, [configPath], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (err) => {
    logger.error(`无法打开编辑器: ${err.message}`);
  });
}
