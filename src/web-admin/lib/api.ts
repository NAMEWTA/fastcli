import type { Config } from '../../types/index.js';

interface ApiErrorBody {
  ok?: boolean;
  error?: string;
  message?: string;
}

interface ApiConfigBody extends ApiErrorBody {
  config?: Config;
}

export interface VerifyTokenResult {
  ok: boolean;
  message?: string;
}

async function readJsonBody<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function verifyToken(token: string): Promise<VerifyTokenResult> {
  const response = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  const body = await readJsonBody<ApiErrorBody>(response);
  if (!response.ok || body.ok === false) {
    return {
      ok: false,
      message: body.error ?? body.message ?? '认证失败：请检查一次性口令后重试',
    };
  }

  return { ok: true };
}

export async function fetchConfig(): Promise<Config> {
  const response = await fetch('/api/config');
  const body = await readJsonBody<ApiConfigBody>(response);

  if (!response.ok || body.ok === false || !body.config) {
    throw new Error(body.error ?? '配置加载失败');
  }

  return body.config;
}
