import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { findCommandShell, runShellCommand } from '../../src/core/command-shell.js';
import { fixture } from '../helpers.js';

let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => { f = await fixture(); });
afterEach(async () => { await f.cleanup(); });

it('passes the original command line to the shell with pipes, redirection and a working directory', async () => {
  const windows = process.platform === 'win32';
  const shell = windows ? 'cmd' : 'sh';
  const file = await findCommandShell(shell, f.env);
  expect(file).toBeDefined();
  const line = windows
    ? `echo "two words" | "${join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'findstr.exe')}" /c:"two words" > "out file.txt" && exit /b 7`
    : `printf '%s\\n' 'two words' | /bin/cat > 'out file.txt' && exit 7`;
  expect((await runShellCommand(shell, file!, line, f.env, f.dir)).code).toBe(7);
  expect(await readFile(join(f.dir, 'out file.txt'), 'utf8')).toContain('two words');
});

it.skipIf(process.platform !== 'win32')('passes a quoted Unicode script unchanged to Windows PowerShell', async () => {
  const file = await findCommandShell('powershell', f.env);
  expect(file).toBeDefined();
  const line = `Write-Output '两个词 two words' | ForEach-Object { '[' + $_ + ']' } > 'out file.txt'; exit 7`;
  expect((await runShellCommand('powershell', file!, line, f.env, f.dir)).code).toBe(7);
  expect(await readFile(join(f.dir, 'out file.txt'), 'utf16le')).toContain('[两个词 two words]');
});

it.skipIf(process.platform !== 'win32')('preserves cancellation statuses from native Windows PowerShell commands', async () => {
  const file = await findCommandShell('powershell', f.env);
  expect(file).toBeDefined();
  expect((await runShellCommand('powershell', file!, "node -e 'process.exit(130)'", f.env, f.dir)).code).toBe(130);
  expect((await runShellCommand('powershell', file!, "node -e 'process.exit(130)'; Write-Output 'continued'", f.env, f.dir)).code).toBe(0);
});
