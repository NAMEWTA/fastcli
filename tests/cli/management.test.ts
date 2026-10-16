import { afterEach, beforeEach, expect, it } from 'vitest';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, fakeCli, fakeNpm, cli, comparablePath } from '../helpers.js';

let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => { f = await fixture(); });
afterEach(async () => { await f.cleanup(); });

it('installs/upgrades only the npm target and requires explicit non-TTY uninstall consent', async () => {
  const npm = await fakeNpm(f);
  const external = await fakeCli(f.bin, 'claude', 'console.log("1.0.0");');
  const userData = join(f.dir, '.claude', 'settings.json');
  await mkdir(join(f.dir, '.claude')); await writeFile(userData, '{"keep":true}');
  for (const action of ['install', 'upgrade']) {
    const result = await cli([action, 'claude'], f.env, f.dir);
    expect(result.code).toBe(0);
    expect(result.stderr).toContain(npm.prefix);
    expect(result.stderr).toContain('9.8.7');
    expect(result.stderr).toContain('only changes the npm target');
  }
  const refused = await cli(['uninstall', 'claude'], f.env);
  expect(refused.code).toBe(1); expect(refused.stderr).toContain('--yes');
  const removed = await cli(['uninstall', 'claude', '--yes'], f.env);
  expect(removed.code).toBe(0);
  expect(removed.stderr).toContain('Remaining launchable installations');
  expect(comparablePath(removed.stderr)).toContain(comparablePath(external));
  expect(await readFile(userData, 'utf8')).toBe('{"keep":true}');
  expect((await cli(['claude'], f.env)).stdout.trim()).toBe('1.0.0');
  const events = (await readFile(npm.log, 'utf8')).trim().split('\n').map(line => JSON.parse(line) as string[]);
  expect(events.filter(args => args[0] === 'uninstall')).toEqual([['uninstall', '-g', '@anthropic-ai/claude-code']]);
  expect(events.filter(args => args[0] === 'i')).toHaveLength(2);
});

it('prints all six tools and info diagnoses an executable with a failing version command', async () => {
  await fakeNpm(f);
  const entry = await fakeCli(f.bin, 'codex', 'console.error("broken runtime");process.exitCode=8;');
  const list = await cli(['list'], f.env);
  expect(list.code).toBe(0);
  expect(list.stdout.match(/ — /g)).toHaveLength(6);
  expect(list.stdout).toContain('Version unknown');
  const info = await cli(['info', 'codex'], f.env);
  expect(info.code).toBe(0);
  expect(comparablePath(info.stdout)).toContain(comparablePath(entry));
  expect(info.stdout).toContain('broken runtime');
  expect(info.stdout).toContain('npm target');
  expect(info.stdout).toContain('--dangerously-bypass-approvals-and-sandbox');
});

it('reports partial npm failures as installed and never retries the command', async () => {
  const npm = await fakeNpm(f);
  const result = await cli(['install', 'pi'], { ...f.env, TEST_NPM_FAIL: '23' });
  expect(result.code).toBe(23);
  expect(result.stderr).toContain('checked again');
  expect(result.stderr).toContain('Installed');
  const events = (await readFile(npm.log, 'utf8')).trim().split('\n').map(line => JSON.parse(line) as string[]);
  expect(events.filter(args => args[0] === 'i')).toEqual([['i', '-g', '@earendil-works/pi-coding-agent@latest']]);
});

it('includes the current npm prefix when choosing among non-PATH installations', async () => {
  await fakeNpm(f);
  expect((await cli(['install', 'claude'], f.env)).code).toBe(0);
  const local = join(f.dir, '.local', 'bin');
  await mkdir(local, { recursive: true });
  await fakeCli(local, 'claude', 'console.log("unexpected fallback launch");');
  const result = await cli(['claude'], f.env);
  expect(result.code).toBe(1);
  expect(result.stderr).toContain('Multiple installations');
  expect(result.stdout).toBe('');
});

it('does not call npm mutation when a foreign global entry occupies a first-install target', async () => {
  const npm = await fakeNpm(f);
  const bin = process.platform === 'win32' ? npm.prefix : join(npm.prefix, 'bin');
  await mkdir(bin, { recursive: true });
  const entry = await fakeCli(bin, 'codex', 'console.log("foreign install");');
  const original = await readFile(entry);
  const result = await cli(['install', 'codex'], { ...f.env, npm_config_force: 'true' });
  expect(result.code).toBe(1);
  expect(result.stderr).toContain('belongs to another installation');
  expect(await readFile(entry)).toEqual(original);
  const events = (await readFile(npm.log, 'utf8')).trim().split('\n').map(line => JSON.parse(line) as string[]);
  expect(events.filter(args => args[0] === 'i')).toEqual([]);
});

it('does not describe the same managed npm entry as a separate installation', async () => {
  await fakeNpm(f);
  expect((await cli(['install', 'claude'], f.env)).code).toBe(0);
  const result = await cli(['upgrade', 'claude'], f.env);
  expect(result.code).toBe(0);
  expect(result.stderr).not.toContain('Other installations');
});
