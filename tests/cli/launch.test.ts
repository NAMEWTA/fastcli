import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixture, fakeCli, cli } from '../helpers.js';

let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => { f = await fixture(); });
afterEach(async () => { await f.cleanup(); });

describe('direct AI CLI launch', () => {
  it('launches Claude with literal arguments and preserves cwd and exit status', async () => {
    await fakeCli(f.bin, 'claude', 'console.log(JSON.stringify({args:process.argv.slice(2),cwd:process.cwd()}));process.exitCode=23;');
    const result = await cli(['claude', 'hello world', '$(no-shell)', 'a;b', '--help', '--'], f.env, f.dir);
    expect(result.code).toBe(23);
    expect(JSON.parse(result.stdout)).toEqual({ args: ['--dangerously-skip-permissions', 'hello world', '$(no-shell)', 'a;b', '--help', '--'], cwd: f.dir });
    expect(result.stderr).not.toContain('confirm');
  });
});

it.each([
  ['codex', ['--dangerously-bypass-approvals-and-sandbox']],
  ['gemini', ['--yolo']], ['grok', ['--yolo', '--sandbox', 'off']],
  ['opencode', ['--auto']], ['pi', []],
])('maps %s and passes its version flag to the tool', async (id, args) => {
  await fakeCli(f.bin, id as string, 'console.log(JSON.stringify(process.argv.slice(2)));');
  const result = await cli([id as string, '--version'], f.env);
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual([...(args as string[]), '--version']);
});

it('forwards stdin without requiring a terminal', async () => {
  await fakeCli(f.bin, 'claude', 'process.stdin.setEncoding("utf8");let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>process.stdout.write(s));');
  const result = await cli(['claude', '-p'], f.env, f.dir, 'literal prompt\n');
  expect(result.code).toBe(0);
  expect(result.stdout).toBe('literal prompt\n');
});

it('prints wrapper help and refuses a non-terminal menu without creating config', async () => {
  const result = await cli(['--help'], f.env);
  expect(result.code).toBe(0);
  expect(result.stdout).toContain('fastcli install <tool>');
  const menu = await cli([], f.env);
  expect(menu.code).toBe(1);
  expect(menu.stderr).toContain('interactive terminal');
});

it.each(['run', 'add', 'edit', 'remove', 'view', 'web', 'pi-coding-agent', 'copilot', 'cursor', 'codebuddy', 'openwiki', 'speculo'])('retires %s with migration instructions', async command => {
  const result = await cli([command], f.env);
  expect(result.code).toBe(1);
  expect(result.stderr).toContain('removed');
  expect(result.stderr).toContain('tools.json is preserved');
});

it('dry-run never invokes npm or migrates a legacy config', async () => {
  const { mkdir, writeFile, readFile, readdir } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const configDir = f.env.FASTCLI_HOME!;
  await mkdir(configDir);
  const old = '{"version":"2","packageManager":"volta","language":"en"}';
  await writeFile(join(configDir, 'config.json'), old);
  await fakeCli(f.bin, 'npm', 'throw new Error("npm must never run");');
  const result = await cli(['install', 'claude', '--dry-run'], f.env);
  expect(result.code).toBe(0);
  expect(result.stdout).toContain('npm i -g @anthropic-ai/claude-code@latest --ignore-scripts=false --include=optional --allow-scripts=@anthropic-ai/claude-code');
  expect(await readFile(join(configDir, 'config.json'), 'utf8')).toBe(old);
  expect(await readdir(configDir)).toEqual(['config.json']);
});
