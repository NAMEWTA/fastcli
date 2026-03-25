import pc from 'picocolors';

export const logger = {
  info(message: string): void {
    console.log(pc.blue('ℹ'), message);
  },

  success(message: string): void {
    console.log(pc.green('✓'), message);
  },

  error(message: string): void {
    console.error(pc.red('✗'), message);
  },

  warn(message: string): void {
    console.log(pc.yellow('⚠'), message);
  },

  preview(command: string): void {
    console.log(pc.cyan('→'), pc.dim('执行:'), command);
  },

  step(current: number, total: number, message: string): void {
    console.log(pc.dim(`[步骤 ${current}/${total}]`), message);
  },

  choice(message: string): void {
    console.log(pc.cyan('→'), pc.dim('选择:'), message);
  },
};
