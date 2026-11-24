import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { CommandShell } from '../config/custom-commands.js';
import { findPathExecutable } from './detection.js';
import { runProcess } from './executor.js';

export const SHELL_LABELS: Record<CommandShell, string> = {
  cmd: 'CMD', pwsh: 'PowerShell 7', powershell: 'Windows PowerShell', sh: 'sh',
};

export async function findCommandShell(shell: CommandShell, env: NodeJS.ProcessEnv): Promise<string | undefined> {
  if (process.platform === 'win32' ? shell === 'sh' : shell !== 'sh') return undefined;
  const system = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32');
  const file = shell === 'sh' ? '/bin/sh'
    : shell === 'cmd' ? join(system, 'cmd.exe')
    : shell === 'powershell' ? join(system, 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    : await findPathExecutable('pwsh.exe', env) ?? join(process.env.ProgramFiles ?? 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe');
  try { await access(file, constants.X_OK); return file; }
  catch { return undefined; }
}

export function runShellCommand(shell: CommandShell, file: string, command: string, env: NodeJS.ProcessEnv, cwd: string) {
  const args = shell === 'sh' ? ['-c', command]
    // /s strips the outer pair before CMD parses the saved line, including its original quotes.
    : shell === 'cmd' ? ['/d', '/s', '/c', `"${command}"`]
    : ['-NoLogo', '-NoProfile', '-EncodedCommand', encodePowerShell(command)];
  return runProcess({ file, args, env, cwd }, { windowsVerbatimArguments: shell === 'cmd', quiet: true });
}

function encodePowerShell(command: string): string {
  // PowerShell otherwise collapses a failed native command's exit status to 1.
  const script = `${command}
if (-not $?) {
  if ((Microsoft.PowerShell.Utility\\Get-Variable -Name LASTEXITCODE -ValueOnly -ErrorAction Ignore) -in 130, 143) {
    exit $LASTEXITCODE
  }
  exit 1
}`;
  return Buffer.from(script, 'utf16le').toString('base64');
}
