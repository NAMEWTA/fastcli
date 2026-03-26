import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createConfigWorkingCopyStore, type ConfigWorkingCopyStoreWithDirty } from './config-working-copy.js';
import { createWebSessionManager } from './token-session.js';

export interface StartWebServerResult {
  url: string;
  token: string;
  close: () => Promise<void>;
}

interface ErrorWithHint {
  error: string;
  hint: string;
}

function writeJson(
  res: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>,
): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function parseCookie(headerValue: string | undefined, name: string): string | undefined {
  if (!headerValue) {
    return undefined;
  }

  for (const part of headerValue.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key === name) {
      return valueParts.join('=') || undefined;
    }
  }

  return undefined;
}

function splitErrorWithHint(error: unknown): ErrorWithHint {
  const message = error instanceof Error ? error.message : String(error);
  const lines = message.split('\n').map((line) => line.trim()).filter(Boolean);

  return {
    error: lines[0] ?? '配置读取失败',
    hint: lines.slice(1).join(' ') || '请检查配置文件后重试',
  };
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf-8').trim();
  if (raw === '') {
    return {};
  }

  return JSON.parse(raw) as unknown;
}

export async function startWebAdminServer(
  options: { host?: string; port?: number } = {},
): Promise<StartWebServerResult> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 0;

  let store: ConfigWorkingCopyStoreWithDirty | undefined;
  let storeError: ErrorWithHint | undefined;
  try {
    store = createConfigWorkingCopyStore();
  } catch (error) {
    storeError = splitErrorWithHint(error);
  }

  const sessionManager = createWebSessionManager();
  const token = sessionManager.issueOneTimeToken();

  const server = createServer((req, res) => {
    void (async () => {
      const method = req.method ?? 'GET';
      const requestUrl = new URL(req.url ?? '/', `http://${host}`);
      const path = requestUrl.pathname;

      if (method === 'GET' && path === '/api/config') {
        if (!store) {
          writeJson(res, 500, {
            ok: false,
            error: storeError?.error ?? '配置读取失败',
            hint: storeError?.hint ?? '请检查配置文件后重试',
          });
          return;
        }

        writeJson(res, 200, {
          ok: true,
          config: store.getConfig(),
          dirty: store.isDirty(),
        });
        return;
      }

      if (method === 'POST' && path === '/api/auth/verify') {
        let body: unknown;
        try {
          body = await readJsonBody(req);
        } catch {
          writeJson(res, 400, {
            ok: false,
            error: '请求体 JSON 格式错误',
          });
          return;
        }

        const tokenFromBody =
          body && typeof body === 'object' && 'token' in body
            ? (body as { token?: unknown }).token
            : undefined;

        if (typeof tokenFromBody !== 'string' || tokenFromBody.trim() === '') {
          writeJson(res, 400, {
            ok: false,
            error: '认证失败：缺少 token',
          });
          return;
        }

        const result = sessionManager.verifyOneTimeToken(tokenFromBody);
        if (!result.ok) {
          writeJson(res, 401, {
            ok: false,
            error: '认证失败：口令无效或已过期',
          });
          return;
        }

        res.setHeader(
          'Set-Cookie',
          `fastcli_session=${result.sessionId}; HttpOnly; Path=/; SameSite=Strict`,
        );
        writeJson(res, 200, { ok: true });
        return;
      }

      if (method === 'POST' && path === '/api/validate') {
        if (!store) {
          writeJson(res, 500, {
            ok: false,
            error: storeError?.error ?? '配置读取失败',
            hint: storeError?.hint ?? '请检查配置文件后重试',
          });
          return;
        }

        const result = store.validate();
        writeJson(res, 200, {
          ok: true,
          valid: result.valid,
          errors: result.errors,
        });
        return;
      }

      if (method === 'POST' && (path === '/api/save' || path === '/api/import')) {
        const sessionId = parseCookie(req.headers.cookie, 'fastcli_session');
        if (!sessionManager.isSessionValid(sessionId)) {
          writeJson(res, 401, {
            ok: false,
            error: '未认证：请先完成口令验证',
          });
          return;
        }

        if (!store) {
          writeJson(res, 500, {
            ok: false,
            error: storeError?.error ?? '配置读取失败',
            hint: storeError?.hint ?? '请检查配置文件后重试',
          });
          return;
        }

        if (path === '/api/save') {
          try {
            store.save();
            writeJson(res, 200, { ok: true });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            writeJson(res, 500, {
              ok: false,
              error: message,
              hint: '请检查文件权限或路径后重试',
            });
          }
          return;
        }

        let body: unknown;
        try {
          body = await readJsonBody(req);
        } catch {
          writeJson(res, 400, {
            ok: false,
            error: '请求体 JSON 格式错误',
          });
          return;
        }

        const payload =
          body && typeof body === 'object' && 'config' in body
            ? (body as { config?: unknown }).config
            : body;

        if (payload === undefined) {
          writeJson(res, 400, {
            ok: false,
            error: '导入失败：缺少 config 数据',
          });
          return;
        }

        const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const result = store.importFromJson(raw);

        writeJson(res, 200, {
          ok: true,
          valid: result.valid,
          errors: result.errors,
        });
        return;
      }

      if (method === 'GET' && path === '/api/export') {
        if (!store) {
          writeJson(res, 500, {
            ok: false,
            error: storeError?.error ?? '配置读取失败',
            hint: storeError?.hint ?? '请检查配置文件后重试',
          });
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="fastcli.config.json"');
        res.end(store.exportToJson());
        return;
      }

      writeJson(res, 404, {
        ok: false,
        error: `路由不存在: ${method} ${path}`,
      });
    })().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      writeJson(res, 500, {
        ok: false,
        error: `服务内部错误: ${message}`,
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('启动失败：无法获取监听端口');
  }

  const url = `http://${host}:${address.port}`;

  return {
    url,
    token,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
