/**
 * 首次运行引导。
 *
 * 当 `~/.fastcli/config.json` 不存在 / `firstRun === true` 时执行：
 *
 *   1. 打印欢迎语
 *   2. clack.select 选择 `packageManager`（默认 volta）
 *   3. 创建 `~/.fastcli/`、写 `config.json`（`firstRun: false`）和空 `tools.json`
 *   4. 让上层继续走主菜单或子命令
 *
 * 已经初始化（`firstRun === false` 且 `config.json` 存在）时直接返回，
 * 避免重复打扰。
 *
 * Validates: Requirements 5.2
 */

import { access } from 'node:fs/promises';

import { cancel, intro, isCancel, outro, select } from '@clack/prompts';

import { getAppConfigPath } from '../config/paths.js';
import { loadAppConfig, loadToolsFile } from '../config/reader.js';
import { saveAppConfig, saveToolsFile } from '../config/writer.js';
import {
  DEFAULT_APP_CONFIG,
  DEFAULT_TOOLS_FILE,
} from '../config/schema.js';
import { t, type Language } from '../i18n.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function exitIfCanceled<T>(value: T | symbol, language: Language): T {
  if (isCancel(value)) {
    cancel(t('common.cancelled', {}, language));
    process.exit(130);
  }
  return value;
}

/**
 * 检测并执行首次运行引导。
 *
 * - 若 `config.json` 不存在 → 走完整引导
 * - 若 `config.json` 存在但 `firstRun === true` → 也走引导
 * - 否则什么都不做
 *
 * 引导本身只交互一次（询问 packageManager），其它字段使用
 * {@link DEFAULT_APP_CONFIG} 默认值。
 */
export async function runFirstRunIfNeeded(): Promise<void> {
  const configPath = getAppConfigPath();
  const hasConfig = await fileExists(configPath);
  let language: Language = DEFAULT_APP_CONFIG.language;

  // 已存在的配置先尝试读取；只有当 `firstRun === true` 才进入引导。
  if (hasConfig) {
    const cfg = await loadAppConfig();
    language = cfg.language;
    if (cfg.firstRun !== true) {
      return;
    }
  }

  intro(t('firstRun.intro', {}, language));

  const pm = await select({
    message: t('firstRun.pmPrompt', {}, language),
    options: [
      { value: 'volta', label: t('firstRun.voltaRecommended', {}, language) },
      { value: 'npm', label: 'npm' },
    ],
    initialValue: 'volta',
  });
  const pmChoice = exitIfCanceled<string>(pm, language) as 'volta' | 'npm';

  // 写 config.json：默认值 + 用户选择 + firstRun=false
  const newConfig = {
    ...DEFAULT_APP_CONFIG,
    packageManager: pmChoice,
    firstRun: false,
  };
  await saveAppConfig(newConfig);

  // tools.json：若不存在则写默认空对象；存在则保留（避免覆盖用户已有数据）
  const tools = await loadToolsFile();
  if (tools.tools.length === 0 && !hasConfig) {
    await saveToolsFile(DEFAULT_TOOLS_FILE);
  }

  outro(t('firstRun.done', {}, language));
}
