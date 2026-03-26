import { spawn } from 'node:child_process';
import { logger } from '../utils/logger.js';
import type { ExecResult } from '../types/index.js';

export interface ExecuteOptions {
  env?: NodeJS.ProcessEnv;
  interactive?: boolean;
}

/**
 * 执行 shell 命令
 * @param command - 要执行的命令
 * @returns 执行结果
 */
export async function executeCommand(
  command: string,
  options: ExecuteOptions = {}
): Promise<ExecResult> {
  logger.preview(command);

  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'powershell.exe' : '/bin/sh';
    const shellArg = isWindows ? '-Command' : '-c';

    const child = spawn(shell, [shellArg, command], {
      stdio: options.interactive ? 'inherit' : ['inherit', 'pipe', 'pipe'],
      env: options.env ?? process.env,
    });

    let stdout = '';
    let stderr = '';

    if (!options.interactive) {
      child.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        process.stdout.write(text);
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        process.stderr.write(text);
      });
    }

    child.on('close', (code) => {
      const success = code === 0;
      if (success) {
        logger.success('执行完成');
      } else {
        logger.error(`执行失败 (退出码: ${code})`);
      }

      resolve({
        success,
        code: code ?? 1,
        stdout,
        stderr,
      });
    });

    child.on('error', (err) => {
      logger.error(`执行出错: ${err.message}`);
      resolve({
        success: false,
        code: 1,
        stdout,
        stderr: err.message,
      });
    });
  });
}
