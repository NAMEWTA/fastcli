import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createWebApp } from '../../src/web-server/server.js';

let tmpDir: string;
let server: Server | undefined;
let baseUrl: string;

const TOKEN = 'test-token';

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `fastcli-web-${randomUUID()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  process.env.FASTCLI_HOME = tmpDir;
  await fs.writeFile(
    path.join(tmpDir, 'config.json'),
    JSON.stringify(
      {
        version: '2',
        packageManager: 'volta',
        editor: '',
        confirmBeforeRun: false,
        firstRun: false,
        language: 'en',
      },
      null,
      2,
    ),
    'utf8',
  );
  await fs.writeFile(
    path.join(tmpDir, 'tools.json'),
    JSON.stringify(
      {
        version: '2',
        tools: [
          {
            id: 'aider',
            name: 'Aider',
            description: 'Aider CLI',
            commands: {
              deploy: ['echo {{name}}', 'echo {{version}}'],
            },
            source: 'user',
          },
        ],
      },
      null,
      2,
    ),
    'utf8',
  );

  const app = createWebApp({ token: TOKEN, staticDir: tmpDir });
  server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('failed to listen');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  delete process.env.FASTCLI_HOME;
  if (server !== undefined) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function request(pathname: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${baseUrl}${pathname}`, { ...init, headers });
}

describe('web API auth', () => {
  it('未携带 token 的 API 请求返回 401', async () => {
    const res = await request('/api/tools');
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: 'unauthorized' });
  });
});

describe('web API tools', () => {
  it('GET /api/tools 返回分组工具和 ETag', async () => {
    const res = await request(`/api/tools?token=${TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('ETag')).toBeTruthy();
    const body = await res.json() as { builtin: unknown[]; user: Array<{ id: string }> };
    expect(body.builtin.length).toBeGreaterThan(0);
    expect(body.user.map((tool) => tool.id)).toContain('aider');
  });

  it('拒绝删除 builtin 工具', async () => {
    const list = await request(`/api/tools?token=${TOKEN}`);
    const etag = list.headers.get('ETag')!;
    const res = await request('/api/tools/claude', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'If-Match': etag,
      },
    });
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      message: 'Builtin tools cannot be modified',
    });
  });

  it('PUT /api/tools/:id 使用 If-Match 发现写入冲突', async () => {
    const list = await request(`/api/tools?token=${TOKEN}`);
    const stale = list.headers.get('ETag')!;

    const raw = JSON.parse(await fs.readFile(path.join(tmpDir, 'tools.json'), 'utf8'));
    raw.tools.push({
      id: 'other',
      name: 'Other',
      commands: { install: ['echo other'] },
      source: 'user',
    });
    await fs.writeFile(path.join(tmpDir, 'tools.json'), JSON.stringify(raw, null, 2), 'utf8');

    const res = await request('/api/tools/aider', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'If-Match': stale,
      },
      body: JSON.stringify({
        id: 'aider',
        name: 'Aider',
        commands: { deploy: ['echo next'] },
      }),
    });
    expect(res.status).toBe(409);
    const body = await res.json() as { etag?: string; tools?: unknown };
    expect(body.etag).toBeTruthy();
    expect(body.tools).toBeTruthy();
  });

  it('POST /api/tools 省略 id 时根据 name 自动生成 id', async () => {
    const list = await request(`/api/tools?token=${TOKEN}`);
    const etag = list.headers.get('ETag')!;

    const res = await request(`/api/tools?token=${TOKEN}`, {
      method: 'POST',
      headers: {
        'If-Match': etag,
      },
      body: JSON.stringify({
        name: 'My Tool',
        commands: { install: ['echo ok'] },
      }),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      id: 'my-tool',
      name: 'My Tool',
      source: 'user',
    });
  });

  it('POST /api/tools 拒绝重复 name', async () => {
    const list = await request(`/api/tools?token=${TOKEN}`);
    const etag = list.headers.get('ETag')!;

    const res = await request(`/api/tools?token=${TOKEN}`, {
      method: 'POST',
      headers: {
        'If-Match': etag,
      },
      body: JSON.stringify({
        name: 'Claude Code',
        commands: { install: ['echo ok'] },
      }),
    });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      message: 'Tool name "Claude Code" already exists',
    });
  });

  it('PUT /api/tools/:id 拒绝改成重复 name', async () => {
    const list = await request(`/api/tools?token=${TOKEN}`);
    const etag = list.headers.get('ETag')!;

    const res = await request('/api/tools/aider', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'If-Match': etag,
      },
      body: JSON.stringify({
        id: 'aider',
        name: 'Claude Code',
        commands: { deploy: ['echo next'] },
      }),
    });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      message: 'Tool name "Claude Code" already exists',
    });
  });
});

describe('web API config language', () => {
  it('GET /api/config 返回 language', async () => {
    const res = await request(`/api/config?token=${TOKEN}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { config: { language?: string } };
    expect(body.config.language).toBe('en');
  });

  it('PUT /api/config 接受有效 language', async () => {
    const current = await request(`/api/config?token=${TOKEN}`);
    const etag = current.headers.get('ETag')!;

    const res = await request('/api/config', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'If-Match': etag,
      },
      body: JSON.stringify({ language: 'zh-CN' }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      config: { language: 'zh-CN' },
    });
  });

  it('PUT /api/config 拒绝无效 language', async () => {
    const current = await request(`/api/config?token=${TOKEN}`);
    const etag = current.headers.get('ETag')!;

    const res = await request('/api/config', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'If-Match': etag,
      },
      body: JSON.stringify({ language: 'fr' }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      message: 'language must be en or zh-CN',
    });
  });
});

describe('web API dry-run', () => {
  it('解析命令链变量但不执行命令', async () => {
    const res = await request('/api/tools/aider/dry-run', {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ op: 'deploy', version: '1.2.3' }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      commands: ['echo Aider', 'echo 1.2.3'],
    });
  });
});
