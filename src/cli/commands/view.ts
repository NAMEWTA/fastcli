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

export interface ViewOptions {
  port?: unknown;
  noOpen?: boolean;
}

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

export async function startViewEditor(options: ViewOptions = {}): Promise<void> {
  let language: Language = 'en';
  try {
    const appConfig = await loadAppConfig();
    language = appConfig.language;
    await loadToolsFile();
  } catch (err) {
    if (err instanceof ConfigCorruptError) {
      console.error(
        t('view.configCorrupt', { path: err.path }, language),
      );
      process.exit(1);
    }
    throw err;
  }

  const token = randomBytes(32).toString('hex');
  const startPort = parsePort(options.port);
  const app = createWebApp({ token });

  let started;
  try {
    started = await listenOnAvailablePort(app, startPort);
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('Ports') || err.message.includes('端口'))
    ) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }

  const url = `http://127.0.0.1:${started.port}?token=${token}`;
  console.log(t('view.started', { url }, language));

  if (options.noOpen !== true) {
    try {
      await open(url);
    } catch {
      console.warn(t('view.openFailed', { url }, language));
    }
  }

  await waitForShutdown();
  await new Promise<void>((resolve) => {
    started.server.close(() => resolve());
  });
}

export default defineCommand({
  meta: {
    name: 'view',
    description: t('view.description'),
  },
  args: {
    port: {
      type: 'string',
      description: t('view.port.description'),
    },
    'no-open': {
      type: 'boolean',
      description: t('view.noOpen.description'),
      default: false,
    },
  },
  async run({ args }) {
    await startViewEditor({
      port: args.port,
      noOpen: args['no-open'] === true,
    });
  },
});
