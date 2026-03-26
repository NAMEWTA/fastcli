import { useState } from 'react';
import type { Config } from '../types/index.js';
import { AdminShell } from './components/AdminShell.js';
import { LoginPage } from './components/LoginPage.js';
import {
  fetchConfig as fetchConfigFromApi,
  verifyToken as verifyTokenFromApi,
  type VerifyTokenResult,
} from './lib/api.js';

export interface AppState {
  mode: 'login' | 'admin';
  authError: string | null;
  config: Config | null;
  submitting: boolean;
}

export interface AppApi {
  verifyToken(token: string): Promise<VerifyTokenResult>;
  fetchConfig(): Promise<Config>;
}

const DEFAULT_AUTH_ERROR = '认证失败：请检查一次性口令后重试';

export function createInitialAppState(): AppState {
  return {
    mode: 'login',
    authError: null,
    config: null,
    submitting: false,
  };
}

export async function resolveLoginState(
  api: AppApi,
  token: string,
): Promise<AppState> {
  const auth = await api.verifyToken(token.trim());
  if (!auth.ok) {
    return {
      ...createInitialAppState(),
      authError: auth.message ?? DEFAULT_AUTH_ERROR,
    };
  }

  try {
    const config = await api.fetchConfig();
    return {
      mode: 'admin',
      authError: null,
      config,
      submitting: false,
    };
  } catch (error) {
    return {
      ...createInitialAppState(),
      authError: error instanceof Error ? error.message : '登录成功，但配置加载失败',
    };
  }
}

const defaultApi: AppApi = {
  verifyToken: verifyTokenFromApi,
  fetchConfig: fetchConfigFromApi,
};

export function App({ api = defaultApi }: { api?: AppApi }) {
  const [state, setState] = useState<AppState>(() => createInitialAppState());

  async function handleLogin(token: string): Promise<void> {
    setState((current) => ({
      ...current,
      submitting: true,
      authError: null,
    }));

    const nextState = await resolveLoginState(api, token);
    setState(nextState);
  }

  if (state.mode === 'admin' && state.config) {
    return <AdminShell config={state.config} />;
  }

  return (
    <LoginPage
      error={state.authError}
      submitting={state.submitting}
      onSubmit={handleLogin}
    />
  );
}
