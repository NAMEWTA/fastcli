import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { getAppConfigPath } from './paths.js';
import { atomicWriteJson } from './atomic.js';
import { DEFAULT_APP_CONFIG, type AppConfig } from './schema.js';
import { normalizeLanguage } from '../i18n.js';

export class ConfigCorruptError extends Error {
  constructor(public readonly path: string) { super(`Invalid configuration / 配置文件损坏: ${path}`); }
}
export class ConfigVersionTooNewError extends Error {
  constructor(public readonly path: string, public readonly version: string) { super(`Configuration version ${version} is too new; upgrade fastcli / 请升级 fastcli: ${path}`); }
}

/** Never reads tools.json. Migration preserves exact original bytes before replacing old configuration. */
export async function loadAppConfig(options: { migrate?: boolean } = {}): Promise<AppConfig> {
  const path = getAppConfigPath();
  let raw: Buffer;
  try { raw = await readFile(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { ...DEFAULT_APP_CONFIG }; throw error; }
  let parsed: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(raw.toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    parsed = value as Record<string, unknown>;
  } catch { throw new ConfigCorruptError(path); }
  if (typeof parsed.version === 'string' && Number(parsed.version) > 2) throw new ConfigVersionTooNewError(path, parsed.version);
  if (parsed.version !== undefined && parsed.version !== '1' && parsed.version !== '2') throw new ConfigCorruptError(path);
  const config: AppConfig = { version: '2', packageManager: 'npm', language: normalizeLanguage(parsed.language) };
  const migrationNeeded = Object.keys(parsed).length !== 3 || parsed.version !== '2' || parsed.packageManager !== 'npm' || parsed.language !== config.language;
  if (migrationNeeded && options.migrate !== false) {
    const backup = `${path}.bak.${Date.now()}.${randomUUID()}`;
    await writeFile(backup, raw, { flag: 'wx', mode: 0o600 });
    // Do not replace edits made while the backup was being written.
    if (!(await readFile(path)).equals(raw)) throw new Error(`Configuration changed during migration: ${path}`);
    await atomicWriteJson(path, config);
    console.error(`Configuration migrated / 配置已迁移 → npm. Backup / 备份: ${backup}`);
  }
  return config;
}
