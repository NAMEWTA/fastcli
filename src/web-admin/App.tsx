import { useState } from 'react';
import type { Config } from '../types/index.js';
import { AdminShell } from './components/AdminShell.js';
import { LoginPage } from './components/LoginPage.js';
import {
  downloadConfigJson,
  fetchConfig as fetchConfigFromApi,
  saveWorkingCopy,
  validateWorkingCopy,
  verifyToken as verifyTokenFromApi,
  type VerifyTokenResult,
} from './lib/api.js';
import {
  createAdminStateStore,
  type AdminState,
  type AdminStateStore,
  type ModuleKey,
  type ModuleValue,
} from './lib/state.js';

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

interface EntrySelection {
  module: ModuleKey;
  entryKey: string;
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

function findFirstEntry(config: Config): EntrySelection | null {
  const modules: Array<[ModuleKey, Record<string, unknown> | undefined]> = [
    ['aliases', config.aliases],
    ['providers', config.providers],
    ['credentials', config.credentials],
    ['workflows', config.workflows],
  ];

  for (const [module, record] of modules) {
    const entryKey = record ? Object.keys(record)[0] : undefined;
    if (entryKey) {
      return { module, entryKey };
    }
  }

  return null;
}

export function App({ api = defaultApi }: { api?: AppApi }) {
  const [state, setState] = useState<AppState>(() => createInitialAppState());
  const [adminStore, setAdminStore] = useState<AdminStateStore | null>(null);
  const [adminState, setAdminState] = useState<AdminState | null>(null);
  const [selection, setSelection] = useState<EntrySelection | null>(null);

  async function handleLogin(token: string): Promise<void> {
    setState((current) => ({
      ...current,
      submitting: true,
      authError: null,
    }));

    const nextState = await resolveLoginState(api, token);
    if (nextState.mode === 'admin' && nextState.config) {
      const nextStore = createAdminStateStore(nextState.config, {
        saveConfig: saveWorkingCopy,
        validateConfig: validateWorkingCopy,
      });
      const nextAdminState = nextStore.getState();
      const firstEntry = findFirstEntry(nextAdminState.workingCopy);

      setAdminStore(nextStore);
      setAdminState(nextAdminState);
      setSelection(firstEntry);
    } else {
      setAdminStore(null);
      setAdminState(null);
      setSelection(null);
    }

    setState(nextState);
  }

  function syncAdminState(store: AdminStateStore) {
    const nextAdminState = store.getState();
    setAdminState(nextAdminState);

    if (!selection) {
      setSelection(findFirstEntry(nextAdminState.workingCopy));
      return;
    }

    const currentModuleEntries =
      selection.module === 'aliases'
        ? nextAdminState.workingCopy.aliases
        : selection.module === 'providers'
          ? nextAdminState.workingCopy.providers
          : selection.module === 'credentials'
            ? nextAdminState.workingCopy.credentials
            : nextAdminState.workingCopy.workflows;

    if (!currentModuleEntries || !(selection.entryKey in currentModuleEntries)) {
      setSelection(findFirstEntry(nextAdminState.workingCopy));
    }
  }

  function handleSelect(module: ModuleKey, entryKey: string) {
    setSelection({ module, entryKey });
  }

  function handleCloseEditor() {
    setSelection(null);
  }

  function handleUpdateEntry(nextValue: ModuleValue) {
    if (!adminStore || !selection) {
      return;
    }

    adminStore.updateField(selection.module, selection.entryKey, nextValue);
    syncAdminState(adminStore);
  }

  async function handleValidateJson(raw: string): Promise<void> {
    if (!adminStore || !selection) {
      return;
    }

    await adminStore.updateJsonEntry(selection.module, selection.entryKey, raw);
    syncAdminState(adminStore);
  }

  async function handleSaveAll(): Promise<void> {
    if (!adminStore) {
      return;
    }

    await adminStore.saveAll();
    syncAdminState(adminStore);
  }

  async function handleImport(raw: string): Promise<void> {
    if (!adminStore) {
      return;
    }

    await adminStore.importAll(raw);
    syncAdminState(adminStore);
  }

  function handleExport() {
    if (!adminStore) {
      return;
    }

    downloadConfigJson(adminStore.exportAll());
  }

  if (state.mode === 'admin' && adminState) {
    return (
      <AdminShell
        dirty={adminState.dirty}
        onCloseEditor={handleCloseEditor}
        onExport={handleExport}
        onImport={handleImport}
        onSaveAll={handleSaveAll}
        onSelect={handleSelect}
        onUpdateEntry={handleUpdateEntry}
        onValidateJson={handleValidateJson}
        selectedEntryKey={selection?.entryKey ?? null}
        selectedModule={selection?.module ?? null}
        state={adminState}
      />
    );
  }

  return (
    <LoginPage
      error={state.authError}
      submitting={state.submitting}
      onSubmit={handleLogin}
    />
  );
}
