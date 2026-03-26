import { mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Config } from '../../../src/types/index.js';
import { startWebAdminServer } from '../../../src/core/web/api-server.js';

const TEST_ROOT = join(tmpdir(), `fastcli-web-api-${Date.now()}`);

interface HttpJsonResponse<T = unknown> {
  status: number;
  body: T;
  headers: Headers;
}

function writeConfig(homeDir: string, config: Config): void {
  const fastcliDir = join(homeDir, '.fastcli');
  mkdirSync(fastcliDir, { recursive: true });
  writeFileSync(join(fastcliDir, 'config.json'), JSON.stringify(config, null, 2), 'utf-8');
}

async function requestJson<T = unknown>(
  url: string,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
    cookie?: string;
  } = {},
): Promise<HttpJsonResponse<T>> {
  const headers = new Headers();
  if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
  }
  if (options.cookie) {
    headers.set('cookie', options.cookie);
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  return {
    status: response.status,
    body: (await response.json()) as T,
    headers: response.headers,
  };
}

describe.sequential('WebApiServer', () => {
  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;

  beforeEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    process.env.USERPROFILE = originalUserProfile;
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  it('GET /api/config should return working copy', async () => {
    const homeDir = join(TEST_ROOT, 'home-config-ok');
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    const config: Config = {
      aliases: { gs: { command: 'git status' } },
      workflows: {},
    };
    writeConfig(homeDir, config);

    const server = await startWebAdminServer();
    try {
      const response = await requestJson<{ ok: boolean; config: Config }>(`${server.url}/api/config`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.config).toEqual(config);
    } finally {
      await server.close();
    }
  });

  it('GET /api/config should return readable error and fix hint when config is missing', async () => {
    const homeDir = join(TEST_ROOT, 'home-config-missing');
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;

    const server = await startWebAdminServer();
    try {
      const response = await requestJson<{ ok: boolean; error: string; hint: string }>(`${server.url}/api/config`);

      expect(response.status).toBe(500);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain('配置文件不存在');
      expect(response.body.hint).toContain('fastcli config init');
    } finally {
      await server.close();
    }
  });

  it('POST /api/auth/verify success should unlock write endpoints', async () => {
    const homeDir = join(TEST_ROOT, 'home-auth-ok');
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    writeConfig(homeDir, { aliases: {}, workflows: {} });

    const server = await startWebAdminServer();
    try {
      const auth = await requestJson<{ ok: boolean }>(`${server.url}/api/auth/verify`, {
        method: 'POST',
        body: { token: server.token },
      });
      const setCookie = auth.headers.get('set-cookie');

      expect(auth.status).toBe(200);
      expect(auth.body.ok).toBe(true);
      expect(setCookie).toContain('fastcli_session=');

      const save = await requestJson<{ ok: boolean }>(`${server.url}/api/save`, {
        method: 'POST',
        cookie: setCookie ?? undefined,
      });

      expect(save.status).toBe(200);
      expect(save.body.ok).toBe(true);
    } finally {
      await server.close();
    }
  });

  it('POST /api/save without session should return 401', async () => {
    const homeDir = join(TEST_ROOT, 'home-save-unauthorized');
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    writeConfig(homeDir, { aliases: {}, workflows: {} });

    const server = await startWebAdminServer();
    try {
      const response = await requestJson<{ ok: boolean; error: string }>(`${server.url}/api/save`, {
        method: 'POST',
      });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain('未认证');
    } finally {
      await server.close();
    }
  });

  it('POST /api/validate should return normalized error list', async () => {
    const homeDir = join(TEST_ROOT, 'home-validate-errors');
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    writeConfig(homeDir, {
      aliases: { same: { command: 'echo alias' } },
      workflows: { same: { steps: [] } },
    });

    const server = await startWebAdminServer();
    try {
      const response = await requestJson<{ ok: boolean; valid: boolean; errors: string[] }>(`${server.url}/api/validate`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.valid).toBe(false);
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors.length).toBeGreaterThan(0);
    } finally {
      await server.close();
    }
  });

  it('POST /api/import should replace working copy and trigger validation', async () => {
    const homeDir = join(TEST_ROOT, 'home-import');
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    writeConfig(homeDir, { aliases: {}, workflows: {} });

    const server = await startWebAdminServer();
    try {
      const auth = await requestJson<{ ok: boolean }>(`${server.url}/api/auth/verify`, {
        method: 'POST',
        body: { token: server.token },
      });
      const cookie = auth.headers.get('set-cookie') ?? undefined;

      const imported = {
        aliases: { same: { command: 'echo alias' } },
        workflows: { same: { steps: [] } },
      };

      const importResponse = await requestJson<{ ok: boolean; valid: boolean; errors: string[] }>(`${server.url}/api/import`, {
        method: 'POST',
        cookie,
        body: { config: imported },
      });

      expect(importResponse.status).toBe(200);
      expect(importResponse.body.ok).toBe(true);
      expect(importResponse.body.valid).toBe(false);
      expect(importResponse.body.errors.length).toBeGreaterThan(0);

      const getConfig = await requestJson<{ ok: boolean; config: Config }>(`${server.url}/api/config`);
      expect(getConfig.body.config).toEqual(imported);
    } finally {
      await server.close();
    }
  });

  it('POST /api/save should fail on io/permission error and keep working copy readable', async () => {
    const homeDir = join(TEST_ROOT, 'home-save-io-error');
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    writeConfig(homeDir, { aliases: {}, workflows: {} });

    const server = await startWebAdminServer();
    try {
      const auth = await requestJson<{ ok: boolean }>(`${server.url}/api/auth/verify`, {
        method: 'POST',
        body: { token: server.token },
      });
      const cookie = auth.headers.get('set-cookie') ?? undefined;

      await requestJson(`${server.url}/api/import`, {
        method: 'POST',
        cookie,
        body: {
          config: {
            aliases: { gs: { command: 'git status' } },
            workflows: {},
          },
        },
      });

      const configPath = join(homeDir, '.fastcli', 'config.json');
      unlinkSync(configPath);
      mkdirSync(configPath);

      const save = await requestJson<{ ok: boolean; error: string }>(`${server.url}/api/save`, {
        method: 'POST',
        cookie,
      });

      expect(save.status).toBe(500);
      expect(save.body.ok).toBe(false);
      expect(save.body.error).toContain('保存失败');

      const config = await requestJson<{ ok: boolean; config: Config }>(`${server.url}/api/config`);
      expect(config.status).toBe(200);
      expect(config.body.config.aliases.gs.command).toBe('git status');
    } finally {
      await server.close();
    }
  });

  it('GET /api/export should download current config json', async () => {
    const homeDir = join(TEST_ROOT, 'home-export');
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    const config: Config = {
      aliases: { gp: { command: 'git push' } },
      workflows: {},
    };
    writeConfig(homeDir, config);

    const server = await startWebAdminServer();
    try {
      const response = await fetch(`${server.url}/api/export`);
      const contentType = response.headers.get('content-type');
      const disposition = response.headers.get('content-disposition');
      const jsonText = await response.text();

      expect(response.status).toBe(200);
      expect(contentType).toContain('application/json');
      expect(disposition).toContain('attachment');
      expect(JSON.parse(jsonText)).toEqual(config);
    } finally {
      await server.close();
    }
  });
});
