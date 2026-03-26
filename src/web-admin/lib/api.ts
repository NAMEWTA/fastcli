import type { Config } from '../../types/index.js';

interface ApiErrorBody {
  ok?: boolean;
  error?: string;
  message?: string;
}

interface ApiConfigBody extends ApiErrorBody {
  config?: Config;
}

interface ApiValidationBody extends ApiErrorBody {
  valid?: boolean;
  errors?: string[];
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

export async function validateWorkingCopy(
  config: Config,
): Promise<{ valid: boolean; errors: string[] }> {
  const response = await fetch('/api/import', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ config }),
  });
  const body = await readJsonBody<ApiValidationBody>(response);

  if (!response.ok || body.ok === false) {
    throw new Error(body.error ?? '配置校验失败');
  }

  return {
    valid: body.valid ?? false,
    errors: body.errors ?? [],
  };
}

export async function saveWorkingCopy(config: Config): Promise<void> {
  const validation = await validateWorkingCopy(config);
  if (!validation.valid) {
    throw new Error('校验失败：请先修复全部错误后再保存');
  }

  const response = await fetch('/api/save', {
    method: 'POST',
  });
  const body = await readJsonBody<ApiErrorBody>(response);

  if (!response.ok || body.ok === false) {
    throw new Error(body.error ?? '保存失败');
  }
}

export function downloadConfigJson(
  rawJson: string,
  filename: string = 'fastcli.config.json',
): void {
  const blob = new Blob([rawJson], {
    type: 'application/json; charset=utf-8',
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
