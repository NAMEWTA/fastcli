import { randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { atomicWriteJson } from './atomic.js';
import { getConfigDir } from './paths.js';

export const COMMAND_SHELLS = ['cmd', 'pwsh', 'powershell', 'sh'] as const;
export type CommandShell = typeof COMMAND_SHELLS[number];
export interface CommandInput { name: string; shell: CommandShell; command: string }
export interface CustomCommand extends CommandInput { id: string }

export class CustomCommandsCorruptError extends Error {
  constructor(readonly path: string) { super(`Invalid custom command file: ${path}`); }
}
export class CustomCommandChangedError extends Error {}

export function validCommandName(name: string): boolean {
  return Boolean(name.trim()) && !/[\p{Cc}\u2028\u2029]/u.test(name);
}

export function validCommandLine(command: string): boolean {
  return Boolean(command.trim()) && !/[\p{Cc}\u2028\u2029]/u.test(command.replaceAll('\t', ''));
}

function validInput(value: unknown): value is CommandInput {
  if (!value || typeof value !== 'object') return false;
  const { name, shell, command } = value as Partial<CommandInput>;
  return typeof name === 'string' && validCommandName(name) && shell !== undefined && COMMAND_SHELLS.includes(shell)
    && typeof command === 'string' && validCommandLine(command);
}

function validRecord(value: unknown): value is CustomCommand {
  return validInput(value) && 'id' in value && typeof value.id === 'string' && Boolean(value.id.trim()) && value.id !== ':back';
}

async function readCommands(path: string): Promise<CustomCommand[]> {
  let raw: Buffer;
  try { raw = await readFile(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); }
  catch { throw new CustomCommandsCorruptError(path); }
  if (!Array.isArray(parsed) || !parsed.every(validRecord) || new Set(parsed.map(command => command.id)).size !== parsed.length) {
    throw new CustomCommandsCorruptError(path);
  }
  return parsed;
}

const commandsPath = () => join(getConfigDir(), 'custom-commands.json');

export function loadCustomCommands(): Promise<CustomCommand[]> {
  return readCommands(commandsPath());
}

async function changeCommands(change: (commands: CustomCommand[]) => void): Promise<void> {
  const path = commandsPath();
  const { default: lockfile } = await import('proper-lockfile');
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const release = await lockfile.lock(path, { realpath: false,
    retries: { retries: 12, factor: 1.5, minTimeout: 20, maxTimeout: 150 } });
  try {
    const commands = await readCommands(path);
    change(commands);
    await atomicWriteJson(path, commands);
  } finally {
    await release();
  }
}

function unchangedIndex(commands: CustomCommand[], previous: CustomCommand): number {
  const index = commands.findIndex(command => command.id === previous.id);
  const current = commands[index];
  if (!current || current.name !== previous.name || current.shell !== previous.shell || current.command !== previous.command) {
    throw new CustomCommandChangedError();
  }
  return index;
}

export function saveCustomCommand(input: CommandInput, previous?: CustomCommand): Promise<void> {
  if (!validInput(input)) throw new TypeError('Invalid custom command');
  const record = { id: previous?.id ?? randomUUID(), name: input.name.trim(), shell: input.shell, command: input.command };
  return changeCommands(commands => {
    if (previous) commands[unchangedIndex(commands, previous)] = record;
    else commands.push(record);
  });
}

export function deleteCustomCommand(previous: CustomCommand): Promise<void> {
  return changeCommands(commands => { commands.splice(unchangedIndex(commands, previous), 1); });
}
