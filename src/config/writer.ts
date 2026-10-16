import { getAppConfigPath } from './paths.js';
import { atomicWriteJson } from './atomic.js';
import type { AppConfig } from './schema.js';

export async function saveAppConfig(config: AppConfig): Promise<void> {
  await atomicWriteJson(getAppConfigPath(), { version: '2', packageManager: 'npm', language: config.language });
}
