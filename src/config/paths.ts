import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

/** FASTCLI_HOME is an automation/test boundary; user configuration lives in ~/.fastcli. */
export function getConfigDir(): string {
  return process.env.FASTCLI_HOME ? resolve(process.env.FASTCLI_HOME) : join(homedir(), '.fastcli');
}
export function getAppConfigPath(): string { return join(getConfigDir(), 'config.json'); }
