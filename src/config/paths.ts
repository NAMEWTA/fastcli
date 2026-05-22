import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * 返回 fastcli 的配置根目录。
 *
 * 默认是 `<home>/.fastcli`（例如 macOS / Linux 上的 `~/.fastcli`）。
 *
 * 如果环境变量 `FASTCLI_HOME` 被设置为非空字符串，则直接以该值作为
 * 配置根目录（不再追加 `.fastcli`）。该开关仅用于测试隔离，让每个测试
 * 用例可以指向 `os.tmpdir()` 下的独立目录，避免读写真实 `~/.fastcli/`。
 *
 * 环境变量在每次调用时读取，因此测试可以在不同用例之间动态修改
 * `process.env.FASTCLI_HOME`。
 *
 * @returns 配置根目录的绝对路径。
 */
export function getConfigDir(): string {
  const override = process.env.FASTCLI_HOME;
  if (typeof override === 'string' && override.length > 0) {
    return override;
  }
  return join(homedir(), '.fastcli');
}

/**
 * 返回全局配置文件 `config.json` 的绝对路径。
 *
 * 路径基于 {@link getConfigDir} 计算，因此同样受 `FASTCLI_HOME` 影响。
 *
 * @returns `<configDir>/config.json` 的绝对路径。
 */
export function getAppConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

/**
 * 返回用户工具条目文件 `tools.json` 的绝对路径。
 *
 * 路径基于 {@link getConfigDir} 计算，因此同样受 `FASTCLI_HOME` 影响。
 *
 * @returns `<configDir>/tools.json` 的绝对路径。
 */
export function getToolsPath(): string {
  return join(getConfigDir(), 'tools.json');
}
