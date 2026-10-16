import { constants } from 'node:fs';
import { access, readdir, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { probeProcess } from './executor.js';
import type { DetectedInstallation, ToolDefinition, ToolDetection } from './types.js';

export interface DetectionOptions {
  env?: NodeJS.ProcessEnv;
  home?: string;
  platform?: NodeJS.Platform;
  fallbackDirs?: readonly string[];
  npmPrefix?: string;
}

interface SearchDirectory {
  path: string;
  source: string;
}

async function versionDirectories(base: string, suffix: readonly string[], source: string): Promise<SearchDirectory[]> {
  try {
    const entries = await readdir(base, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .sort((a, b) => a.name.localeCompare(b.name)).slice(0, 128)
      .map((entry) => ({ path: join(base, entry.name, ...suffix), source }));
  } catch {
    return [];
  }
}

async function fallbackDirectories(options: DetectionOptions, env: NodeJS.ProcessEnv, platform: NodeJS.Platform): Promise<SearchDirectory[]> {
  const directories: SearchDirectory[] = [];
  const add = (source: string, ...paths: Array<string | undefined>) => {
    for (const path of paths) if (path) directories.push({ path, source });
  };
  const prefix = options.npmPrefix ?? environmentValue(env, 'npm_config_prefix', platform)
    ?? environmentValue(env, 'NPM_CONFIG_PREFIX', platform);
  if (prefix) add('npm', platform === 'win32' ? prefix : join(prefix, 'bin'));
  if (options.fallbackDirs !== undefined) {
    add('fallback', ...options.fallbackDirs);
    return directories;
  }

  const home = options.home ?? homedir();
  const dataHome = env.XDG_DATA_HOME ?? join(home, '.local', 'share');
  const nvmHome = env.NVM_DIR ?? join(home, '.nvm');
  const voltaHome = env.VOLTA_HOME ?? join(home, '.volta');
  const miseHome = env.MISE_DATA_DIR ?? join(dataHome, 'mise');
  const fnmHomes = [...new Set([
    env.FNM_DIR, join(dataHome, 'fnm'), join(home, '.fnm'),
    platform === 'darwin' ? join(home, 'Library', 'Application Support', 'fnm') : undefined,
    platform === 'win32' && env.APPDATA ? join(env.APPDATA, 'fnm') : undefined,
    platform === 'win32' && env.LOCALAPPDATA ? join(env.LOCALAPPDATA, 'fnm') : undefined,
  ].filter((path): path is string => Boolean(path)))];

  add('node', dirname(process.execPath));
  add('user', join(home, '.local', 'bin'), join(home, 'bin'), join(home, '.npm-global', 'bin'),
    join(home, '.npm', 'bin'), join(dataHome, 'npm', 'bin'), join(home, '.opencode', 'bin'),
    join(home, '.claude', 'local'), join(home, '.claude', 'local', 'node_modules', '.bin'));
  add('volta', join(voltaHome, 'bin'));
  add('mise', join(miseHome, 'shims'));
  add('fnm', env.FNM_MULTISHELL_PATH ? join(env.FNM_MULTISHELL_PATH, ...(platform === 'win32' ? [] : ['bin'])) : undefined);
  if (platform === 'win32') {
    add('npm', env.APPDATA ? join(env.APPDATA, 'npm') : join(home, 'AppData', 'Roaming', 'npm'));
    add('system', env.ProgramFiles ? join(env.ProgramFiles, 'nodejs') : undefined,
      env.LOCALAPPDATA ? join(env.LOCALAPPDATA, 'Programs', 'nodejs') : undefined);
    add('nvm', env.NVM_SYMLINK);
    add('volta', env.LOCALAPPDATA ? join(env.LOCALAPPDATA, 'Volta', 'bin') : undefined);
  } else {
    add('system', '/usr/local/bin', '/usr/bin', '/bin', '/opt/homebrew/bin', '/snap/bin');
  }

  const versioned = await Promise.all([
    versionDirectories(join(nvmHome, 'versions', 'node'), ['bin'], 'nvm'),
    ...(platform === 'win32' && env.NVM_HOME ? [versionDirectories(env.NVM_HOME, [], 'nvm')] : []),
    ...fnmHomes.map((base) => versionDirectories(join(base, 'node-versions'),
      platform === 'win32' ? ['installation'] : ['installation', 'bin'], 'fnm')),
    versionDirectories(join(miseHome, 'installs', 'node'), ['bin'], 'mise'),
  ]);
  directories.push(...versioned.flat());
  return directories;
}

function environmentValue(env: NodeJS.ProcessEnv, name: string, platform: NodeJS.Platform): string | undefined {
  const key = platform === 'win32'
    ? Object.keys(env).sort().find((key) => key.toUpperCase() === name.toUpperCase())
    : name;
  return key ? env[key] : undefined;
}

function executableNames(name: string, env: NodeJS.ProcessEnv, platform: NodeJS.Platform): string[] {
  if (platform !== 'win32') return [name];
  const extensions = (environmentValue(env, 'PATHEXT', platform) ?? '.COM;.EXE;.BAT;.CMD').split(';');
  return [...new Set(extensions.flatMap((extension) => {
    const filename = name.toLowerCase().endsWith(extension.toLowerCase()) ? name : `${name}${extension}`;
    return [filename, filename.toLowerCase()];
  }))];
}

async function locateEntry(path: string, source: string, platform: NodeJS.Platform): Promise<DetectedInstallation | undefined> {
  let executableFile = false;
  let resolvedPath = path;
  try {
    const metadata = await stat(path);
    if (!metadata.isFile() || (platform !== 'win32' && (metadata.mode & 0o111) === 0)) return undefined;
    executableFile = true;
    resolvedPath = await realpath(path);
    await access(path, platform === 'win32' ? constants.F_OK : constants.X_OK);
    return { path, realPath: resolvedPath, source, isPathDefault: false };
  } catch (error) {
    const cause = error as NodeJS.ErrnoException;
    if (executableFile && (cause.code === 'EACCES' || cause.code === 'EPERM')) {
      return { path, realPath: resolvedPath, source, isPathDefault: false, error: cause.message };
    }
    return undefined;
  }
}

function pathDirectories(env: NodeJS.ProcessEnv, platform: NodeJS.Platform): SearchDirectory[] {
  const value = environmentValue(env, 'PATH', platform);
  return value === undefined ? [] : value.split(platform === 'win32' ? ';' : ':').map(path => ({
    path: platform === 'win32' && path.startsWith('"') && path.endsWith('"') ? path.slice(1, -1) : path,
    source: 'PATH',
  }));
}

/** Resolves a runtime only within PATH, using tool discovery's quoting and PATHEXT rules. */
export async function findPathExecutable(executable: string, env: NodeJS.ProcessEnv = process.env): Promise<string | undefined> {
  for (const directory of pathDirectories(env, process.platform)) {
    for (const name of executableNames(executable, env, process.platform)) {
      const entry = await locateEntry(resolve(directory.path, name), 'PATH', process.platform);
      if (entry) return entry.path;
    }
  }
  return undefined;
}

/** Discovers executable files without running them. The first PATH entry remains the default. */
export async function discoverTool(
  tool: ToolDefinition,
  options: DetectionOptions = {},
): Promise<ToolDetection> {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const names = executableNames(tool.executable, env, platform);
  const installations: DetectedInstallation[] = [];
  const seen = new Set<string>();
  const directories = [
    ...pathDirectories(env, platform),
    ...await fallbackDirectories(options, env, platform),
  ];
  for (const directory of directories) {
    for (const name of names) {
      const entry = await locateEntry(resolve(directory.path, name), directory.source, platform);
      if (entry) {
        const identity = platform === 'win32' ? entry.realPath.toLowerCase() : entry.realPath;
        if (!seen.has(identity)) {
          seen.add(identity);
          entry.isPathDefault = directory.source === 'PATH' && installations.length === 0;
          installations.push(entry);
        }
        break;
      }
    }
  }
  return { tool, installations };
}

/** Refreshes all installations and probes their versions with bounded process concurrency. */
export async function detectTools(tools: readonly ToolDefinition[], options: DetectionOptions = {}): Promise<ToolDetection[]> {
  const detections = await Promise.all(tools.map((tool) => discoverTool(tool, options)));
  const pending = detections.flatMap((detection) => detection.installations.map((installation, index) => ({ detection, installation, index })));
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
    while (cursor < pending.length) {
      const task = pending[cursor++]!;
      task.detection.installations[task.index] = await probeInstallation(task.detection.tool, task.installation, options);
    }
  }));
  return detections;
}

/** Reads a version through the launcher; failure retains the installation with an error. */
export async function probeInstallation(
  tool: ToolDefinition,
  installation: DetectedInstallation,
  options: DetectionOptions = {},
): Promise<DetectedInstallation> {
  const result = await probeProcess({ file: installation.path, args: tool.versionArgs,
    env: installationEnv(installation, options.env) });
  const { version: _previousVersion, error: _previousError, ...current } = installation;
  const output = stripVTControlCharacters(`${result.stdout}\n${result.stderr}`).trim();
  if (result.code !== 0 || result.error || result.timedOut) {
    const reason = result.error ?? (result.timedOut ? 'Version probe timed out' : `Version probe exited with code ${result.code}`);
    return { ...current, error: `${reason}${output ? `: ${output.slice(0, 500)}` : ''}` };
  }
  const version = output.match(/(?:^|[^\w.])v?(\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?)(?=$|[^\w.])/m)?.[1];
  return { ...current, ...(version ? { version } : { error: output ? 'No recognizable version in tool output' : 'Version probe returned no output' }) };
}

/** Returns a child environment, adding a fallback launcher's directory for sibling runtimes. */
export function installationEnv(installation: DetectedInstallation, env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const result = { ...env };
  const pathKeys = process.platform === 'win32' ? Object.keys(result).filter((key) => key.toUpperCase() === 'PATH').sort() : ['PATH'];
  const pathKey = pathKeys[0] ?? 'PATH';
  const previous = result[pathKey];
  for (const duplicate of pathKeys.slice(1)) delete result[duplicate];
  if (!installation.isPathDefault) {
    result[pathKey] = `${dirname(installation.path)}${previous ? `${delimiter}${previous}` : ''}`;
  }
  return result;
}
