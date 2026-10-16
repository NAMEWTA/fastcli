import type { Language } from '../i18n.js';

export const SCHEMA_VERSION = '2' as const;
export interface AppConfig {
  version: '2';
  packageManager: 'npm';
  language: Language;
}
export const DEFAULT_APP_CONFIG: AppConfig = { version: '2', packageManager: 'npm', language: 'en' };
