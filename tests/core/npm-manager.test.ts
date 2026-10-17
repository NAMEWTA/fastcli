import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, relative } from 'node:path';
import { buildNpmInvocation, getNpmContext, inspectNpmPackage, manageTool } from '../../src/core/npm-manager.js';
import type { NpmContext } from '../../src/core/npm-manager.js';
import { comparablePath } from '../helpers.js';
import type { ToolDefinition } from '../../src/core/types.js';

const claude: ToolDefinition = {
  id: 'claude', name: 'Claude Code', npmPackage: '@anthropic-ai/claude-code',
  executable: 'claude', launchArgs: ['--dangerously-skip-permissions'], versionArgs: ['--version'],
};

const context: NpmContext = {
  file: '/isolated/bin/npm', version: '11.15.0', prefix: '/isolated', root: '/isolated/lib/node_modules',
  cwd: '/project', env: { PATH: '/isolated/bin', NPM_CONFIG_PREFIX: '/old-target' }, nodeVersion: '22.19.0',
};

let fixture: string;
let scoped: NpmContext;
let bin: string;
let log: string;

async function installFixture(tool = claude, packageDir?: string): Promise<string> {
  const target = packageDir ?? join(scoped.root, tool.npmPackage);
  await mkdir(target, { recursive: true });
  await writeFile(join(target, 'package.json'), JSON.stringify({
    name: tool.npmPackage, version: '1.2.3', bin: { [tool.executable]: 'cli.js' },
  }));
  const script = join(target, 'cli.js');
  await writeFile(script, `#!${process.execPath}\nconsole.log('1.2.3');\n`);
  await chmod(script, 0o755);
  await mkdir(bin, { recursive: true });
  const entry = join(bin, tool.executable + (process.platform === 'win32' ? '.cmd' : ''));
  if (process.platform === 'win32') {
    await writeFile(entry, `@ECHO off\r\nSET "dp0=%~dp0"\r\n"${process.execPath}" "%dp0%\\${relative(bin, script)}" %*\r\n`);
  } else {
    await symlink(script, entry);
  }
  return entry;
}

async function writeNpmFixture(): Promise<void> {
  const script = join(fixture, 'fake-npm.cjs');
  await writeFile(script, `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const prefix = process.env.npm_config_prefix || process.env.FAKE_PREFIX;
const root = process.platform === 'win32' ? path.join(prefix, 'node_modules') : path.join(prefix, 'lib/node_modules');
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ args, prefix, cwd: process.cwd() }) + '\\n');
if (args[0] === 'version') console.log(JSON.stringify({ npm: process.env.FAKE_NPM_VERSION, node: process.env.FAKE_NODE_VERSION }));
else if (args[0] === 'prefix') console.log(prefix);
else if (args[0] === 'root') console.log(root);
else if (args[0] === 'i' || args[0] === 'uninstall') {
  const name = args[2].replace(/@latest$/, '');
  const executable = ({ '@anthropic-ai/claude-code': 'claude', '@openai/codex': 'codex', '@google/gemini-cli': 'gemini',
    '@xai-official/grok': 'grok', 'opencode-ai': 'opencode', '@earendil-works/pi-coding-agent': 'pi' })[name];
  const target = path.join(root, name);
  const bin = process.platform === 'win32' ? prefix : path.join(prefix, 'bin');
  const entry = path.join(bin, executable + (process.platform === 'win32' ? '.cmd' : ''));
  if (!process.env.FAKE_NO_CHANGE) {
    if (args[0] === 'uninstall') { fs.rmSync(target, { recursive: true, force: true }); fs.rmSync(entry, { force: true }); }
    else {
      fs.mkdirSync(target, { recursive: true }); fs.mkdirSync(bin, { recursive: true });
      fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify({ name, version: '9.8.7', bin: { [executable]: 'cli.cjs' } }));
      const cli = path.join(target, 'cli.cjs');
      fs.writeFileSync(cli, '#!' + process.execPath + '\\nconsole.log("9.8.7"); process.exitCode = Number(process.env.FAKE_PROBE_FAIL || 0);\\n');
      fs.chmodSync(cli, 0o755); fs.rmSync(entry, { force: true });
      if (process.platform === 'win32') {
        fs.writeFileSync(entry, '@ECHO off\\r\\nSET "dp0=%~dp0"\\r\\n"' + process.execPath + '" "%dp0%\\\\' + path.relative(bin, cli) + '" %*\\r\\n');
      } else fs.symlinkSync(cli, entry);
    }
  }
  process.exitCode = Number(process.env.FAKE_FAIL_CODE || 0);
}
else process.exitCode = 99;
`);
  await chmod(script, 0o755);
  if (process.platform === 'win32') {
    await writeFile(scoped.file, `@"${process.execPath}" "${script}" %*\r\n`);
  } else {
    await symlink(script, scoped.file);
  }
}

beforeEach(async () => {
  fixture = await realpath(await mkdtemp(join(tmpdir(), 'fastcli-npm-')));
  const prefix = join(fixture, 'prefix');
  bin = process.platform === 'win32' ? prefix : join(prefix, 'bin');
  log = join(fixture, 'npm-log.jsonl');
  scoped = {
    file: join(fixture, process.platform === 'win32' ? 'npm.cmd' : 'npm'),
    version: '11.16.0', prefix,
    root: process.platform === 'win32' ? join(prefix, 'node_modules') : join(prefix, 'lib/node_modules'),
    cwd: fixture, nodeVersion: '22.19.0',
    env: { ...process.env, PATH: [fixture, dirname(process.execPath)].join(delimiter),
      FAKE_PREFIX: prefix, FAKE_LOG: log, FAKE_NPM_VERSION: '11.16.0', FAKE_NODE_VERSION: '22.19.0' },
  };
  for (const key of Object.keys(scoped.env)) {
    if (key.toLowerCase() === 'npm_config_prefix' || (key.toLowerCase() === 'path' && key !== 'PATH')) delete scoped.env[key];
  }
  await mkdir(scoped.root, { recursive: true });
});

afterEach(async () => {
  await rm(fixture, { recursive: true, force: true });
});

describe('npm management', () => {
  it('builds the exact Claude installation command without querying npm', () => {
    expect(buildNpmInvocation(claude, 'install')).toEqual({ file: 'npm', args: [
      'i', '-g', '@anthropic-ai/claude-code@latest', '--ignore-scripts=false',
      '--include=optional', '--allow-scripts=@anthropic-ai/claude-code',
    ] });
  });

  it('adapts OpenCode scripts to npm and pins the previously inspected scope', () => {
    const tool = { ...claude, id: 'opencode', executable: 'opencode', npmPackage: 'opencode-ai' };
    const invocation = buildNpmInvocation(tool, 'install', context);
    expect(invocation).toEqual({
      file: '/isolated/bin/npm', cwd: '/project',
      env: { PATH: '/isolated/bin', npm_config_prefix: '/isolated' },
      args: ['i', '-g', 'opencode-ai@latest', '--ignore-scripts=false', '--include=optional'],
    });
    expect(buildNpmInvocation(tool, 'install').args).toContain('--allow-scripts=opencode-ai');
    expect(buildNpmInvocation(tool, 'install', { ...context, version: '11.16.0' }).args)
      .toContain('--allow-scripts=opencode-ai');
    expect(buildNpmInvocation(tool, 'install', { ...context, version: '11.16.0-beta.1' }).args)
      .not.toContain('--allow-scripts=opencode-ai');
    expect(context.env.NPM_CONFIG_PREFIX).toBe('/old-target');
  });

  it('recognizes a package only through its current npm root and owned bin', async () => {
    const entry = await installFixture();
    expect(await inspectNpmPackage(claude, scoped)).toEqual({ installed: true, entryPath: entry });
    expect(await inspectNpmPackage({ ...claude, npmPackage: '@openai/codex' }, scoped))
      .toEqual({ installed: false, reason: 'foreign-entry' });
    expect(await inspectNpmPackage({ ...claude, executable: 'codex', npmPackage: '@openai/codex' }, scoped))
      .toEqual({ installed: false, reason: 'missing' });
  });

  it('rejects an npm link that points to a package outside the managed root', async () => {
    const outside = join(fixture, 'external-project');
    await installFixture(claude, outside);
    const packageDir = join(scoped.root, claude.npmPackage);
    await mkdir(dirname(packageDir), { recursive: true });
    await symlink(outside, packageDir, process.platform === 'win32' ? 'junction' : 'dir');
    expect(await inspectNpmPackage(claude, scoped))
      .toEqual({ installed: false, reason: 'external-link' });
  });

  it('rejects a manifest whose claimed bin escapes its package', async () => {
    const entry = await installFixture();
    const packageDir = join(scoped.root, claude.npmPackage);
    await writeFile(join(packageDir, 'package.json'), JSON.stringify({
      name: claude.npmPackage, bin: { claude: relative(packageDir, entry) },
    }));
    expect(await inspectNpmPackage(claude, scoped))
      .toEqual({ installed: false, reason: 'invalid-package' });
  });

  it('reads the npm runtime and global scope through the resolved npm executable', async () => {
    await writeNpmFixture();
    const actual = await getNpmContext(scoped.env);
    expect(comparablePath(actual.file)).toBe(comparablePath(scoped.file));
    expect(actual).toMatchObject({ version: '11.16.0', nodeVersion: '22.19.0',
      prefix: scoped.prefix, root: scoped.root, cwd: process.cwd() });
    const events = (await readFile(log, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    expect(events).toHaveLength(3);
    expect(events.every(event => event.args.includes('--global') && event.cwd === actual.cwd)).toBe(true);
  });

  it('installs into the inspected scope and verifies that npm entry rather than another PATH tool', async () => {
    await writeNpmFixture();
    expect(await manageTool(claude, 'install', scoped))
      .toEqual({ code: 0, message: 'success', installed: true, version: '9.8.7' });
    const events = (await readFile(log, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    expect(events).toEqual([{ args: ['i', '-g', '@anthropic-ai/claude-code@latest', '--ignore-scripts=false',
      '--include=optional', '--allow-scripts=@anthropic-ai/claude-code'], prefix: scoped.prefix, cwd: fixture }]);
  });

  it('refuses uninstall when this npm scope does not own the package', async () => {
    await writeNpmFixture();
    expect(await manageTool(claude, 'uninstall', scoped))
      .toEqual({ code: 1, message: 'not-installed', installed: false });
    await expect(readFile(log, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('refuses to mutate a linked external package even for an explicit install', async () => {
    await writeNpmFixture();
    const outside = join(fixture, 'external-project');
    await installFixture(claude, outside);
    const packageDir = join(scoped.root, claude.npmPackage);
    await mkdir(dirname(packageDir), { recursive: true });
    await symlink(outside, packageDir, process.platform === 'win32' ? 'junction' : 'dir');
    expect(await manageTool(claude, 'install', scoped))
      .toEqual({ code: 1, message: 'unmanaged-package', installed: false, details: 'external-link' });
    await expect(readFile(log, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    expect(JSON.parse(await readFile(join(outside, 'package.json'), 'utf8')).version).toBe('1.2.3');
  });

  it('checks the actual npm runtime and Claude script support before changing anything', async () => {
    await writeNpmFixture();
    expect(await manageTool(claude, 'install', { ...scoped, nodeVersion: '20.19.0' }))
      .toMatchObject({ code: 1, message: 'node-too-old', installed: false });
    expect(await manageTool(claude, 'install', { ...scoped, version: '11.15.0' }))
      .toMatchObject({ code: 1, message: 'npm-too-old', installed: false });
    expect(await manageTool(claude, 'install', { ...scoped, version: '11.16.0-beta.1' }))
      .toMatchObject({ code: 1, message: 'npm-too-old', installed: false });
    await expect(readFile(log, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects package bin symlinks that escape into an external installation', async () => {
    await installFixture();
    const script = join(scoped.root, claude.npmPackage, 'cli.js');
    const outside = join(fixture, 'outside.cjs');
    await writeFile(outside, `#!${process.execPath}\nconsole.log('6.6.6');\n`);
    await chmod(outside, 0o755);
    await rm(script);
    await symlink(outside, script, 'file');
    expect(await inspectNpmPackage(claude, scoped))
      .toEqual({ installed: false, reason: 'external-link' });
  });

  it.each(['null', '{}', '{"name":"other-package"}'])('reports an invalid manifest without throwing: %s', async text => {
    const packageDir = join(scoped.root, claude.npmPackage);
    await mkdir(packageDir, { recursive: true });
    await writeFile(join(packageDir, 'package.json'), text);
    expect(await inspectNpmPackage(claude, scoped)).toEqual({ installed: false, reason: 'invalid-package' });
  });

  it('does not mistake a package directory without metadata for a missing installation', async () => {
    await mkdir(join(scoped.root, claude.npmPackage), { recursive: true });
    expect(await inspectNpmPackage(claude, scoped)).toEqual({ installed: false, reason: 'invalid-package' });
  });

  it.each([23, 130])('rechecks actual state after npm exits %i, without retry or rollback', async code => {
    await writeNpmFixture();
    scoped.env.FAKE_FAIL_CODE = String(code);
    expect(await manageTool(claude, 'install', scoped))
      .toEqual({ code, message: 'npm-failed', installed: true });
    expect(await inspectNpmPackage(claude, scoped)).toMatchObject({ installed: true });
    const events = (await readFile(log, 'utf8')).trim().split('\n');
    expect(events).toHaveLength(1);
  });

  it('uninstalls the current package and verifies it has gone', async () => {
    await installFixture();
    await writeNpmFixture();
    expect(await manageTool(claude, 'uninstall', { ...scoped, version: '10.0.0' }))
      .toEqual({ code: 0, message: 'success', installed: false });
    const event = JSON.parse((await readFile(log, 'utf8')).trim());
    expect(event.args).toEqual(['uninstall', '-g', '@anthropic-ai/claude-code']);
  });

  it('rejects npm success without a verified version while preserving installed state', async () => {
    await writeNpmFixture();
    scoped.env.FAKE_PROBE_FAIL = '7';
    expect(await manageTool(claude, 'install', scoped))
      .toMatchObject({ code: 1, message: 'verification-failed', installed: true });
  });

  it('does not report a successful uninstall when npm left the package behind', async () => {
    await installFixture();
    await writeNpmFixture();
    scoped.env.FAKE_NO_CHANGE = '1';
    expect(await manageTool(claude, 'uninstall', scoped))
      .toMatchObject({ code: 1, message: 'verification-failed', installed: true });
  });

  it('protects a foreign global entry even when the npm package bin itself is missing', async () => {
    const entry = await installFixture();
    await writeNpmFixture();
    await rm(join(scoped.root, claude.npmPackage, 'cli.js'));
    await rm(entry);
    await writeFile(entry, `#!${process.execPath}\nconsole.log('foreign');\n`);
    await chmod(entry, 0o755);
    expect(await inspectNpmPackage(claude, scoped))
      .toEqual({ installed: true, reason: 'foreign-entry' });
    expect(await manageTool(claude, 'uninstall', scoped))
      .toEqual({ code: 1, message: 'unmanaged-package', installed: true, details: 'foreign-entry' });
    await expect(readFile(log, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects a package manifest symlinked outside the npm package directory', async () => {
    await installFixture();
    const manifest = join(scoped.root, claude.npmPackage, 'package.json');
    const outside = join(fixture, 'external-package.json');
    await writeFile(outside, await readFile(manifest));
    await rm(manifest);
    await symlink(outside, manifest, 'file');
    expect(await inspectNpmPackage(claude, scoped)).toEqual({ installed: false, reason: 'external-link' });
  });

  it('uses the effective PATH rather than a conflicting differently cased key', async () => {
    await writeNpmFixture();
    expect(comparablePath((await getNpmContext({ Path: join(fixture, 'absent'), ...scoped.env })).file)).toBe(comparablePath(scoped.file));
  });

  it('does not accept a dangling global link owned by a different installation', async () => {
    const entry = await installFixture();
    await rm(entry);
    const foreign = join(fixture, 'missing-foreign.cjs');
    if (process.platform === 'win32') {
      await writeFile(entry, `@ECHO off\r\nSET "dp0=%~dp0"\r\n"${process.execPath}" "%dp0%\\${relative(bin, foreign)}" %*\r\n`);
    } else await symlink(foreign, entry);
    expect(await inspectNpmPackage(claude, scoped)).toEqual({ installed: true, reason: 'foreign-entry' });
  });
});

it('protects a foreign entry even when the target npm package is absent and force is enabled', async () => {
  await writeNpmFixture();
  await mkdir(bin, { recursive: true });
  const entry = join(bin, claude.executable + (process.platform === 'win32' ? '.cmd' : ''));
  const original = 'foreign installation must survive';
  await writeFile(entry, original);
  scoped.env.npm_config_force = 'true';
  expect(await manageTool(claude, 'install', scoped))
    .toEqual({ code: 1, message: 'unmanaged-package', installed: false, details: 'foreign-entry' });
  expect(await readFile(entry, 'utf8')).toBe(original);
  await expect(readFile(log, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
});

it.skipIf(process.platform !== 'win32')('uses quoted Windows PATH and PATHEXT priority for npm', async () => {
  await writeNpmFixture();
  const bat = join(fixture, 'npm.bat');
  await writeFile(bat, await readFile(scoped.file));
  const actual = await getNpmContext({ ...scoped.env, PATH: `"${fixture}"`, PATHEXT: '.BAT;.CMD' });
  expect(comparablePath(actual.file)).toBe(comparablePath(bat));
});

it.skipIf(process.platform !== 'win32').each(['', '.ps1'])('protects foreign Windows sibling launcher %s when cmd is owned', async suffix => {
  await installFixture();
  await writeNpmFixture();
  const entry = join(bin, claude.executable + suffix);
  await writeFile(entry, 'foreign sibling');
  expect(await manageTool(claude, 'uninstall', scoped))
    .toEqual({ code: 1, message: 'unmanaged-package', installed: true, details: 'foreign-entry' });
  expect(await readFile(entry, 'utf8')).toBe('foreign sibling');
  await expect(readFile(log, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
});
