import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { fixture, fakeCli } from '../helpers.js';
import { probeProcess } from '../../src/core/executor.js';

let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => { f = await fixture(); });
afterEach(async () => { await f.cleanup(); });

describe('bounded process probes', () => {
  it('preserves literal argv and cwd, captures both streams and status', async () => {
    const file = await fakeCli(f.bin, 'probe', 'console.log(JSON.stringify({args:process.argv.slice(2),cwd:process.cwd()}));console.error("diagnostic");process.exitCode=7;');
    const args = ['a b', '$(bad)', 'a;b', '"quoted"', '', 'x&y'];
    const result = await probeProcess({ file, args, cwd: f.dir, env: f.env });
    expect(result.code).toBe(7);
    expect(JSON.parse(result.stdout)).toEqual({ args, cwd: f.dir });
    expect(result.stderr.trim()).toBe('diagnostic');
  });
  it('returns a spawn failure rather than throwing', async () => {
    const result = await probeProcess({ file: join(f.dir, 'absent'), args: [] });
    expect(result.code).not.toBe(0);
    expect(result.error).toBeTruthy();
  });
  it('terminates a hung probe and closes captured pipes', async () => {
    const file = await fakeCli(f.bin, 'probe', 'setInterval(()=>{},1000);');
    const result = await probeProcess({ file, args: [] }, { timeoutMs: 150 });
    expect(result.timedOut).toBe(true);
    expect(result.code).not.toBe(0);
  });
  it('bounds combined stdout and stderr and stops the producer', async () => {
    const file = await fakeCli(f.bin, 'probe', 'setInterval(()=>{process.stdout.write("x".repeat(8192));process.stderr.write("y".repeat(8192));},1);');
    const result = await probeProcess({ file, args: [] }, { maxOutput: 1024 });
    expect(Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr)).toBeLessThanOrEqual(1024);
    expect(result.error).toContain('exceeded');
  });
});

it.skipIf(process.platform !== 'win32')('cancels the whole Windows cmd/Node/child chain before reporting completion', async () => {
  const { runProcess } = await import('../../src/core/executor.js');
  const { readFile } = await import('node:fs/promises');
  const { setTimeout: delay } = await import('node:timers/promises');
  const { execFileSync } = await import('node:child_process');
  const ready = join(f.dir, 'ready.json'), heartbeat = join(f.dir, 'heartbeat');
  const grandchild = `const fs=require('fs');fs.writeFileSync(${JSON.stringify(ready)},JSON.stringify([process.ppid,process.pid]));setInterval(()=>fs.appendFileSync(${JSON.stringify(heartbeat)},'x'),25);`;
  const file = await fakeCli(f.bin, 'probe', `require('child_process').spawn(process.execPath,['-e',${JSON.stringify(grandchild)}],{stdio:'inherit'});setInterval(()=>{},1000);`);
  const before = new Set(process.listeners('SIGTERM'));
  const result = runProcess({ file, args: [], env: f.env });
  let pids: number[] = [];
  try {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      try { pids = JSON.parse(await readFile(ready, 'utf8')); break; } catch { await delay(20); }
    }
    expect(pids).toHaveLength(2);
    const cancel = process.listeners('SIGTERM').find(handler => !before.has(handler));
    expect(cancel).toBeTruthy();
    cancel!();
    expect(await result).toMatchObject({ code: 143, signal: 'SIGTERM' });
    for (const pid of pids) expect(() => process.kill(pid, 0)).toThrow();
    const snapshot = await readFile(heartbeat, 'utf8').catch(() => '');
    await delay(100);
    expect(await readFile(heartbeat, 'utf8').catch(() => '')).toBe(snapshot);
  } finally {
    for (const pid of pids) {
      try { execFileSync(join(process.env.SystemRoot!, 'System32', 'taskkill.exe'), ['/pid',String(pid),'/T','/F'], {stdio:'ignore'}); } catch {}
    }
    await result;
  }
});
