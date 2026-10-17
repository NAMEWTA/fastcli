import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, fakeCli } from '../helpers.js';
import { runCli } from '../../src/cli/app.js';
import { CancelledError } from '../../src/cli/prompts.js';

let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => { f = await fixture(); vi.stubEnv('FASTCLI_HOME', f.env.FASTCLI_HOME!); });
afterEach(async () => { vi.unstubAllEnvs(); await f.cleanup(); });

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
