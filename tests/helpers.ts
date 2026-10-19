import { mkdtemp, mkdir, writeFile, chmod, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFile } from 'node:child_process';

export async function fixture() {
  const dir = await realpath(await mkdtemp(join(tmpdir(), 'fastcli-test-')));
  const bin = join(dir, 'bin');
  await mkdir(bin);
  return {
    dir, bin,
    env: { ...process.env, FASTCLI_HOME: join(dir, 'config'), HOME: dir, USERPROFILE: dir,
      PATH: `${bin}${process.platform === 'win32' ? ';' : ':'}${dirname(process.execPath)}`,
      VOLTA_HOME: join(dir, '.volta'), NVM_DIR: join(dir, '.nvm'), NVM_HOME: join(dir, '.nvm'), NVM_SYMLINK: '',
      FNM_DIR: join(dir, '.fnm'), FNM_MULTISHELL_PATH: '', MISE_DATA_DIR: join(dir, '.mise'),
      APPDATA: join(dir, 'AppData'), LOCALAPPDATA: join(dir, 'LocalAppData'), XDG_DATA_HOME: join(dir, '.local/share'),
      npm_config_prefix: '', NPM_CONFIG_PREFIX: '' },
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

export async function fakeCli(bin: string, name: string, body: string) {
  const script = join(bin, `${name}.cjs`);
  await writeFile(script, body);
  const launcher = join(bin, name + (process.platform === 'win32' ? '.cmd' : ''));
  await writeFile(launcher, process.platform === 'win32'
    ? `@echo off\r\n"${process.execPath}" "${script}" %*\r\n`
    : `#!/bin/sh\nexec '${process.execPath.replaceAll("'", "'\\''")}' '${script.replaceAll("'", "'\\''")}' "$@"\n`);
  await chmod(launcher, 0o755);
  return launcher;
}

export function cli(args: string[], env: NodeJS.ProcessEnv, cwd?: string, input?: string) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = execFile(process.execPath, [join(import.meta.dirname, '../dist/index.js'), ...args],
      { env, cwd, timeout: 15000 }, (error, stdout, stderr) => {
        resolve({ code: error ? typeof error.code === 'number' ? error.code : 1 : 0, stdout, stderr });
      });
    child.stdin?.end(input);
  });
}

/** A real executable npm boundary that only mutates its temporary prefix. */
export async function fakeNpm(f: Awaited<ReturnType<typeof fixture>>) {
  const prefix = join(f.dir, 'npm-prefix');
  const root = process.platform === 'win32' ? join(prefix, 'node_modules') : join(prefix, 'lib/node_modules');
  const log = join(f.dir, 'npm.jsonl');
  await fakeCli(f.bin, 'npm', `
const fs = require('node:fs'), path = require('node:path');
const args = process.argv.slice(2), prefix = ${JSON.stringify(prefix)}, root = ${JSON.stringify(root)};
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args)+'\\n');
if(args[0]==='version') console.log(JSON.stringify({npm:process.env.TEST_NPM_VERSION||'11.16.0',node:'22.19.0'}));
else if(args[0]==='prefix') console.log(prefix);
else if(args[0]==='root') console.log(root);
else {
  const name=args[2].replace(/@latest$/,''), executable=({'@anthropic-ai/claude-code':'claude','@openai/codex':'codex','@google/gemini-cli':'gemini','@xai-official/grok':'grok','opencode-ai':'opencode','@earendil-works/pi-coding-agent':'pi'})[name];
  if(!executable || process.env.npm_config_prefix !== prefix || args[args.indexOf('--prefix')+1] !== prefix) process.exit(99);
  const target=path.join(root,name), bin=process.platform==='win32'?prefix:path.join(prefix,'bin'), entry=path.join(bin,executable+(process.platform==='win32'?'.cmd':''));
  if(args[0]==='uninstall') { fs.rmSync(target,{recursive:true,force:true});fs.rmSync(entry,{force:true}); }
  else if(args[0]==='i') {
    fs.mkdirSync(target,{recursive:true});fs.mkdirSync(bin,{recursive:true});
    const script=path.join(target,'cli.cjs');
    fs.writeFileSync(path.join(target,'package.json'), JSON.stringify({name,version:'9.8.7',bin:{[executable]:'cli.cjs'}}));
    fs.writeFileSync(script, '#!'+process.execPath+'\\nconsole.log("9.8.7");\\n');fs.chmodSync(script,0o755);
    fs.rmSync(entry,{force:true});
    if(process.platform==='win32') fs.writeFileSync(entry, '@ECHO off\\r\\nSET "dp0=%~dp0"\\r\\n"'+process.execPath+'" "%dp0%\\\\'+path.relative(bin,script)+'" %*\\r\\n');
    else fs.symlinkSync(script,entry);
  } else process.exit(98);
  process.exitCode=Number(process.env.TEST_NPM_FAIL||0);
}
`);
  return { prefix, root, log };
}

/** Windows path spelling is case-insensitive; POSIX comparisons stay byte-for-byte strict. */
export function comparablePath(path: string): string {
  return process.platform === 'win32' ? path.toLowerCase() : path;
}
