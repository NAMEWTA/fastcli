import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, fakeCli, fakeNpm } from '../helpers.js';
import { runCli } from '../../src/cli/app.js';
import { CancelledError, type Choice, type PromptUI } from '../../src/cli/prompts.js';

let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => { f = await fixture(); vi.stubEnv('FASTCLI_HOME', f.env.FASTCLI_HOME!); });
afterEach(async () => { vi.unstubAllEnvs(); await f.cleanup(); });

function prompts(answers: Array<string | string[] | null | Error>, consent = false, inputs: string[] = []) {
  const menus: Choice[][] = [], messages: string[] = [], confirmations: string[] = [];
  const ui: PromptUI = {
    async select(_message, choices) {
      menus.push(choices);
      const value = answers.shift();
      if(value instanceof Error) throw value;
      const choice = choices.find(choice => choice.value === value || choice.label === value);
      expect(choice).toBeDefined();
      return choice!.value;
    },
    async multiselect(_message, choices) {
      menus.push(choices);
      const value = answers.shift();
      if (value instanceof Error) throw value;
      if (value === null) return null;
      expect(Array.isArray(value)).toBe(true);
      return (value as string[]).map(id => choices.find(choice => choice.label === id)?.value ?? id);
    },
    async text() { return inputs.shift()!; },
    async confirm(message) { confirmations.push(message); return consent; },
    info: message => messages.push(message), error: message => messages.push(message), intro() {}, outro() {},
  };
  return { ui, menus, messages, confirmations };
}

it('starts with actions, lists only found executables and keeps version failures launchable', async () => {
  await fakeNpm(f);
  const log = join(f.dir, 'launch.json');
  await fakeCli(f.bin, 'claude', `if(process.argv.includes('--version')) process.exitCode=9;else require('fs').writeFileSync(${JSON.stringify(log)},JSON.stringify(process.argv.slice(2)));`);
  const p = prompts(['yolo', 'claude', 'exit']);
  expect(await runCli([], { prompts: p.ui, interactive: true, env: f.env })).toBe(0);
  expect(p.menus[0]!.map(choice => choice.value)).toEqual(['yolo','manage','custom','settings','exit']);
  expect(p.menus[1]!.map(choice => choice.value)).toEqual(['claude', ':back']);
  expect(p.menus[1]![0]!.hint).toContain('Version unknown');
  expect(JSON.parse(await readFile(log, 'utf8'))).toEqual(['--dangerously-skip-permissions']);
  expect(p.confirmations).toEqual([]);
});

it('offers installation from the empty state and always chooses the action before all supported tools', async () => {
  await fakeNpm(f);
  const p = prompts(['yolo', 'install', 'install', null, ':back', 'exit']);
  expect(await runCli([], { prompts: p.ui, interactive: true, env: f.env })).toBe(0);
  expect(p.messages.join('\n')).toContain('No installed tools');
  expect(p.menus[2]!.map(choice => choice.value)).toEqual(['install','uninstall',':back']);
  expect(p.menus[3]!.map(choice => choice.value)).toEqual(['claude','codex','gemini','grok','opencode','pi']);
});

it('refreshes after installation, confirms only uninstall, and returns to the main menu', async () => {
  await fakeNpm(f);
  const p = prompts(['manage', 'install', ['pi'], 'yolo', ':back', 'manage', 'uninstall', ['pi'], 'exit'], true);
  expect(await runCli([], { prompts: p.ui, interactive: true, env: f.env })).toBe(0);
  expect(p.menus[4]!.map(choice => choice.value)).toEqual(['pi', ':back']);
  expect(p.confirmations).toHaveLength(1);
  expect(p.confirmations[0]).toContain('Uninstall Pi');
});

it('limits settings to language and immediately applies the saved language', async () => {
  const p = prompts(['settings','zh-CN','exit']);
  expect(await runCli([], { prompts: p.ui, interactive: true, env: f.env })).toBe(0);
  expect(p.menus[1]!.map(choice => choice.value)).toEqual(['en','zh-CN',':back']);
  expect(p.menus[2]![0]!.label).toBe('Yolo 启动');
  expect(JSON.parse(await readFile(join(f.env.FASTCLI_HOME!, 'config.json'), 'utf8')))
    .toEqual({version:'2', packageManager:'npm',language:'zh-CN'});
});

it('returns 130 when a prompt is cancelled', async () => {
  const p = prompts([new CancelledError()]);
  expect(await runCli([], { prompts:p.ui, interactive:true, env:f.env })).toBe(130);
});

it('explains an unmanaged entry before confirmation and never invokes npm mutation', async () => {
  const npm = await fakeNpm(f);
  const { cli } = await import('../helpers.js');
  const { rm, writeFile } = await import('node:fs/promises');
  expect((await cli(['install', 'pi'], f.env)).code).toBe(0);
  const entry = process.platform === 'win32' ? join(npm.prefix, 'pi.cmd') : join(npm.prefix, 'bin', 'pi');
  await rm(entry); await writeFile(entry, 'foreign entry');
  const p = prompts(['manage', 'uninstall', null, ':back', 'exit']);
  expect(await runCli([], { prompts: p.ui, interactive: true, env: f.env })).toBe(0);
  const piChoice = p.menus[2]!.find(choice => choice.value === 'pi')!;
  expect(piChoice.hint).toContain('belongs to another installation');
  expect(piChoice.disabled).toBe(true);
  expect(p.confirmations).toEqual([]);
  const events = (await readFile(npm.log, 'utf8')).trim().split('\n').map(line => JSON.parse(line) as string[]);
  expect(events.filter(args => args[0] === 'uninstall')).toEqual([]);
});

it('installs and updates in catalog order, then confirms a batch uninstall once', async () => {
  const npm = await fakeNpm(f);
  const { cli } = await import('../helpers.js');
  expect((await cli(['install', 'pi'], f.env)).code).toBe(0);
  const p = prompts(['manage', 'install', ['pi', 'codex', 'claude'], 'manage', 'uninstall', ['pi', 'claude'], 'exit'], true);
  expect(await runCli([], { prompts: p.ui, interactive: true, env: f.env })).toBe(0);
  expect(p.menus[2]!.find(choice => choice.value === 'pi')?.hint).toMatch(/^Update/);
  expect(p.menus[2]!.find(choice => choice.value === 'claude')?.hint).toMatch(/^Install/);
  expect(p.confirmations).toHaveLength(1);
  expect(p.confirmations[0]).toContain(`Claude Code, Pi from ${npm.prefix}`);
  const events = (await readFile(npm.log, 'utf8')).trim().split('\n').map(line => JSON.parse(line) as string[]);
  expect(events.filter(args => args[0] === 'i' || args[0] === 'uninstall').slice(1).map(args => [args[0], args[2]])).toEqual([
    ['i', '@anthropic-ai/claude-code@latest'], ['i', '@openai/codex@latest'], ['i', '@earendil-works/pi-coding-agent@latest'],
    ['uninstall', '@anthropic-ai/claude-code'], ['uninstall', '@earendil-works/pi-coding-agent'],
  ]);
});

it('continues after an npm failure and stops pending items on cancellation', async () => {
  const npm = await fakeNpm(f);
  const p = prompts(['manage', 'install', ['pi', 'codex', 'claude'], 'exit']);
  const env = { ...f.env, TEST_NPM_FAIL_PACKAGE: '@anthropic-ai/claude-code', TEST_NPM_FAIL: '12' };
  expect(await runCli([], { prompts: p.ui, interactive: true, env })).toBe(0);
  expect(p.messages).toContain('Completed: 2 succeeded, 1 failed.');
  const p2 = prompts(['manage', 'install', ['pi', 'codex', 'claude']]);
  expect(await runCli([], { prompts: p2.ui, interactive: true, env: { ...env, TEST_NPM_FAIL: '130' } })).toBe(130);
  const events = (await readFile(npm.log, 'utf8')).trim().split('\n').map(line => JSON.parse(line) as string[]);
  expect(events.filter(args => args[0] === 'i').map(args => args[2])).toEqual([
    '@anthropic-ai/claude-code@latest', '@openai/codex@latest', '@earendil-works/pi-coding-agent@latest',
    '@anthropic-ai/claude-code@latest',
  ]);
});

it('makes no changes when batch uninstall confirmation is declined', async () => {
  const npm = await fakeNpm(f);
  const { cli } = await import('../helpers.js');
  expect((await cli(['install', 'pi'], f.env)).code).toBe(0);
  const p = prompts(['manage', 'uninstall', ['pi'], 'exit']);
  expect(await runCli([], { prompts: p.ui, interactive: true, env: f.env })).toBe(0);
  expect(p.confirmations).toHaveLength(1);
  expect(await readFile(npm.log, 'utf8')).not.toContain('["uninstall"');
});

it('adds, reopens, edits, runs and deletes saved commands without changing settings', async () => {
  const shell = process.platform === 'win32' ? 'cmd' : 'sh';
  const script = join(f.dir, 'command script.cjs');
  const log = join(f.dir, 'saved-run.jsonl');
  await writeFile(script, `require('fs').appendFileSync(${JSON.stringify(log)}, JSON.stringify({cwd:process.cwd(), args:process.argv.slice(2)}) + '\\n');
    if (process.argv[2] === 'first item') process.exitCode = 6;`);
  const line = (arg: string) => `node "${script}" "${arg}"`;
  const config = join(f.env.FASTCLI_HOME!, 'config.json');
  const original = { version: '2', packageManager: 'npm', language: 'en' };
  const p = prompts(['custom', 'add', shell, 'add', shell, ':back', 'settings', 'en', 'exit'], false,
    ['First task', line('old'), 'Second task', line('second item')]);
  expect(await runCli([], { prompts: p.ui, interactive: true, env: f.env })).toBe(0);
  expect(JSON.parse(await readFile(config, 'utf8'))).toEqual(original);
  await expect(readFile(log)).rejects.toMatchObject({ code: 'ENOENT' });

  const p2 = prompts(['custom', 'edit', 'First task', shell, 'run', ['Second task', 'New first task'],
    'delete', 'Second task', ':back', 'exit'], true, ['New first task', line('first item')]);
  expect(await runCli([], { prompts: p2.ui, interactive: true, env: f.env })).toBe(0);
  const events = (await readFile(log, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  expect(events).toEqual(['first item', 'second item'].map(arg => ({ cwd: process.cwd(), args: [arg] })));
  expect(p2.messages).toContain('New first task failed: 6');
  expect(p2.messages).toContain('Completed: 1 succeeded, 1 failed.');
  expect(p2.confirmations).toEqual(['Delete the saved command “Second task”?']);
  const store = join(f.env.FASTCLI_HOME!, 'custom-commands.json');
  expect(JSON.parse(await readFile(store, 'utf8'))).toEqual([{ id: expect.any(String), name: 'New first task', shell, command: line('first item') }]);
});

it('stops pending custom commands when a child reports Ctrl+C through its exit status', async () => {
  const shell = process.platform === 'win32' ? 'cmd' : 'sh';
  const log = join(f.dir, 'should-not-run');
  const p = prompts(['custom', 'add', shell, 'add', shell, 'run', ['Pending', 'Cancel'], ':back', 'exit'], false,
    ['Cancel', 'exit 130', 'Pending', `echo ran > "${log}"`]);
  expect(await runCli([], { prompts: p.ui, interactive: true, env: f.env })).toBe(130);
  await expect(readFile(log)).rejects.toMatchObject({ code: 'ENOENT' });
});
