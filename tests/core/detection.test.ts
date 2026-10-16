import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { access, chmod, mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { detectTools, discoverTool, installationEnv, probeInstallation } from '../../src/core/detection.js';
import { comparablePath } from '../helpers.js';
import type { ToolDefinition } from '../../src/core/types.js';

const tool: ToolDefinition = {
  id: 'fixture-cli', name: 'Fixture CLI', npmPackage: '@fixture/cli',
  executable: 'fixture-cli', launchArgs: [], versionArgs: ['--version'],
};

let root: string;

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'fastcli-detection-')));
});

describe('installationEnv', () => {
  it('prepends the non-PATH launcher directory without changing the parent environment', () => {
    const directory = join(root, 'runtime with spaces');
    const installation = { path: join(directory, 'fixture-cli'), realPath: '/another/path', source: 'fallback', isPathDefault: false };
    const env = { PATH: 'previous', KEEP: 'value' };
    const result = installationEnv(installation, env);

    expect(result).toEqual({ PATH: `${directory}${delimiter}previous`, KEEP: 'value' });
    expect(env).toEqual({ PATH: 'previous', KEEP: 'value' });
    expect(installationEnv({ ...installation, isPathDefault: true }, env)).toEqual(env);
  });

  it.skipIf(process.platform !== 'win32')('keeps only one Windows PATH spelling', () => {
    const env = { Path: 'lower-priority', PATH: 'selected', KEEP: 'value' };
    const result = installationEnv({ path: join(root, 'bin', 'cli.cmd'), realPath: 'unused', source: 'fallback', isPathDefault: false }, env);
    expect(Object.keys(result).filter((key) => key.toUpperCase() === 'PATH')).toEqual(['PATH']);
    expect(result.PATH).toBe(`${join(root, 'bin')};selected`);
    expect(env.Path).toBe('lower-priority');
  });
});

describe('probeInstallation', () => {
  it('extracts the version from the selected launcher output', async () => {
    const file = await executable(join(root, 'bin'), tool.executable,
      'if (process.argv[2] !== "--version") process.exit(4); console.error("\\u001b[32mfixture-cli v1.2.3-beta.4+build.7\\u001b[0m");');
    const discovered = await discoverTool(tool, options([dirname(file)]));
    const result = await probeInstallation(tool, discovered.installations[0]!, options());

    expect(result).toEqual({ ...discovered.installations[0], version: '1.2.3-beta.4+build.7' });
    expect(discovered.installations[0]!.version).toBeUndefined();
  });

  it('keeps a broken PATH default installed and reports its failed version probe', async () => {
    const first = await executable(join(root, 'broken'), tool.executable,
      'console.error("fixture-cli 1.2.3: missing runtime"); process.exit(9);');
    const second = await executable(join(root, 'working'));
    const discovered = await discoverTool(tool, options([dirname(first), dirname(second)]));
    const result = await probeInstallation(tool, discovered.installations[0]!, options());

    expect(comparablePath(result.path)).toBe(comparablePath(first));
    expect(result.isPathDefault).toBe(true);
    expect(result.version).toBeUndefined();
    expect(result.error).toMatch(/9.*missing runtime/s);
    expect(discovered.installations).toHaveLength(2);
  });

  it.each(['', 'console.log("no version provided");'])('reports an unknown version when successful output has no version: %s', async (body) => {
    const file = await executable(join(root, 'bin'), tool.executable, body);
    const discovered = await discoverTool(tool, options([dirname(file)]));
    const result = await probeInstallation(tool, discovered.installations[0]!, options());

    expect(comparablePath(result.path)).toBe(comparablePath(file));
    expect(result.version).toBeUndefined();
    expect(result.error).toMatch(/version/i);
  });

  it('uses each tool’s version arguments and reports an entry removed after discovery', async () => {
    const file = await executable(join(root, 'bin'), tool.executable,
      'if (process.argv[2] !== "version") process.exit(6); console.log("grok 0.2.4");');
    const discovered = await discoverTool(tool, options([dirname(file)]));
    expect((await probeInstallation({ ...tool, versionArgs: ['version'] }, discovered.installations[0]!, options())).version).toBe('0.2.4');
    await rm(file);
    const vanished = await probeInstallation(tool, discovered.installations[0]!, options());
    expect(comparablePath(vanished.path)).toBe(comparablePath(file));
    expect(vanished.version).toBeUndefined();
    expect(vanished.error).toBeTruthy();
  });

  it('keeps a timed-out version probe installed with an error', async () => {
    const file = await executable(join(root, 'bin'), tool.executable, 'setInterval(() => {}, 1000);');
    const discovered = await discoverTool(tool, options([dirname(file)]));
    const result = await probeInstallation(tool, discovered.installations[0]!, options());
    expect(comparablePath(result.path)).toBe(comparablePath(file));
    expect(result.version).toBeUndefined();
    expect(result.error).toMatch(/timed out|timeout/i);
  }, 10_000);

  it('keeps an excessive-output probe installed and returns a bounded diagnostic', async () => {
    const file = await executable(join(root, 'bin'), tool.executable, 'process.stdout.write("X".repeat(100000)); setInterval(() => {}, 1000);');
    const discovered = await discoverTool(tool, options([dirname(file)]));
    const result = await probeInstallation(tool, discovered.installations[0]!, options());
    expect(comparablePath(result.path)).toBe(comparablePath(file));
    expect(result.version).toBeUndefined();
    expect(result.error).toMatch(/output/i);
    expect(result.error!.length).toBeLessThan(1000);
  });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function executable(directory: string, name = tool.executable, body = 'console.log("fixture-cli 1.2.3");') {
  await mkdir(directory, { recursive: true });
  const file = join(directory, process.platform === 'win32' ? `${name}.cmd` : name);
  if (process.platform === 'win32') {
    const script = join(directory, `${name}.cjs`);
    await writeFile(script, body);
    await writeFile(file, `@"${process.execPath}" "%~dp0${name}.cjs" %*\r\n`);
  } else {
    await writeFile(file, `#!${process.execPath}\n${body}\n`);
    await chmod(file, 0o755);
  }
  return file;
}

function options(paths: string[] = []) {
  return { env: { ...process.env, PATH: paths.join(delimiter) }, home: root, fallbackDirs: [] };
}

describe('discoverTool', () => {
  it('finds the PATH entry without running the tool', async () => {
    const marker = join(root, 'ran');
    const file = await executable(join(root, 'bin'), tool.executable,
      `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran');`);
    const result = await discoverTool(tool, options([dirname(file)]));

    expect(result.installations.map(entry => ({ ...entry, path: comparablePath(entry.path), realPath: comparablePath(entry.realPath) }))).toEqual([{
      path: comparablePath(file), realPath: comparablePath(file), source: 'PATH', isPathDefault: true,
    }]);
    await expect(access(marker)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('retains PATH precedence and deduplicates symlinked fallback installations', async () => {
    const first = await executable(join(root, 'first'));
    const second = await executable(join(root, 'second'));
    const fallback = join(root, 'fallback');
    await mkdir(fallback);
    await symlink(first, join(fallback, process.platform === 'win32' ? `${tool.executable}.cmd` : tool.executable), 'file');
    const other = await executable(join(root, 'other'));
    const result = await discoverTool(tool, {
      ...options([dirname(first), dirname(second), dirname(first)]),
      fallbackDirs: [fallback, dirname(other)],
    });

    expect(result.installations.map(({ path, isPathDefault }) => ({ path: comparablePath(path), isPathDefault }))).toEqual([
      { path: comparablePath(first), isPathDefault: true },
      { path: comparablePath(second), isPathDefault: false },
      { path: comparablePath(other), isPathDefault: false },
    ]);
  });

  it('discovers npm and version-manager directories without a PATH entry', async () => {
    const npmPrefix = join(root, 'npm-global');
    const paths = [
      await executable(process.platform === 'win32' ? npmPrefix : join(npmPrefix, 'bin')),
      await executable(join(root, '.nvm', 'versions', 'node', 'v22.19.0', 'bin')),
      await executable(join(root, '.local', 'share', 'fnm', 'node-versions', 'v24.0.0', 'installation', ...(process.platform === 'win32' ? [] : ['bin']))),
      await executable(join(root, '.volta', 'bin')),
      await executable(join(root, '.local', 'share', 'mise', 'installs', 'node', '22.19.0', 'bin')),
    ];
    const result = await discoverTool(tool, { env: {}, home: root, npmPrefix });

    expect(result.installations.map((entry) => comparablePath(entry.path)).sort()).toEqual(paths.map(comparablePath).sort());
    expect(result.installations.every((entry) => !entry.isPathDefault)).toBe(true);
    expect(result.installations.map((entry) => entry.source).sort()).toEqual(['fnm', 'mise', 'npm', 'nvm', 'volta']);
  });

  it('uses case-insensitive Windows PATH and PATHEXT keys and quoted directories', async () => {
    const directory = join(root, 'Program Files');
    await mkdir(directory);
    const command = join(directory, `${tool.executable}.CMD`);
    await writeFile(command, '@echo fixture 1.2.3');
    await writeFile(join(directory, `${tool.executable}.EXE`), 'fixture');
    const result = await discoverTool(tool, {
      platform: 'win32', env: { Path: `"${directory}"`, PathExt: '.CMD;.EXE' }, home: root, fallbackDirs: [],
    });

    expect(result.installations).toEqual([{ path: command, realPath: command, source: 'PATH', isPathDefault: true }]);
  });

  it('does not treat directories or tool configuration as installations and refreshes new entries', async () => {
    await mkdir(join(root, 'bin', tool.executable), { recursive: true });
    await mkdir(join(root, '.claude'), { recursive: true });
    await writeFile(join(root, '.claude', 'settings.json'), '{}');
    expect((await discoverTool(tool, options([join(root, 'bin')]))).installations).toEqual([]);
    await rm(join(root, 'bin', tool.executable), { recursive: true });
    const entry = await executable(join(root, 'bin'));
    expect(comparablePath((await discoverTool(tool, options([join(root, 'bin')]))).installations[0]!.path)).toBe(comparablePath(entry));
  });

  it.skipIf(process.platform === 'win32')('ignores non-executable files and broken symlinks', async () => {
    const directory = join(root, 'bin');
    await mkdir(directory);
    await writeFile(join(directory, tool.executable), 'plain text');
    const fallback = await executable(join(root, 'fallback'));
    expect((await discoverTool(tool, { ...options([directory]), fallbackDirs: [dirname(fallback)] })).installations)
      .toEqual([{ path: fallback, realPath: fallback, source: 'fallback', isPathDefault: false }]);
    await rm(join(directory, tool.executable));
    await symlink(join(root, 'missing'), join(directory, tool.executable));
    expect((await discoverTool(tool, options([directory]))).installations).toEqual([]);
  });

  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)('retains a permission-denied executable as the PATH default', async () => {
    const first = await executable(join(root, 'restricted'));
    await chmod(first, 0o601);
    const second = await executable(join(root, 'working'));
    const result = await discoverTool(tool, options([dirname(first), dirname(second)]));
    expect(result.installations[0]).toMatchObject({ path: first, isPathDefault: true });
    expect(result.installations[0]?.error).toMatch(/EACCES/);
    expect(result.installations[1]).toMatchObject({ path: second, isPathDefault: false });
  });
});

describe('detectTools', () => {
  it('limits version processes to four while preserving tool order', async () => {
    const directory = join(root, 'bin');
    const journal = join(root, 'journal');
    const lock = join(root, 'lock');
    const definitions = Array.from({ length: 7 }, (_, index) => ({ ...tool, id: `fixture-${index}`, executable: `fixture-${index}` }));
    const body = `
      const fs = require('node:fs');
      const journal = ${JSON.stringify(journal)};
      const lock = ${JSON.stringify(lock)};
      const pid = process.pid;
      function record(event) { fs.appendFileSync(journal, event + ' ' + pid + '\\n'); }
      async function main() {
        while (true) {
          try { fs.mkdirSync(lock); break; }
          catch (error) { if (error.code !== 'EEXIST') throw error; await new Promise(setImmediate); }
        }
        record('start');
        fs.rmdirSync(lock);
        // A real CPU workload keeps simultaneous probes observable without fixed sleeps.
        require('node:crypto').pbkdf2Sync('fixture', 'salt', 100000, 32, 'sha256');
        record('end');
        console.log('fixture-cli 1.2.3');
      }
      main();
    `;
    for (const definition of definitions) await executable(directory, definition.executable, body);
    const result = await detectTools(definitions, options([directory]));
    let active = 0;
    let maximum = 0;
    for (const line of (await readFile(journal, 'utf8')).trim().split('\n')) {
      active += line.startsWith('start ') ? 1 : -1;
      maximum = Math.max(maximum, active);
    }

    expect(maximum).toBeLessThanOrEqual(4);
    expect(active).toBe(0);
    expect(result.map(({ tool }) => tool.id)).toEqual(definitions.map(({ id }) => id));
    expect(result.every(({ installations }) => installations[0]?.version === '1.2.3')).toBe(true);
  });
});
