import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture } from '../helpers.js';
import { loadAppConfig } from '../../src/config/reader.js';

let f: Awaited<ReturnType<typeof fixture>>;
let previous: string | undefined;
beforeEach(async () => {
  f = await fixture(); previous = process.env.FASTCLI_HOME;
  process.env.FASTCLI_HOME = f.env.FASTCLI_HOME;
  await mkdir(f.env.FASTCLI_HOME!, { recursive: true });
});
afterEach(async () => {
  if (previous === undefined) delete process.env.FASTCLI_HOME;
  else process.env.FASTCLI_HOME = previous;
  await f.cleanup();
});

describe('specialized manager config migration', () => {
  it('backs up exact old bytes, preserves language, and never reads tools.json', async () => {
    const dir = f.env.FASTCLI_HOME!;
    const original = '{"version":"2","packageManager":"volta","language":"zh-CN","firstRun":true,"editor":"vim","confirmBeforeRun":true}\n';
    await writeFile(join(dir, 'config.json'), original);
    await writeFile(join(dir, 'tools.json'), 'broken old JSON must be left alone');
    expect(await loadAppConfig()).toEqual({ version: '2', packageManager: 'npm', language: 'zh-CN' });
    const backups = (await readdir(dir)).filter(p => p.startsWith('config.json.bak.'));
    expect(backups).toHaveLength(1);
    expect(await readFile(join(dir, backups[0]!), 'utf8')).toBe(original);
    expect(await readFile(join(dir, 'tools.json'), 'utf8')).toBe('broken old JSON must be left alone');
    if (process.platform !== 'win32') {
      expect((await stat(join(dir, 'config.json'))).mode & 0o777).toBe(0o600);
      expect((await stat(join(dir, backups[0]!))).mode & 0o777).toBe(0o600);
    }
    await loadAppConfig();
    expect((await readdir(dir)).filter(p => p.startsWith('config.json.bak.'))).toHaveLength(1);
  });
});

it('returns defaults without creating a file', async () => {
  expect(await loadAppConfig()).toEqual({ version: '2', packageManager: 'npm', language: 'en' });
  expect(await readdir(f.env.FASTCLI_HOME!)).toEqual([]);
});

it.each(['{bad json', '[]', 'null', '{"version":"bad"}', '{"version":2}'])('rejects malformed configuration unchanged: %s', async raw => {
  const path = join(f.env.FASTCLI_HOME!, 'config.json');
  await writeFile(path, raw);
  await expect(loadAppConfig()).rejects.toThrow('配置文件损坏');
  expect(await readFile(path, 'utf8')).toBe(raw);
  expect(await readdir(f.env.FASTCLI_HOME!)).toEqual(['config.json']);
});

it('refuses a newer schema without rewriting it', async () => {
  const path = join(f.env.FASTCLI_HOME!, 'config.json');
  const raw = '{"version":"3","language":"en"}';
  await writeFile(path, raw);
  await expect(loadAppConfig()).rejects.toThrow('too new');
  expect(await readFile(path, 'utf8')).toBe(raw);
});

it('migrates v1 and retains an exact backup', async () => {
  const path = join(f.env.FASTCLI_HOME!, 'config.json');
  const raw = '{"version":"1","packageManager":"npm","language":"zh-CN"}';
  await writeFile(path, raw);
  expect((await loadAppConfig()).language).toBe('zh-CN');
  const backup = (await readdir(f.env.FASTCLI_HOME!)).find(name => name.startsWith('config.json.bak.'))!;
  expect(await readFile(join(f.env.FASTCLI_HOME!, backup), 'utf8')).toBe(raw);
});

it('failed atomic replacement preserves the existing target and cleans temporary files', async () => {
  const { atomicWriteJson } = await import('../../src/config/atomic.js');
  const target = join(f.env.FASTCLI_HOME!, 'directory-target');
  await mkdir(target);
  await writeFile(join(target, 'original'), 'untouched');
  await expect(atomicWriteJson(target, { version: '2' })).rejects.toThrow();
  expect(await readFile(join(target, 'original'), 'utf8')).toBe('untouched');
  expect((await readdir(f.env.FASTCLI_HOME!)).filter(name => name.includes('.tmp-'))).toEqual([]);
});
