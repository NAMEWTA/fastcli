import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, fakeCli } from '../helpers.js';
import { runCli } from '../../src/cli/app.js';
import { CancelledError, type PromptUI } from '../../src/cli/prompts.js';
import * as registry from '../../src/core/update-check.js';

let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => { f = await fixture(); vi.stubEnv('FASTCLI_HOME', f.env.FASTCLI_HOME!); });
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await f.cleanup(); });

it('shows the two version labels before the main menu and update later continues despite a legacy ignored version', async () => {
  vi.spyOn(registry, 'fetchRelease').mockResolvedValue({ version: '9.9.9' });
  await mkdir(f.env.FASTCLI_HOME!, { recursive: true });
  const state = join(f.env.FASTCLI_HOME!, 'update-state.json');
  const original = JSON.stringify({ version: 1, ignoredVersion: '9.9.9' });
  await writeFile(state, original);
  const menus: Array<{ message: string; values: string[] }> = [];
  const prompts: PromptUI = {
    async select(message, choices) {
      menus.push({ message, values: choices.map(choice => choice.value) });
      return choices.some(choice => choice.value === 'skip') ? 'skip' : 'exit';
    },
    confirm: async () => { throw new Error('Unexpected confirmation'); },
    info() {}, error() {}, intro() {}, outro() {},
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    expect(await runCli([], { version: '1.0.0', packageRoot: f.dir, prompts, interactive: true,
      env: { ...f.env, CI: '', FASTCLI_NO_UPDATE_CHECK: '' } })).toBe(0);
  }
  expect(menus.map(menu => menu.values)).toEqual([
    ['update', 'skip'], ['yolo', 'manage', 'settings', 'exit'],
    ['update', 'skip'], ['yolo', 'manage', 'settings', 'exit'],
  ]);
  expect(menus[0]!.message).toContain('Current version: v1.0.0');
  expect(menus[0]!.message).toContain('Latest version: v9.9.9');
  expect(await readFile(state, 'utf8')).toBe(original);
});

it('does not check updates for help, version, JSON config, previews, invalid arguments or non-TTY', async () => {
  const checkUpdate = vi.fn(async () => undefined);
  for (const args of [['--help'], ['--version'], ['config'], ['install', 'pi', '--dry-run'], ['install', 'missing'], ['--invalid'], ['install', 'pi', '--bad']]) {
    await runCli(args, { interactive: true, checkUpdate, env: { ...f.env, CI: '' } });
  }
  await fakeCli(f.bin, 'pi', 'process.exitCode=0;');
  await runCli(['pi'], { interactive: false, checkUpdate, env: f.env });
  await runCli(['pi'], { interactive: true, checkUpdate, env: { ...f.env, CI: '1' } });
  await runCli(['pi'], { interactive: true, checkUpdate, env: { ...f.env, FASTCLI_NO_UPDATE_CHECK: '1' } });
  expect(checkUpdate).not.toHaveBeenCalled();
});

it('checks once before launch; wrapper-like tool arguments remain literal and the resume marker is consumed', async () => {
  const log = join(f.dir, 'launch.json');
  await fakeCli(f.bin, 'pi', `require('fs').writeFileSync(${JSON.stringify(log)}, JSON.stringify({args:process.argv.slice(2),marker:process.env.FASTCLI_UPDATE_RESUME}));process.exitCode=17;`);
  const checkUpdate = vi.fn(async () => undefined);
  const args = ['pi', '--version', '--dry-run', 'literal space', '$(keep)'];
  expect(await runCli(args, { interactive: true, env: { ...f.env, CI: '' }, checkUpdate })).toBe(17);
  expect(checkUpdate).toHaveBeenCalledTimes(1);
  expect(JSON.parse(await readFile(log, 'utf8'))).toEqual({ args: args.slice(1) });
  expect(await runCli(args, { interactive: true, version: '2.0.0', env: { ...f.env, CI: '', FASTCLI_UPDATE_RESUME: '2.0.0' }, checkUpdate })).toBe(17);
  expect(checkUpdate).toHaveBeenCalledTimes(1);
  expect(JSON.parse(await readFile(log, 'utf8'))).toEqual({ args: args.slice(1) });
});

it('an update exit code or cancellation prevents the original command from running', async () => {
  const log = join(f.dir, 'should-not-exist');
  await fakeCli(f.bin, 'pi', `require('fs').writeFileSync(${JSON.stringify(log)}, 'bad');`);
  for (const code of [0, 1, 130, 19]) {
    expect(await runCli(['pi'], { interactive: true, env: { ...f.env, CI: '' }, checkUpdate: async () => code })).toBe(code);
  }
  expect(await runCli(['pi'], { interactive: true, env: { ...f.env, CI: '' }, checkUpdate: async () => { throw new CancelledError(); } })).toBe(130);
  await expect(readFile(log)).rejects.toThrow();
});
