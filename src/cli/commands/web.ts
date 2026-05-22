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
import { t, type Language } from '../../i18n.js';

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
    description: t('web.description'),
  },
  args: {
    port: {
      type: 'string',
      description: t('web.port.description'),
    },
    'no-open': {
      type: 'boolean',
      description: t('web.noOpen.description'),
      default: false,
    },
  },
  async run({ args }) {
    let language: Language = 'en';
    try {
      const appConfig = await loadAppConfig();
      language = appConfig.language;
      await loadToolsFile();
    } catch (err) {
      if (err instanceof ConfigCorruptError) {
        console.error(
          t('web.configCorrupt', { path: err.path }, language),
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
    console.log(t('web.started', { url }, language));

    if (args['no-open'] !== true) {
      try {
        await open(url);
      } catch {
        console.warn(t('web.openFailed', { url }, language));
      }
    }

    await waitForShutdown();
    await new Promise<void>((resolve) => {
      started.server.close(() => resolve());
    });
    process.exit(0);
  },
});
