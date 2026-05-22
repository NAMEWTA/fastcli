import { randomUUID } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_APP_CONFIG,
  DEFAULT_TOOLS_FILE,
  type AppConfig,
} from '../../src/config/schema.js';
import { saveAppConfig, saveToolsFile } from '../../src/config/writer.js';

/**
 * 配置写入层（`src/config/writer.ts`）的测试。
 *
 * 覆盖：
 * - 写入路径正确（`<FASTCLI_HOME>/config.json` / `tools.json`）
 * - POSIX 上权限位 = 0o600（Windows 上 chmod 静默失败，跳过）
 * - 原子 rename：写入后没有 `.tmp-*` 临时文件残留；二次写入正确替换
 * - 目录不存在时自动创建
 *
 * 隔离策略：每个用例使用 `os.tmpdir()` 下一个唯一目录，并通过
 * `FASTCLI_HOME` 环境变量覆盖 writer 的根路径。
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 * PBT: Property 5（配置写入的原子性与权限）
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
});

describe('saveAppConfig - 写入路径与内容', () => {
  it('把 AppConfig 写入 <FASTCLI_HOME>/config.json，内容可往返还原', async () => {
    const config: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      packageManager: 'npm',
      firstRun: false,
    };

    await saveAppConfig(config);

    const filePath = path.join(tmpDir, 'config.json');
    const raw = await readFile(filePath, 'utf8');
    expect(JSON.parse(raw)).toEqual(config);
  });
});

describe('saveToolsFile - 写入路径与内容', () => {
  it('把 ToolsFile 写入 <FASTCLI_HOME>/tools.json，内容可往返还原', async () => {
    await saveToolsFile(DEFAULT_TOOLS_FILE);

    const filePath = path.join(tmpDir, 'tools.json');
    const raw = await readFile(filePath, 'utf8');
    expect(JSON.parse(raw)).toEqual(DEFAULT_TOOLS_FILE);
  });
});

describe('saveAppConfig - 权限位（POSIX）', () => {
  it.skipIf(process.platform === 'win32')(
    'POSIX 平台上写入后的 config.json 权限位等于 0o600',
    async () => {
      await saveAppConfig(DEFAULT_APP_CONFIG);

      const filePath = path.join(tmpDir, 'config.json');
      const st = await stat(filePath);
      // 屏蔽掉文件类型位，仅比较权限位。
      expect(st.mode & 0o777).toBe(0o600);
    },
  );

  it.skipIf(process.platform === 'win32')(
    'POSIX 平台上写入后的 tools.json 权限位等于 0o600',
    async () => {
      await saveToolsFile(DEFAULT_TOOLS_FILE);

      const filePath = path.join(tmpDir, 'tools.json');
      const st = await stat(filePath);
      expect(st.mode & 0o777).toBe(0o600);
    },
  );
});

describe('saveAppConfig - 自动创建目录', () => {
  it('目标目录不存在时由 writer 自动创建', async () => {
    // 删除 tmpDir 让 FASTCLI_HOME 指向一个尚不存在的路径。
    await fs.rm(tmpDir, { recursive: true, force: true });

    await saveAppConfig(DEFAULT_APP_CONFIG);

    // 目录与文件都被自动创建。
    const dirStat = await stat(tmpDir);
    expect(dirStat.isDirectory()).toBe(true);

    const fileStat = await stat(path.join(tmpDir, 'config.json'));
    expect(fileStat.isFile()).toBe(true);
  });
});

describe('saveAppConfig - 无临时文件残留', () => {
  it('写入完成后目录中没有 .tmp-* 临时文件', async () => {
    await saveAppConfig(DEFAULT_APP_CONFIG);

    const entries = await readdir(tmpDir);
    const tempLeftovers = entries.filter((name) =>
      /\.tmp-/.test(name),
    );
    expect(tempLeftovers).toEqual([]);
    // 目录中应只含 config.json。
    expect(entries).toEqual(['config.json']);
  });
});

describe('saveAppConfig - 原子替换', () => {
  it('连续两次写入时第二次正确覆盖第一次的内容', async () => {
    const first: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      packageManager: 'volta',
      firstRun: true,
    };
    const second: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      packageManager: 'npm',
      firstRun: false,
    };

    await saveAppConfig(first);
    await saveAppConfig(second);

    const filePath = path.join(tmpDir, 'config.json');
    const raw = await readFile(filePath, 'utf8');
    expect(JSON.parse(raw)).toEqual(second);

    // 第二次写入也不应残留临时文件。
    const entries = await readdir(tmpDir);
    expect(entries.filter((n) => /\.tmp-/.test(n))).toEqual([]);
  });
});
