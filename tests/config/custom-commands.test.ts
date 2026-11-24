import { execFile } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CustomCommandsCorruptError, CustomCommandChangedError, deleteCustomCommand, loadCustomCommands,
  saveCustomCommand } from '../../src/config/custom-commands.js';
import { fixture } from '../helpers.js';

let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => { f = await fixture(); vi.stubEnv('FASTCLI_HOME', f.env.FASTCLI_HOME!); });
afterEach(async () => { vi.unstubAllEnvs(); await f.cleanup(); });

const input = { name: 'Run task', shell: 'sh', command: '  printf "Two words"  ' } as const;

it('merges concurrent additions across separate Node processes and rejects a stale edit', async () => {
  const moduleUrl = new URL('../../src/config/custom-commands.ts', import.meta.url).href;
  const script = `import { registerHooks } from 'node:module';
    registerHooks({resolve(specifier, context, next) {
      if (context.parentURL?.endsWith('.ts') && specifier.startsWith('./') && specifier.endsWith('.js')) {
        return next(specifier.slice(0, -3) + '.ts', context);
      }
      return next(specifier, context);
    }});
    const { saveCustomCommand } = await import(${JSON.stringify(moduleUrl)});
    await saveCustomCommand({ ...${JSON.stringify(input)}, name: process.argv[1] });`;
  const run = promisify(execFile);
  const results = await Promise.allSettled(['First', 'Second'].map(name => run(process.execPath,
    ['--experimental-transform-types', '--input-type=module', '-e', script, name], { env: f.env, timeout: 10000 })));
  for (const result of results) if (result.status === 'rejected') throw result.reason;
  const initial = await loadCustomCommands();
  expect(initial.map(command => command.name).sort()).toEqual(['First', 'Second']);
  expect(initial.map(command => command.command)).toEqual([input.command, input.command]);
  const initialFirst = initial[0]!;
  await saveCustomCommand({ ...input, name: 'Revised' }, initialFirst);
  await expect(saveCustomCommand(input, initialFirst)).rejects.toBeInstanceOf(CustomCommandChangedError);
  await expect(deleteCustomCommand(initialFirst)).rejects.toBeInstanceOf(CustomCommandChangedError);
  expect(await loadCustomCommands()).toEqual([{ ...initialFirst, name: 'Revised' }, initial[1]]);
  if (process.platform !== 'win32') {
    const file = await stat(join(f.env.FASTCLI_HOME!, 'custom-commands.json'));
    expect(file.mode & 0o777).toBe(0o600);
  }
}, 15000);

it('preserves corrupt data and ignores the retired tools file', async () => {
  const file = join(f.env.FASTCLI_HOME!, 'custom-commands.json');
  const legacy = join(f.env.FASTCLI_HOME!, 'tools.json');
  const invalid = Buffer.from('[{"id":"only-an-id"}]\n');
  await mkdir(f.env.FASTCLI_HOME!);
  await writeFile(legacy, 'old command records');
  expect(await loadCustomCommands()).toEqual([]);
  await writeFile(file, invalid);
  await expect(loadCustomCommands()).rejects.toBeInstanceOf(CustomCommandsCorruptError);
  await expect(saveCustomCommand(input)).rejects.toBeInstanceOf(CustomCommandsCorruptError);
  expect(await readFile(file)).toEqual(invalid);
  expect(await readFile(legacy, 'utf8')).toBe('old command records');
});

it('preserves invalid UTF-8 and rejects the reserved Back value as a command ID', async () => {
  const file = join(f.env.FASTCLI_HOME!, 'custom-commands.json');
  await mkdir(f.env.FASTCLI_HOME!);
  const corrupt = Buffer.concat([
    Buffer.from('[{"id":"one","name":"Broken '), Buffer.from([0xff]),
    Buffer.from('","command":"printf x","shell":"sh"}]'),
  ]);
  for (const bytes of [corrupt, Buffer.from(JSON.stringify([{ ...input, id: ':back' }]))]) {
    await writeFile(file, bytes);
    await expect(loadCustomCommands()).rejects.toBeInstanceOf(CustomCommandsCorruptError);
    await expect(saveCustomCommand(input)).rejects.toBeInstanceOf(CustomCommandsCorruptError);
    expect(await readFile(file)).toEqual(bytes);
  }
});
