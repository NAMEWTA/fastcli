import type {
  Alias,
  Config,
  CredentialConfig,
  ProviderConfig,
  Workflow,
} from '../../types/index.js';

export type ModuleKey = 'aliases' | 'providers' | 'credentials' | 'workflows';

export type ModuleValue =
  | Alias
  | ProviderConfig
  | CredentialConfig
  | Workflow;

export interface AdminValidationState {
  valid: boolean;
  errors: string[];
}

export interface AdminState {
  workingCopy: Config;
  dirty: boolean;
  validation: AdminValidationState;
  lastUpdated: Record<ModuleKey, string | null>;
}

export interface AdminStateDeps {
  now?: () => string;
  validateConfig?: (config: Config) => Promise<AdminValidationState>;
  saveConfig?: (config: Config) => Promise<void>;
}

export interface AdminStateStore {
  getState(): AdminState;
  updateField(module: ModuleKey, key: string, nextValue: ModuleValue): void;
  updateJsonEntry(
    module: ModuleKey,
    key: string,
    raw: string,
  ): Promise<AdminValidationState>;
  runValidation(): Promise<AdminValidationState>;
  saveAll(): Promise<void>;
  importAll(raw: string): Promise<AdminValidationState>;
  exportAll(): string;
}

const EMPTY_VALIDATION: AdminValidationState = {
  valid: true,
  errors: [],
};

function cloneConfig(config: Config): Config {
  return JSON.parse(JSON.stringify(config)) as Config;
}

function createLastUpdatedState(): Record<ModuleKey, string | null> {
  return {
    aliases: null,
    providers: null,
    credentials: null,
    workflows: null,
  };
}

function normalizeConfig(config: Config): Config {
  return {
    aliases: config.aliases ?? {},
    workflows: config.workflows ?? {},
    providers: config.providers ?? {},
    credentials: config.credentials ?? {},
  };
}

function createDefaultValidation(): Promise<AdminValidationState> {
  return Promise.resolve(EMPTY_VALIDATION);
}

function setModuleEntry(
  config: Config,
  module: ModuleKey,
  key: string,
  nextValue: ModuleValue,
): void {
  switch (module) {
    case 'aliases':
      config.aliases[key] = nextValue as Alias;
      break;
    case 'providers':
      config.providers = {
        ...(config.providers ?? {}),
        [key]: nextValue as ProviderConfig,
      };
      break;
    case 'credentials':
      config.credentials = {
        ...(config.credentials ?? {}),
        [key]: nextValue as CredentialConfig,
      };
      break;
    case 'workflows':
      config.workflows[key] = nextValue as Workflow;
      break;
  }
}

export function createAdminStateStore(
  initialConfig: Config,
  deps: AdminStateDeps = {},
): AdminStateStore {
  const now = deps.now ?? (() => new Date().toISOString());
  const validateConfig = deps.validateConfig ?? createDefaultValidation;
  const saveConfig = deps.saveConfig ?? (async () => {});

  let state: AdminState = {
    workingCopy: normalizeConfig(cloneConfig(initialConfig)),
    dirty: false,
    validation: EMPTY_VALIDATION,
    lastUpdated: createLastUpdatedState(),
  };

  function markModuleUpdated(module: ModuleKey): void {
    state = {
      ...state,
      dirty: true,
      lastUpdated: {
        ...state.lastUpdated,
        [module]: now(),
      },
    };
  }

  return {
    getState() {
      return state;
    },

    updateField(module, key, nextValue) {
      const nextConfig = normalizeConfig(cloneConfig(state.workingCopy));
      setModuleEntry(nextConfig, module, key, nextValue);

      state = {
        ...state,
        workingCopy: nextConfig,
      };
      markModuleUpdated(module);
    },

    async updateJsonEntry(module, key, raw) {
      let parsed: ModuleValue;
      try {
        parsed = JSON.parse(raw) as ModuleValue;
      } catch (error) {
        const result = {
          valid: false,
          errors: [
            error instanceof Error
              ? `JSON 格式错误: ${error.message}`
              : 'JSON 格式错误',
          ],
        };
        state = {
          ...state,
          validation: result,
        };
        return result;
      }

      this.updateField(module, key, parsed);
      return this.runValidation();
    },

    async runValidation() {
      const result = await validateConfig(cloneConfig(state.workingCopy));
      state = {
        ...state,
        validation: {
          valid: result.valid,
          errors: [...result.errors],
        },
      };
      return state.validation;
    },

    async saveAll() {
      const result = await this.runValidation();
      if (!result.valid) {
        throw new Error('校验失败：请先修复全部错误后再保存');
      }

      await saveConfig(cloneConfig(state.workingCopy));
      state = {
        ...state,
        dirty: false,
      };
    },

    async importAll(raw) {
      let parsed: Config;
      try {
        parsed = JSON.parse(raw) as Config;
      } catch (error) {
        const result = {
          valid: false,
          errors: [
            error instanceof Error
              ? `JSON 格式错误: ${error.message}`
              : 'JSON 格式错误',
          ],
        };
        state = {
          ...state,
          validation: result,
        };
        return result;
      }

      const timestamp = now();
      state = {
        ...state,
        workingCopy: normalizeConfig(cloneConfig(parsed)),
        dirty: true,
        lastUpdated: {
          aliases: timestamp,
          providers: timestamp,
          credentials: timestamp,
          workflows: timestamp,
        },
      };

      return this.runValidation();
    },

    exportAll() {
      return JSON.stringify(state.workingCopy, null, 2);
    },
  };
}
