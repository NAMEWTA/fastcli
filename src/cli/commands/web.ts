import { randomBytes } from 'node:crypto';

import { defineCommand } from 'citty';
import open from 'open';

import {
  ConfigCorruptError,
  loadAppConfig,
  loadToolsFile,
} from '../../config/reader.js';
import {
  createWebApp,
  listenOnAvailablePort,
} from '../../web-server/server.js';

function parsePort(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  return 3000;
}

function waitForShutdown(): Promise<NodeJS.Signals> {
  return new Promise((resolve) => {
    const done = (signal: NodeJS.Signals): void => {
      process.off('SIGINT', onSigint);
      process.off('SIGTERM', onSigterm);
      resolve(signal);
    };
    const onSigint = (): void => done('SIGINT');
    const onSigterm = (): void => done('SIGTERM');
    process.once('SIGINT', onSigint);
    process.once('SIGTERM', onSigterm);
  });
}

export default defineCommand({
  meta: {
    name: 'web',
    description: '启动本地 Web 编辑器',
  },
  args: {
    port: {
      type: 'string',
      description: '起始端口，默认 3000',
    },
    'no-open': {
      type: 'boolean',
      description: '启动后不自动打开浏览器',
      default: false,
    },
  },
  async run({ args }) {
    try {
      await loadAppConfig();
      await loadToolsFile();
    } catch (err) {
      if (err instanceof ConfigCorruptError) {
        console.error(
          `配置文件损坏：${err.path}，请运行 fastcli config edit 修复后再启动 web 编辑器`,
        );
        process.exit(1);
      }
      throw err;
    }

    const token = randomBytes(32).toString('hex');
    const startPort = parsePort(args.port);
    const app = createWebApp({ token });

    let started;
    try {
      started = await listenOnAvailablePort(app, startPort);
    } catch (err) {
      if (err instanceof Error && err.message.includes('端口')) {
        console.error(err.message);
        process.exit(1);
      }
      throw err;
    }

    const url = `http://127.0.0.1:${started.port}?token=${token}`;
    console.log(`Web 编辑器已启动：${url}`);

    if (args['no-open'] !== true) {
      try {
        await open(url);
      } catch {
        console.warn(`无法自动打开浏览器，请手动访问：${url}`);
      }
    }

    await waitForShutdown();
    await new Promise<void>((resolve) => {
      started.server.close(() => resolve());
    });
    process.exit(0);
  },
});
