import { readFile, rename, writeFile } from 'node:fs/promises';

import { getAppConfigPath, getToolsPath } from './paths.js';
import {
  DEFAULT_APP_CONFIG,
  DEFAULT_TOOLS_FILE,
  SCHEMA_VERSION,
  type AppConfig,
  type ToolsFile,
} from './schema.js';
import { normalizeLanguage, t } from '../i18n.js';

/**
 * 当 `config.json` / `tools.json` 不是合法 JSON、或解析结果不是对象时抛出。
 *
 * 公开 `path` 字段，便于上层错误处理打印「配置文件损坏：<path>」并提示
 * 用户运行 `fastcli config edit` 修复（PRD 错误处理矩阵）。reader 不会
 * 覆盖原文件，原始内容保持不变。
 */
export class ConfigCorruptError extends Error {
  /** 出问题的文件绝对路径。 */
  public readonly path: string;

  constructor(path: string, detail?: string) {
    super(detail === undefined ? t('reader.corrupt', { path }) : detail);
    this.name = 'ConfigCorruptError';
    this.path = path;
    // 修正基于原型链的 instanceof 行为（TS 编译为 ES5 时尤其需要，这里也加上以防降级目标）。
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 当配置文件 `version` 字段值高于当前已知的 {@link SCHEMA_VERSION} 时抛出。
 *
 * 由调用方决定如何展示提示（通常是「配置文件版本过新，请升级 fastcli」），
 * reader 不会修改原文件。
 */
export class ConfigVersionTooNewError extends Error {
  /** 出问题的文件绝对路径。 */
  public readonly path: string;
  /** 文件中读到的版本字符串。 */
  public readonly version: string;

  constructor(path: string, version: string) {
    super(t('reader.tooNew', { version, path }));
    this.name = 'ConfigVersionTooNewError';
    this.path = path;
    this.version = version;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 判断错误是否为「文件不存在」（ENOENT）。
 *
 * Node.js 的 `fs/promises` 在文件缺失时会抛出 `code === 'ENOENT'` 的
 * `NodeJS.ErrnoException`，但类型上是 `unknown`，因此需要做窄化判断。
 */
function isENOENT(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

/**
 * 把字符串形式的 `version` 字段与当前 {@link SCHEMA_VERSION} 做安全比较。
 *
 * 当前 schema 为 `'2'`，未来若升级到 `'10'` 等，仅靠字典序比较
 * `'10' > '2'` 会得到错误结果（字典序下 `'10' < '2'`）。因此把两侧都解析
 * 成整数后再比较；若文件中的 `version` 不是有效的非负整数字符串，则保守
 * 视为「过新」（拒绝启动），避免静默接受未知格式。
 */
function isVersionTooNew(version: string): boolean {
  const current = Number.parseInt(SCHEMA_VERSION, 10);
  const parsed = Number.parseInt(version, 10);
  // 非法或不是整数字符串：保守拒绝，让用户看到明确错误。
  if (!Number.isFinite(parsed) || String(parsed) !== version) {
    return true;
  }
  return parsed > current;
}

type JsonObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function backupAndWriteDefault<T>(
  path: string,
  defaultValue: T,
): Promise<T> {
  const ts = Math.floor(Date.now() / 1000);
  const backupPath = `${path}.bak.${ts}`;
  await rename(path, backupPath);
  await writeJsonFile(path, defaultValue);
  console.warn(
    t('reader.oldBackup', { backupPath }),
  );
  return defaultValue;
}

function rejectCorrupt(path: string, detail: string): never {
  throw new ConfigCorruptError(path, detail);
}

function validateCommandArray(
  path: string,
  toolId: string,
  op: string,
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    rejectCorrupt(path, t('reader.commandArray', { toolId, op }));
  }
  if (value.length < 1) {
    rejectCorrupt(path, t('reader.commandArrayNonEmpty', { toolId, op }));
  }
  for (const item of value) {
    if (typeof item !== 'string' || item.trim().length === 0) {
      rejectCorrupt(path, t('reader.commandArrayNonEmpty', { toolId, op }));
    }
  }
  return value;
}

function validateToolsFileShape(path: string, parsed: JsonObject): ToolsFile {
  if (!Array.isArray(parsed.tools)) {
    rejectCorrupt(path, `配置文件损坏：${path}`);
  }

  for (const tool of parsed.tools) {
    if (!isPlainObject(tool)) {
      rejectCorrupt(path, `配置文件损坏：${path}`);
    }
    const id = typeof tool.id === 'string' && tool.id.length > 0
      ? tool.id
      : '<unknown>';
    if (!isPlainObject(tool.commands)) {
      rejectCorrupt(path, `配置文件损坏：${path}`);
    }
    for (const [op, value] of Object.entries(tool.commands)) {
      validateCommandArray(path, id, op, value);
    }
  }

  return parsed as ToolsFile;
}

function migrateToolsFileV1(path: string, parsed: JsonObject): ToolsFile {
  if (!Array.isArray(parsed.tools)) {
    rejectCorrupt(path, `配置文件损坏：${path}`);
  }

  const migratedTools = parsed.tools.map((tool) => {
    if (!isPlainObject(tool)) {
      rejectCorrupt(path, `配置文件损坏：${path}`);
    }
    const id = typeof tool.id === 'string' && tool.id.length > 0
      ? tool.id
      : '<unknown>';
    if (!isPlainObject(tool.commands)) {
      rejectCorrupt(path, `配置文件损坏：${path}`);
    }

    const commands: JsonObject = {};
    for (const [op, value] of Object.entries(tool.commands)) {
      if (typeof value === 'string') {
        commands[op] = [value];
        continue;
      }
      commands[op] = validateCommandArray(path, id, op, value);
    }

    return {
      ...tool,
      version: undefined,
      commands,
    };
  }).map(({ version: _version, ...tool }) => tool);

  const migrated = {
    ...parsed,
    version: SCHEMA_VERSION,
    tools: migratedTools,
  } as ToolsFile;

  validateToolsFileShape(path, migrated as unknown as JsonObject);
  return migrated;
}

/**
 * 通用加载逻辑：处理「不存在 / 损坏 / 旧 schema / 未来 schema / 正常」五种情况。
 *
 * - 文件不存在 → 返回默认值（不写盘，让 writer 在用户主动写入时再创建）
 * - JSON.parse 失败或解析结果不是非空对象 → 抛 {@link ConfigCorruptError}
 * - JSON 合法但缺 `version` 字段 → 视为旧 schema：把原文件 `rename` 到
 *   `<path>.bak.<unix-ts-seconds>`，再用 `fs.writeFile` 把默认值写回原路径，
 *   并通过 `console.warn` 打印一次性迁移提示，最后返回默认值
 * - `version` 字段存在但高于 `SCHEMA_VERSION` → 抛 {@link ConfigVersionTooNewError}
 * - 其他 → 强制断言为目标类型并返回（结构化校验留给 writer / 上层使用方）
 *
 * 备份与默认写入这里直接使用 `node:fs/promises`：
 *   - 任务 2.4 (`writer.ts`) 才会引入 0o600 + 原子 rename 的封装；
 *   - 在迁移路径上保持轻依赖，避免 reader 反向依赖 writer。
 *   - 默认值写入采用 `JSON.stringify(value, null, 2)` 加末尾换行。
 */
async function readJsonObject(
  path: string,
  defaultValue: unknown,
): Promise<JsonObject | undefined> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    if (isENOENT(err)) {
      return undefined;
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigCorruptError(path);
  }

  if (!isPlainObject(parsed)) {
    throw new ConfigCorruptError(path);
  }

  const obj = parsed as JsonObject;

  if (typeof obj.version !== 'string') {
    await backupAndWriteDefault(path, defaultValue);
    return undefined;
  }

  if (isVersionTooNew(obj.version)) {
    throw new ConfigVersionTooNewError(path, obj.version);
  }

  return obj;
}

/**
 * 加载 `~/.fastcli/config.json`。
 *
 * 行为细节见 {@link loadJsonFile} 文档。文件不存在时返回 {@link DEFAULT_APP_CONFIG}
 * 但**不**写盘；写盘由首次运行引导 / writer 负责。
 */
export async function loadAppConfig(): Promise<AppConfig> {
  const path = getAppConfigPath();
  const parsed = await readJsonObject(path, DEFAULT_APP_CONFIG);
  if (parsed === undefined) {
    return DEFAULT_APP_CONFIG;
  }

  if (parsed.version === '1') {
    const migrated = {
      ...parsed,
      version: SCHEMA_VERSION,
      language: normalizeLanguage(parsed.language),
    } as AppConfig;
    await writeJsonFile(path, migrated);
    console.warn(t('reader.configUpgraded', {}, migrated.language));
    return migrated;
  }

  if (parsed.version !== SCHEMA_VERSION) {
    throw new ConfigCorruptError(path);
  }

  return {
    ...(parsed as AppConfig),
    language: normalizeLanguage(parsed.language),
  };
}

/**
 * 加载 `~/.fastcli/tools.json`。
 *
 * 行为细节见 {@link loadJsonFile} 文档。文件不存在时返回 {@link DEFAULT_TOOLS_FILE}
 * 但**不**写盘。仅在需要工具数据的命令路径上调用（懒加载，PRD §4.8）。
 */
export async function loadToolsFile(): Promise<ToolsFile> {
  const path = getToolsPath();
  const parsed = await readJsonObject(path, DEFAULT_TOOLS_FILE);
  if (parsed === undefined) {
    return DEFAULT_TOOLS_FILE;
  }

  if (parsed.version === '1') {
    const migrated = migrateToolsFileV1(path, parsed);
    await writeJsonFile(path, migrated);
    console.warn(t('reader.toolsUpgraded'));
    return migrated;
  }

  if (parsed.version !== SCHEMA_VERSION) {
    throw new ConfigCorruptError(path);
  }

  return validateToolsFileShape(path, parsed);
}
