/**
 * fastcli 顶层入口。
 *
 * shebang 由 tsup 在构建时注入（tsup.config.ts 的 banner），源码这里不写。
 *
 * 用 citty 把所有子命令挂载在主命令下；当 `argv.slice(2).length === 0` 时
 * 进入交互式主菜单（先跑首次运行引导，再进菜单循环）。
 *
 * 顶层异常拦截：把 `ConfigCorruptError` / `ConfigVersionTooNewError` 转成
 * 友好中文提示并以退出码 1 退出，避免把堆栈直接抛给用户。
 *
 * Validates: Requirements 3.11, 6.2
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineCommand, runMain } from 'citty';

import {
  ConfigCorruptError,
  ConfigVersionTooNewError,
} from './config/reader.js';
import addCommand from './cli/commands/add.js';
import configCommand from './cli/commands/config.js';
import editCommand from './cli/commands/edit.js';
import infoCommand from './cli/commands/info.js';
import listCommand from './cli/commands/list.js';
import removeCommand from './cli/commands/remove.js';
import runCommand from './cli/commands/run.js';
import viewCommand from './cli/commands/view.js';
import { runFirstRunIfNeeded } from './cli/first-run.js';
import { runInteractiveMenu } from './cli/menu.js';
import { t } from './i18n.js';

/** 从 package.json 读取版本号；编译产物在 dist/，源 package.json 在 ../package.json。 */
function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(here, '..', 'package.json');
  const raw = readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(raw) as { version?: unknown };
  return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
}

const main = defineCommand({
  meta: {
    name: 'fastcli',
    version: readPackageVersion(),
    description: t('cli.main.description'),
  },
  subCommands: {
    run: runCommand,
    list: listCommand,
    info: infoCommand,
    add: addCommand,
    edit: editCommand,
    remove: removeCommand,
    view: viewCommand,
    config: configCommand,
  },
  async run() {
    // 顶层 run：在 argv 无子命令时进入交互菜单。
    // citty 在匹配到 subCommand 时不会调用此 run；走到这里就意味着用户
    // 仅输入了 `fastcli`（或带 --help / --version 这类被 citty 自身处理的旗标）。
    if (process.argv.slice(2).length === 0) {
      await runFirstRunIfNeeded();
      await runInteractiveMenu();
    }
  },
});

/**
 * 顶层异常拦截。
 *
 * - {@link ConfigCorruptError}：输出 `配置文件损坏：<path>` 并提示运行
 *   `fastcli config edit` 修复（Requirement 6.2）。
 * - {@link ConfigVersionTooNewError}：输出版本过新提示，建议升级
 *   fastcli（Requirement 4.6）。
 * - 其它错误：原样抛出由 citty 默认处理（堆栈对开发者友好）。
 */
try {
  const subCommand = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
  if (subCommand === 'web') {
    console.error('Unknown command `web`');
    process.exit(1);
  }
  await runMain(main);
} catch (err) {
  if (err instanceof ConfigCorruptError) {
    console.error(err.message);
    if (err.message !== t('reader.corrupt', { path: err.path })) {
      console.error(t('reader.filePath', { path: err.path }));
    }
    console.error(t('reader.fixHint'));
    process.exit(1);
  }
  if (err instanceof ConfigVersionTooNewError) {
    console.error(t('reader.upgradeFastcli', { version: err.version }));
    console.error(t('reader.filePath', { path: err.path }));
    process.exit(1);
  }
  throw err;
}
