import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import type { NextFunction, Request, Response } from 'express';

import {
  getAppConfigPath,
  getConfigDir,
  getToolsPath,
} from '../config/paths.js';
import { loadAppConfig, loadToolsFile } from '../config/reader.js';
import {
  DEFAULT_APP_CONFIG,
  DEFAULT_TOOLS_FILE,
  type AppConfig,
  type ToolCommands,
  type ToolEntry,
  type ToolsFile,
} from '../config/schema.js';
import { saveAppConfig, saveToolsFile } from '../config/writer.js';
import { loadRegistry } from '../core/registry.js';
import { resolveCommand } from '../core/resolver.js';

const TOOL_ID_RE = /^[a-z0-9][a-z0-9-]*$/;

type ApiErrorCode =
  | 'bad_request'
  | 'conflict'
  | 'forbidden'
  | 'not_found'
  | 'precondition_required'
  | 'unauthorized'
  | 'internal_error';

interface WebServerOptions {
  token: string;
  staticDir?: string;
}

interface ValidatedToolInput {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  commands: ToolCommands;
}

let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(fn, fn);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function sendError(
  res: Response,
  status: number,
  error: ApiErrorCode,
  message: string,
  extra?: Record<string, unknown>,
): void {
  res.status(status).type('application/json').send({
    error,
    message,
    ...extra,
  });
}

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };
}

function isLocalRequest(req: Request): boolean {
  const remote = req.socket.remoteAddress;
  return remote === '127.0.0.1' || remote === '::ffff:127.0.0.1';
}

function tokenFromRequest(req: Request): string | undefined {
  const queryToken = req.query.token;
  if (typeof queryToken === 'string') return queryToken;
  const auth = req.header('authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length);
  }
  return undefined;
}

async function rawOrDefault(path: string, value: unknown): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch (err) {
    if (
      typeof err === 'object' &&
      err !== null &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return `${JSON.stringify(value, null, 2)}\n`;
    }
    throw err;
  }
}

function hashRaw(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

async function toolsEtag(): Promise<string> {
  return hashRaw(await rawOrDefault(getToolsPath(), DEFAULT_TOOLS_FILE));
}

async function configEtag(): Promise<string> {
  return hashRaw(await rawOrDefault(getAppConfigPath(), DEFAULT_APP_CONFIG));
}

async function toolsPayload(): Promise<{ builtin: ToolEntry[]; user: ToolEntry[] }> {
  const appConfig = await loadAppConfig();
  const toolsFile = await loadToolsFile();
  const registry = await loadRegistry({ appConfig, toolsFile });
  return {
    builtin: registry.list({ source: 'builtin' }),
    user: registry.list({ source: 'user' }),
  };
}

function validateCommands(value: unknown): ToolCommands | string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return 'commands 必须是对象';
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return 'commands 至少需要一个操作';
  }
  const commands: ToolCommands = {};
  for (const [op, chain] of entries) {
    if (op.trim().length === 0) {
      return 'commands 包含空操作名';
    }
    if (!Array.isArray(chain)) {
      return `commands.${op} 必须是字符串数组`;
    }
    if (chain.length < 1) {
      return `commands.${op} 至少需要一条命令`;
    }
    for (const item of chain) {
      if (typeof item !== 'string' || item.trim().length === 0) {
        return `commands.${op} 只能包含非空字符串`;
      }
    }
    commands[op] = chain.map((item) => item.trim());
  }
  return commands;
}

function validateToolInput(
  body: unknown,
  expectedId?: string,
): ValidatedToolInput | string {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return '请求体必须是对象';
  }
  const obj = body as Record<string, unknown>;
  if (typeof obj.id !== 'string' || !TOOL_ID_RE.test(obj.id)) {
    return 'id 必须匹配 ^[a-z0-9][a-z0-9-]*$';
  }
  if (expectedId !== undefined && obj.id !== expectedId) {
    return '请求体 id 必须与路径 id 一致';
  }
  if (typeof obj.name !== 'string' || obj.name.trim().length === 0) {
    return 'name 不能为空';
  }
  const commands = validateCommands(obj.commands);
  if (typeof commands === 'string') return commands;

  const tags = Array.isArray(obj.tags)
    ? obj.tags.filter((tag): tag is string => typeof tag === 'string')
    : undefined;

  return {
    id: obj.id,
    name: obj.name.trim(),
    description: typeof obj.description === 'string' && obj.description.trim().length > 0
      ? obj.description.trim()
      : undefined,
    tags,
    commands,
  };
}

function latestToolsConflictPayload(etag: string) {
  return toolsPayload().then((tools) => ({ etag, tools }));
}

function ensureIfMatch(req: Request, res: Response): string | undefined {
  const ifMatch = req.header('if-match');
  if (ifMatch === undefined || ifMatch.length === 0) {
    sendError(
      res,
      428,
      'precondition_required',
      '缺少 If-Match 头',
    );
    return undefined;
  }
  return ifMatch;
}

export function createWebApp(options: WebServerOptions): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', (req, res, next) => {
    if (!isLocalRequest(req)) {
      sendError(res, 403, 'forbidden', '仅允许 127.0.0.1 访问');
      return;
    }
    if (tokenFromRequest(req) !== options.token) {
      sendError(res, 401, 'unauthorized', 'Unauthorized');
      return;
    }
    next();
  });

  app.get('/api/tools', asyncRoute(async (_req, res) => {
    const etag = await toolsEtag();
    res.setHeader('ETag', etag);
    res.json(await toolsPayload());
  }));

  app.get('/api/tools/:id', asyncRoute(async (req, res) => {
    const registry = await loadRegistry();
    const tool = registry.findById(req.params.id);
    if (tool === undefined) {
      sendError(res, 404, 'not_found', `找不到工具 "${req.params.id}"`);
      return;
    }
    res.setHeader('ETag', await toolsEtag());
    res.json(tool);
  }));

  app.post('/api/tools', asyncRoute(async (req, res) => {
    const input = validateToolInput(req.body);
    if (typeof input === 'string') {
      sendError(res, 400, 'bad_request', input);
      return;
    }

    await enqueueWrite(async () => {
      const registry = await loadRegistry();
      const existing = registry.findById(input.id);
      if (existing?.source === 'builtin') {
        sendError(res, 409, 'conflict', '内置工具不可修改');
        return;
      }
      if (existing !== undefined) {
        sendError(res, 409, 'conflict', `工具 "${input.id}" 已存在`);
        return;
      }

      const toolsFile = await loadToolsFile();
      const entry: ToolEntry = { ...input, source: 'user' };
      await saveToolsFile({
        ...toolsFile,
        tools: [...toolsFile.tools, entry],
      });
      res.status(201).json(entry);
    });
  }));

  app.put('/api/tools/:id', asyncRoute(async (req, res) => {
    const ifMatch = ensureIfMatch(req, res);
    if (ifMatch === undefined) return;

    const input = validateToolInput(req.body, req.params.id);
    if (typeof input === 'string') {
      sendError(res, 400, 'bad_request', input);
      return;
    }

    await enqueueWrite(async () => {
      const latest = await toolsEtag();
      if (latest !== ifMatch) {
        sendError(
          res,
          409,
          'conflict',
          'tools.json 已被外部修改',
          await latestToolsConflictPayload(latest),
        );
        return;
      }

      const registry = await loadRegistry();
      const existing = registry.findById(req.params.id);
      if (existing?.source === 'builtin') {
        sendError(res, 409, 'conflict', '内置工具不可修改');
        return;
      }
      if (existing === undefined) {
        sendError(res, 404, 'not_found', `找不到工具 "${req.params.id}"`);
        return;
      }

      const toolsFile = await loadToolsFile();
      const entry: ToolEntry = { ...input, source: 'user' };
      await saveToolsFile({
        ...toolsFile,
        tools: toolsFile.tools.map((tool) =>
          tool.id === req.params.id ? entry : tool,
        ),
      });
      res.json(entry);
    });
  }));

  app.delete('/api/tools/:id', asyncRoute(async (req, res) => {
    const ifMatch = ensureIfMatch(req, res);
    if (ifMatch === undefined) return;

    await enqueueWrite(async () => {
      const latest = await toolsEtag();
      if (latest !== ifMatch) {
        sendError(
          res,
          409,
          'conflict',
          'tools.json 已被外部修改',
          await latestToolsConflictPayload(latest),
        );
        return;
      }

      const registry = await loadRegistry();
      const existing = registry.findById(req.params.id);
      if (existing?.source === 'builtin') {
        sendError(res, 409, 'conflict', '内置工具不可修改');
        return;
      }
      if (existing === undefined) {
        sendError(res, 404, 'not_found', `找不到工具 "${req.params.id}"`);
        return;
      }

      const toolsFile = await loadToolsFile();
      await saveToolsFile({
        ...toolsFile,
        tools: toolsFile.tools.filter((tool) => tool.id !== req.params.id),
      });
      res.json({ ok: true });
    });
  }));

  app.get('/api/config', asyncRoute(async (_req, res) => {
    res.setHeader('ETag', await configEtag());
    res.json({
      config: await loadAppConfig(),
      paths: {
        configDir: getConfigDir(),
        appConfigPath: getAppConfigPath(),
        toolsPath: getToolsPath(),
      },
    });
  }));

  app.put('/api/config', asyncRoute(async (req, res) => {
    const ifMatch = ensureIfMatch(req, res);
    if (ifMatch === undefined) return;

    await enqueueWrite(async () => {
      const latest = await configEtag();
      if (latest !== ifMatch) {
        sendError(res, 409, 'conflict', 'config.json 已被外部修改', {
          etag: latest,
          config: await loadAppConfig(),
        });
        return;
      }

      const current = await loadAppConfig();
      const body = typeof req.body === 'object' && req.body !== null
        ? req.body as Partial<AppConfig>
        : {};

      if (
        body.packageManager !== undefined &&
        body.packageManager !== 'volta' &&
        body.packageManager !== 'npm'
      ) {
        sendError(res, 400, 'bad_request', 'packageManager 必须为 volta 或 npm');
        return;
      }
      if (body.editor !== undefined && typeof body.editor !== 'string') {
        sendError(res, 400, 'bad_request', 'editor 必须是字符串');
        return;
      }
      if (
        body.confirmBeforeRun !== undefined &&
        typeof body.confirmBeforeRun !== 'boolean'
      ) {
        sendError(res, 400, 'bad_request', 'confirmBeforeRun 必须是布尔值');
        return;
      }

      const next: AppConfig = {
        ...current,
        packageManager: body.packageManager ?? current.packageManager,
        editor: body.editor ?? current.editor,
        confirmBeforeRun: body.confirmBeforeRun ?? current.confirmBeforeRun,
      };
      await saveAppConfig(next);
      res.json({ config: next });
    });
  }));

  app.post('/api/tools/:id/dry-run', asyncRoute(async (req, res) => {
    const body = typeof req.body === 'object' && req.body !== null
      ? req.body as { op?: unknown; version?: unknown }
      : {};
    if (typeof body.op !== 'string' || body.op.length === 0) {
      sendError(res, 400, 'bad_request', 'op 不能为空');
      return;
    }

    const registry = await loadRegistry();
    const tool = registry.findById(req.params.id);
    if (tool === undefined) {
      sendError(res, 404, 'not_found', `找不到工具 "${req.params.id}"`);
      return;
    }
    const resolved = resolveCommand(tool, body.op, {
      version: typeof body.version === 'string' ? body.version : undefined,
    });
    if (resolved.kind === 'unconfigured') {
      sendError(res, 404, 'not_found', `操作 "${body.op}" 未配置`);
      return;
    }
    res.json({ commands: resolved.commands });
  }));

  const staticDir = options.staticDir ?? defaultStaticDir();
  app.use(express.static(staticDir));
  app.use((_req, res) => {
    res.sendFile(join(staticDir, 'index.html'));
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : '内部错误';
    sendError(res, 500, 'internal_error', message);
  });

  return app;
}

function defaultStaticDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, 'web');
}

function listenOnce(
  app: express.Express,
  host: string,
  port: number,
): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve(server);
    });
  });
}

export async function listenOnAvailablePort(
  app: express.Express,
  startPort: number,
  endPort = 3100,
  host = '127.0.0.1',
): Promise<{ server: Server; port: number }> {
  if (host !== '127.0.0.1') {
    throw new Error('Web 编辑器只允许绑定 127.0.0.1');
  }

  for (let port = startPort; port <= endPort; port += 1) {
    try {
      return { server: await listenOnce(app, host, port), port };
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        (err as NodeJS.ErrnoException).code === 'EADDRINUSE'
      ) {
        continue;
      }
      throw err;
    }
  }

  throw new Error(
    `端口 ${startPort}-3100 均被占用，请通过 --port=<N> 指定其它端口`,
  );
}
