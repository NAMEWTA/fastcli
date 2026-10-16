import { afterEach, beforeEach, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fixture, fakeCli } from '../helpers.js';

let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => { f = await fixture(); });
afterEach(async () => { await f.cleanup(); });

it.skipIf(process.platform === 'win32').each(['SIGINT', 'SIGTERM'] as const)('forwards %s to a launched tool and returns its signal status', async signal => {
  const ready = join(f.dir, 'ready');
  await fakeCli(f.bin, 'claude', `require('fs').writeFileSync(${JSON.stringify(ready)}, String(process.pid));setInterval(()=>{},1000);`);
  const result = await signalCommand(['claude'], ready, signal);
  expect(result.code).toBe(signal === 'SIGINT' ? 130 : 143);
  expect(() => process.kill(result.pid, 0)).toThrow();
});

it.skipIf(process.platform === 'win32')('cancels a version scan and reaps its detached probe tree', async () => {
  const ready = join(f.dir, 'ready');
  await fakeCli(f.bin, 'npm', 'process.exitCode=1;');
  await fakeCli(f.bin, 'claude', `const child=require('child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});require('fs').writeFileSync(${JSON.stringify(ready)}, JSON.stringify([process.pid,child.pid]));setInterval(()=>{},1000);`);
  const result = await signalCommand(['list'], ready, 'SIGTERM');
  expect(result.code).toBe(143);
  const pids: number[] = JSON.parse(await readFile(ready, 'utf8'));
  for (const pid of pids) expect(await running(pid)).toBe(false);
});

async function running(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    // A killed grandchild can briefly await the host's init process for reaping.
    if (process.platform === 'linux') return !(await readFile(`/proc/${pid}/stat`, 'utf8')).split(') ')[1]?.startsWith('Z');
    return true;
  } catch { return false; }
}
async function signalCommand(args: string[], ready: string, signal: NodeJS.Signals) {
  const child = spawn(process.execPath, [join(import.meta.dirname, '../../dist/index.js'), ...args], { env: f.env, stdio: 'ignore' });
  const closed = new Promise<{ code: number | null; signal: string | null }>(resolve => child.once('close', (code, signal) => resolve({ code, signal })));
  let pid = 0;
  try {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      try { pid = Number(await readFile(ready, 'utf8')); break; } catch { await delay(20); }
    }
    expect(Date.now()).toBeLessThan(deadline);
    child.kill(signal);
    const result = await Promise.race([closed, delay(5000).then(() => { throw new Error('CLI did not stop'); })]);
    return { ...result, pid };
  } finally {
    child.kill('SIGKILL');
    try {
      const value = JSON.parse(await readFile(ready, 'utf8'));
      for (const target of Array.isArray(value) ? value : [value]) { try { process.kill(target, 'SIGKILL'); } catch {} }
    } catch {}
    await closed;
  }
}
