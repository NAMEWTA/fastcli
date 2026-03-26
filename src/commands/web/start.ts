import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { logger } from '../../utils/logger.js';

export interface WebServerInfo {
  url: string;
  token: string;
}

export interface WebStartDeps {
  startServer?: () => Promise<WebServerInfo>;
  openBrowser?: (url: string) => Promise<void> | void;
  logger?: Pick<typeof logger, 'info' | 'error'>;
}

async function startWebServer(): Promise<WebServerInfo> {
  return {
    url: 'http://127.0.0.1:5173',
    token: randomBytes(6).toString('hex'),
  };
}

export async function openBrowser(url: string): Promise<void> {
  const commandByPlatform: Record<string, { command: string; args: string[] }> = {
    win32: { command: 'cmd', args: ['/c', 'start', '', url] },
    darwin: { command: 'open', args: [url] },
    linux: { command: 'xdg-open', args: [url] },
  };

  const launcher = commandByPlatform[process.platform] ?? commandByPlatform.linux;
  await new Promise<void>((resolve, reject) => {
    try {
      const child = spawn(launcher.command, launcher.args, {
        detached: true,
        stdio: 'ignore',
      });

      const onSpawn = () => {
        child.removeListener('error', onError);
        child.unref();
        resolve();
      };

      const onError = (error: Error) => {
        child.removeListener('spawn', onSpawn);
        reject(error);
      };

      child.once('spawn', onSpawn);
      child.once('error', onError);
    } catch (error) {
      reject(error);
    }
  });
}

export async function webStart(deps: WebStartDeps = {}): Promise<void> {
  const startServer = deps.startServer ?? startWebServer;
  const browserOpener = deps.openBrowser ?? openBrowser;
  const webLogger = deps.logger ?? logger;

  try {
    const { url, token } = await startServer();

    webLogger.info(`Web 管理后台已启动: ${url}`);
    webLogger.info(`一次性口令: ${token}`);

    try {
      await browserOpener(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      webLogger.error(`自动打开浏览器失败: ${message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    webLogger.error(`启动 Web 管理后台失败: ${message}`);
  }
}
