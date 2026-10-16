import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, fakeCli, fakeNpm } from '../helpers.js';
import { runCli } from '../../src/cli/app.js';
import { CancelledError, type Choice, type PromptUI } from '../../src/cli/prompts.js';

let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => { f = await fixture(); vi.stubEnv('FASTCLI_HOME', f.env.FASTCLI_HOME!); });
afterEach(async () => { vi.unstubAllEnvs(); await f.cleanup(); });

function prompts(answers: Array<string | Error>, consent = false) {
  const menus: Choice[][] = [], messages: string[] = [], confirmations: string[] = [];
  const ui: PromptUI = {
    async select(_message, choices) {
      menus.push(choices);
      const value = answers.shift();
      if(value instanceof Error) throw value;
      expect(choices.map(choice => choice.value)).toContain(value);
      return value!;
    },
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
  expect(p.menus[0]!.map(choice => choice.value)).toEqual(['yolo','manage','settings','exit']);
  expect(p.menus[1]!.map(choice => choice.value)).toEqual(['claude', ':back']);
  expect(p.menus[1]![0]!.hint).toContain('Version unknown');
  expect(JSON.parse(await readFile(log, 'utf8'))).toEqual(['--dangerously-skip-permissions']);
  expect(p.confirmations).toEqual([]);
});

it('offers installation from the empty state and always chooses the action before all supported tools', async () => {
  await fakeNpm(f);
  const p = prompts(['yolo', 'install', 'upgrade', 'claude', ':back', ':back', 'exit']);
  expect(await runCli([], { prompts: p.ui, interactive: true, env: f.env })).toBe(0);
  expect(p.messages.join('\n')).toContain('No installed tools');
  expect(p.messages.join('\n')).toContain('current npm environment');
  expect(p.menus[2]!.map(choice => choice.value)).toEqual(['install','uninstall','upgrade',':back']);
  expect(p.menus[3]!.map(choice => choice.value)).toEqual(['claude','codex','gemini','grok','opencode','pi',':back']);
});

it('refreshes after installation, confirms only uninstall, and returns to the main menu', async () => {
  await fakeNpm(f);
  const p = prompts(['manage', 'install', 'pi', 'yolo', ':back', 'manage', 'uninstall', 'pi', 'exit']);
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
  const p = prompts(['manage', 'uninstall', 'pi', ':back', ':back', 'exit']);
  expect(await runCli([], { prompts: p.ui, interactive: true, env: f.env })).toBe(0);
  const piChoice = p.menus[2]!.find(choice => choice.value === 'pi')!;
  expect(piChoice.hint).toContain('belongs to another installation');
  expect(p.messages.join('\n')).toContain('belongs to another installation');
  expect(p.confirmations).toEqual([]);
  const events = (await readFile(npm.log, 'utf8')).trim().split('\n').map(line => JSON.parse(line) as string[]);
  expect(events.filter(args => args[0] === 'uninstall')).toEqual([]);
});
