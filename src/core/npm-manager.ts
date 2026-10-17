import type { ProcessInvocation, ToolDefinition } from './types.js';
import { gte, valid } from 'semver';
import { constants } from 'node:fs';
import { access, lstat, readFile, readlink, realpath, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { probeProcess, runProcess, ProcessCancelledError } from './executor.js';
import { installationEnv, findPathExecutable } from './detection.js';
import { stripVTControlCharacters } from 'node:util';

const readCmdShim = createRequire(import.meta.url)('read-cmd-shim') as (path: string) => Promise<string>;

function isInside(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

export type ManagementAction = 'install' | 'upgrade' | 'uninstall';

export interface NpmContext {
  file: string;
  version: string;
  prefix: string;
  root: string;
  env: NodeJS.ProcessEnv;
  cwd?: string;
  nodeVersion?: string;
}

export interface NpmPackageState {
  installed: boolean;
  entryPath?: string;
  reason?: 'missing' | 'invalid-package' | 'external-link' | 'missing-entry' | 'foreign-entry';
}

export interface ManagementResult {
  code: number;
  message: 'success' | 'not-installed' | 'unmanaged-package' | 'node-too-old' | 'npm-too-old' | 'npm-failed' | 'verification-failed' | 'cleanup-failed';
  installed: boolean;
  version?: string;
  details?: string;
}

/** Shared preflight for menu affordances, confirmation, and the mutation boundary. */
export function managementBlockReason(state: NpmPackageState, action: ManagementAction): 'unmanaged-package' | 'not-installed' | undefined {
  if (state.reason && !['missing', 'missing-entry'].includes(state.reason)) return 'unmanaged-package';
  if (action !== 'install' && !state.installed) return 'not-installed';
  return undefined;
}

/** Build a displayable invocation without running npm or reading configuration. */
export function buildNpmInvocation(
  tool: ToolDefinition,
  action: ManagementAction,
  context?: NpmContext,
): ProcessInvocation {
  const args = action === 'uninstall'
    ? ['uninstall', '-g', tool.npmPackage]
    : ['i', '-g', `${tool.npmPackage}@latest`];
  if (action !== 'uninstall' && tool.id === 'claude') {
    args.push('--ignore-scripts=false', '--include=optional', `--allow-scripts=${tool.npmPackage}`);
  }
  if (action !== 'uninstall' && tool.id === 'opencode') {
    args.push('--ignore-scripts=false', '--include=optional');
    if (!context || (valid(context.version) && gte(context.version, '11.16.0'))) {
      args.push(`--allow-scripts=${tool.npmPackage}`);
    }
  }
  if (!context) return { file: 'npm', args };
  const env = { ...context.env };
  for (const key of Object.keys(env)) {
    if (key.toLowerCase() === 'npm_config_prefix') delete env[key];
  }
  env.npm_config_prefix = context.prefix;
  return { file: context.file, args, env, cwd: context.cwd };
}

/** Inspect only the named package in this npm scope; never inspect PATH aliases. */
export async function inspectNpmPackage(
  tool: Pick<ToolDefinition, 'npmPackage' | 'executable'>,
  context: NpmContext,
): Promise<NpmPackageState> {
  const packageDir = join(context.root, tool.npmPackage);
  const binDir = process.platform === 'win32' ? context.prefix : join(context.prefix, 'bin');
  const entryPath = join(binDir, tool.executable + (process.platform === 'win32' ? '.cmd' : ''));
  const entries = process.platform === 'win32'
    ? [entryPath, join(binDir, tool.executable), join(binDir, `${tool.executable}.ps1`)] : [entryPath];
  try {
    const packageStat = await lstat(packageDir);
    const realRoot = await realpath(context.root);
    if (packageStat.isSymbolicLink() || await realpath(packageDir) !== resolve(realRoot, tool.npmPackage)) {
      return { installed: false, reason: 'external-link' };
    }
    if (!packageStat.isDirectory()) return { installed: false, reason: 'invalid-package' };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return { installed: false, reason: 'invalid-package' };
    // npm may inherit force from configuration, so EEXIST is not an ownership guard.
    for (const entry of entries) {
      try { await lstat(entry); return { installed: false, reason: 'foreign-entry' }; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return { installed: false, reason: 'invalid-package' }; }
    }
    return { installed: false, reason: 'missing' };
  }
  let manifest: { name?: unknown; bin?: unknown } | null;
  try {
    const manifestPath = join(packageDir, 'package.json');
    if (!isInside(await realpath(packageDir), await realpath(manifestPath))) {
      return { installed: false, reason: 'external-link' };
    }
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    return { installed: false, reason: 'invalid-package' };
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { installed: false, reason: 'invalid-package' };
  }
  const declaredBin = typeof manifest.bin === 'string'
    ? manifest.bin
    : (manifest.bin as Record<string, unknown> | null)?.[tool.executable];
  if (manifest.name !== tool.npmPackage || typeof declaredBin !== 'string'
      || isAbsolute(declaredBin) || !isInside(packageDir, resolve(packageDir, declaredBin))) {
    return { installed: false, reason: 'invalid-package' };
  }
  const declaredTarget = resolve(packageDir, declaredBin);
  let realBin: string | undefined;
  try {
    realBin = await realpath(declaredTarget);
    if (!isInside(await realpath(packageDir), realBin)) {
      return { installed: false, reason: 'external-link' };
    }
  } catch {
    // Missing package binaries can be repaired, but an unrelated global bin must remain protected.
  }
  // npm creates three Windows launchers; protect siblings of the primary .cmd as well.
  for (const entry of entries.slice(1)) {
    try { await lstat(entry); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      return { installed: true, reason: 'foreign-entry' };
    }
    try {
      const target = resolve(binDir, await readCmdShim(entry));
      if (target !== declaredTarget && (!realBin || await realpath(target) !== realBin)) return { installed: true, reason: 'foreign-entry' };
    } catch { return { installed: true, reason: 'foreign-entry' }; }
  }
  try {
    const entryStat = await lstat(entryPath);
    if (process.platform !== 'win32' && !entryStat.isSymbolicLink()) {
      return { installed: true, reason: 'foreign-entry' };
    }
    const target = process.platform === 'win32'
      ? resolve(binDir, await readCmdShim(entryPath))
      : resolve(binDir, await readlink(entryPath));
    if (!realBin) {
      return { installed: true, reason: target === declaredTarget ? 'missing-entry' : 'foreign-entry' };
    }
    let realTarget: string;
    try {
      realTarget = await realpath(target);
    } catch {
      return { installed: true, reason: target === declaredTarget ? 'missing-entry' : 'foreign-entry' };
    }
    if (realTarget !== realBin) {
      return { installed: true, reason: 'foreign-entry' };
    }
    if (!(await stat(realBin)).isFile()) return { installed: true, reason: 'missing-entry' };
    await access(entryPath, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
    return { installed: true, entryPath };
  } catch (error) {
    return { installed: true, reason: (error as NodeJS.ErrnoException).code === 'ENOTASHIM' ? 'foreign-entry' : 'missing-entry' };
  }
}

/** Resolve npm and read its global scope and runtime. Throws if it cannot be identified. */
export async function getNpmContext(env: NodeJS.ProcessEnv = process.env): Promise<NpmContext> {
  const snapshot = { ...env };
  const pathKey = process.platform === 'win32' ? Object.keys(snapshot).sort().find(key => key.toLowerCase() === 'path') : 'PATH';
  if (process.platform === 'win32') {
    for (const key of Object.keys(snapshot)) {
      if (key.toLowerCase() === 'path' && key !== pathKey) delete snapshot[key];
    }
  }
  const cwd = process.cwd();
  const file = await findPathExecutable('npm', snapshot);
  if (!file) throw new Error('npm was not found in PATH.');
  const query = async (args: string[]): Promise<string> => {
    const result = await probeProcess({ file: file!, args, env: snapshot, cwd });
    if (result.code !== 0) throw new Error(result.error || result.stderr.trim() || 'Unable to inspect npm.');
    return result.stdout.trim();
  };
  const [runtimeText, prefix, root] = await Promise.all([
    query(['version', '--json', '--global']), query(['prefix', '--global']), query(['root', '--global']),
  ]);
  let runtime: { npm?: unknown; node?: unknown };
  try {
    runtime = JSON.parse(runtimeText);
  } catch {
    throw new Error('npm returned an invalid runtime version.');
  }
  if (typeof runtime.npm !== 'string' || !valid(runtime.npm)
      || typeof runtime.node !== 'string' || !valid(runtime.node)) {
    throw new Error('npm returned an invalid runtime version.');
  }
  const expectedRoot = process.platform === 'win32' ? join(prefix, 'node_modules') : join(prefix, 'lib/node_modules');
  if (!isAbsolute(prefix) || !isAbsolute(root) || root !== expectedRoot || /[\r\n\0]/.test(prefix)) {
    throw new Error('npm returned an inconsistent global prefix/root.');
  }
  return { file, version: runtime.npm, nodeVersion: runtime.node, prefix, root, env: snapshot, cwd };
}

/** Execute one authorized management action, then report freshly inspected package state. */
export async function manageTool(
  tool: ToolDefinition,
  action: ManagementAction,
  context: NpmContext,
): Promise<ManagementResult> {
  const before = await inspectNpmPackage(tool, context);
  const blocked = managementBlockReason(before, action);
  if (blocked) return { code: 1, message: blocked, installed: before.installed,
    ...(blocked === 'unmanaged-package' ? { details: before.reason } : {}) };
  const minimumNode = tool.minimumNode && valid(tool.minimumNode) && gte(tool.minimumNode, '22.19.0')
    ? tool.minimumNode : '22.19.0';
  const nodeVersion = context.nodeVersion ?? process.versions.node;
  if (!valid(nodeVersion) || !gte(nodeVersion, minimumNode)) {
    return { code: 1, message: 'node-too-old', installed: before.installed, details: `>=${minimumNode} (${nodeVersion})` };
  }
  if (!valid(context.version) || (action !== 'uninstall' && tool.id === 'claude' && !gte(context.version, '11.16.0'))) {
    return { code: 1, message: 'npm-too-old', installed: before.installed, details: `>=11.16.0 (${context.version})` };
  }
  const invocation = buildNpmInvocation(tool, action, context);
  const execution = await runProcess(invocation);
  const after = await inspectNpmPackage(tool, context);
  if (execution.cleanupError) return { code: 1, message: 'cleanup-failed', installed: after.installed, details: execution.cleanupError };
  if (execution.code !== 0) {
    return { code: execution.code, message: 'npm-failed', installed: after.installed,
      ...(execution.error ? { details: execution.error } : {}) };
  }
  if (action === 'uninstall') {
    return after.reason === 'missing'
      ? { code: 0, message: 'success', installed: false }
      : { code: 1, message: 'verification-failed', installed: after.installed, details: after.reason };
  }
  if (!after.entryPath) {
    return { code: 1, message: 'verification-failed', installed: after.installed, details: after.reason };
  }
  const installed = { path: after.entryPath, realPath: after.entryPath, source: 'npm', isPathDefault: false };
  let probe;
  try {
    probe = await probeProcess({ file: after.entryPath, args: tool.versionArgs,
      env: installationEnv(installed, invocation.env), cwd: context.cwd });
  } catch (error) {
    if (!(error instanceof ProcessCancelledError)) throw error;
    return { code: error.code, message: error.cleanupError ? 'cleanup-failed' : 'npm-failed',
      installed: (await inspectNpmPackage(tool, context)).installed, ...(error.cleanupError ? { details: error.cleanupError } : {}) };
  }
  const output = stripVTControlCharacters(`${probe.stdout}\n${probe.stderr}`).trim();
  const version = output.match(/(?:^|[^\w.])v?(\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?)(?=$|[^\w.])/m)?.[1];
  if (probe.code !== 0 || probe.error || !version) {
    return { code: 1, message: 'verification-failed', installed: true,
      details: probe.error || output.slice(0, 500) || `Version probe exited with code ${probe.code}` };
  }
  return { code: 0, message: 'success', installed: true, version };
}
