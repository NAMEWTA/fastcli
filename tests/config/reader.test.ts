import { randomUUID } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ConfigCorruptError,
  ConfigVersionTooNewError,
  loadAppConfig,
  loadToolsFile,
} from '../../src/config/reader.js';
import {
  DEFAULT_APP_CONFIG,
  DEFAULT_TOOLS_FILE,
} from '../../src/config/schema.js';

/**
 * 配置读取层（`src/config/reader.ts`）的测试。
 *
 * 覆盖 PRD/Design 中四类核心场景：
 * 1. 文件不存在 → 返回默认值，且不写盘
 * 2. JSON 损坏    → 抛 `ConfigCorruptError` 且不修改原文件
 * 3. 旧 schema   → 原文件备份为 `<name>.bak.<digits>`，原路径写入默认值
 * 4. 未来 schema → 抛 `ConfigVersionTooNewError` 且不修改原文件
 *
 * 隔离策略：每个用例使用 `os.tmpdir()` 下一个唯一目录，并通过
 * `FASTCLI_HOME` 环境变量覆盖 reader 的根路径，避免读写真实 `~/.fastcli/`。
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 * PBT: Property 6（旧 schema 安全降级）
 */

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `fastcli-test-${randomUUID()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  process.env.FASTCLI_HOME = tmpDir;
});

afterEach(async () => {
  delete process.env.FASTCLI_HOME;
  await fs.rm(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('loadAppConfig - 缺失文件', () => {
  it('在 config.json 不存在时返回 DEFAULT_APP_CONFIG 的深等副本', async () => {
    const result = await loadAppConfig();
    expect(result).toEqual(DEFAULT_APP_CONFIG);
  });

  it('在 config.json 不存在时不会创建该文件', async () => {
    await loadAppConfig();
    const entries = await readdir(tmpDir);
    expect(entries).not.toContain('config.json');
  });
});

describe('loadToolsFile - 缺失文件', () => {
  it('在 tools.json 不存在时返回 DEFAULT_TOOLS_FILE 的深等副本', async () => {
    const result = await loadToolsFile();
    expect(result).toEqual(DEFAULT_TOOLS_FILE);
  });

  it('在 tools.json 不存在时不会创建该文件', async () => {
    await loadToolsFile();
    const entries = await readdir(tmpDir);
    expect(entries).not.toContain('tools.json');
  });
});

describe('loadAppConfig - 损坏 JSON', () => {
  it('在内容不是合法 JSON 时抛出 ConfigCorruptError', async () => {
    const filePath = path.join(tmpDir, 'config.json');
    await writeFile(filePath, '{ this is not json', 'utf8');

    await expect(loadAppConfig()).rejects.toBeInstanceOf(ConfigCorruptError);
  });

  it('损坏文件不会被覆盖（字节级保留）', async () => {
    const filePath = path.join(tmpDir, 'config.json');
    const original = '{ this is not json';
    await writeFile(filePath, original, 'utf8');

    await expect(loadAppConfig()).rejects.toBeInstanceOf(ConfigCorruptError);

    const after = await readFile(filePath, 'utf8');
    expect(after).toBe(original);
  });

  it('JSON 是数组（非对象）也视为损坏', async () => {
    const filePath = path.join(tmpDir, 'config.json');
    await writeFile(filePath, '[1, 2, 3]', 'utf8');

    await expect(loadAppConfig()).rejects.toBeInstanceOf(ConfigCorruptError);
  });
});

describe('loadAppConfig - 旧 schema 备份', () => {
  it('合法 JSON 但缺少 version 字段时把原文件备份并写入默认值', async () => {
    // 旧版结构示例：可能含 aliases / workflows 等已删除字段。
    const filePath = path.join(tmpDir, 'config.json');
    const oldContent = JSON.stringify(
      {
        aliases: [{ name: 'gst', command: 'git status' }],
        workflows: [],
      },
      null,
      2,
    );
    await writeFile(filePath, oldContent, 'utf8');

    // 抑制迁移提示输出，避免污染测试日志。
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await loadAppConfig();

    // 1. 返回值是 DEFAULT_APP_CONFIG 的深等副本。
    expect(result).toEqual(DEFAULT_APP_CONFIG);

    // 2. 原路径已被覆盖为 DEFAULT_APP_CONFIG（按对象语义比较）。
    const newRaw = await readFile(filePath, 'utf8');
    expect(JSON.parse(newRaw)).toEqual(DEFAULT_APP_CONFIG);

    // 3. 同目录中存在 config.json.bak.<digits> 形式的备份文件。
    const entries = await readdir(tmpDir);
    const backups = entries.filter((name) =>
      /^config\.json\.bak\.\d+$/.test(name),
    );
    expect(backups).toHaveLength(1);

    // 4. 备份文件的字节与原始旧内容一致。
    const backupRaw = await readFile(path.join(tmpDir, backups[0]!), 'utf8');
    expect(backupRaw).toBe(oldContent);
  });
});

describe('loadAppConfig - v1 自动升级', () => {
  it('version 为 1 时只升级 version 并保留其它字段', async () => {
    const filePath = path.join(tmpDir, 'config.json');
    const v1Config = {
      version: '1',
      packageManager: 'npm',
      editor: 'code',
      confirmBeforeRun: false,
      firstRun: false,
    };
    await writeFile(filePath, JSON.stringify(v1Config, null, 2), 'utf8');
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await loadAppConfig();

    expect(result).toEqual({ ...v1Config, version: '2' });
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual({
      ...v1Config,
      version: '2',
    });
  });
});

describe('loadToolsFile - v1 自动升级', () => {
  it('把字符串命令升级为字符串数组并写回 schema v2', async () => {
    const filePath = path.join(tmpDir, 'tools.json');
    const v1Tools = {
      version: '1',
      tools: [
        {
          id: 'aider',
          name: 'Aider',
          commands: {
            install: 'pip install aider-chat',
            deploy: ['npm run build', 'npm run deploy'],
          },
          source: 'user',
        },
      ],
    };
    await writeFile(filePath, JSON.stringify(v1Tools, null, 2), 'utf8');
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await loadToolsFile();

    expect(result.version).toBe('2');
    expect(result.tools[0]?.commands).toEqual({
      install: ['pip install aider-chat'],
      deploy: ['npm run build', 'npm run deploy'],
    });
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual(result);
  });
});

describe('loadToolsFile - v2 严格校验', () => {
  it('version 为 2 时拒绝字符串命令值', async () => {
    const filePath = path.join(tmpDir, 'tools.json');
    await writeFile(
      filePath,
      JSON.stringify({
        version: '2',
        tools: [
          {
            id: 'aider',
            name: 'Aider',
            commands: { install: 'pip install aider-chat' },
            source: 'user',
          },
        ],
      }),
      'utf8',
    );

    await expect(loadToolsFile()).rejects.toMatchObject({
      message: '操作值必须是字符串数组：aider.install',
    });
  });

  it('拒绝空命令数组', async () => {
    const filePath = path.join(tmpDir, 'tools.json');
    await writeFile(
      filePath,
      JSON.stringify({
        version: '2',
        tools: [
          {
            id: 'aider',
            name: 'Aider',
            commands: { install: [] },
            source: 'user',
          },
        ],
      }),
      'utf8',
    );

    await expect(loadToolsFile()).rejects.toBeInstanceOf(ConfigCorruptError);
  });
});

describe('loadAppConfig - 未来 schema 拒绝', () => {
  it('version 高于已知值时抛 ConfigVersionTooNewError', async () => {
    const filePath = path.join(tmpDir, 'config.json');
    const futureContent = JSON.stringify(
      {
        version: '3',
        packageManager: 'volta',
      },
      null,
      2,
    );
    await writeFile(filePath, futureContent, 'utf8');
    const beforeStat = await stat(filePath);

    await expect(loadAppConfig()).rejects.toBeInstanceOf(
      ConfigVersionTooNewError,
    );

    // 原文件字节级未被修改，且大小、修改时间不变。
    const after = await readFile(filePath, 'utf8');
    expect(after).toBe(futureContent);

    const afterStat = await stat(filePath);
    expect(afterStat.size).toBe(beforeStat.size);

    // 同目录不应出现备份文件（未来 schema 不走备份分支）。
    const entries = await readdir(tmpDir);
    const backups = entries.filter((name) =>
      /^config\.json\.bak\.\d+$/.test(name),
    );
    expect(backups).toHaveLength(0);
  });
});
