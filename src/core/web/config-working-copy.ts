import {
  loadConfig,
  saveConfig,
  validateConfig,
} from '../config-manager.js';
import type { Config, ValidationResult } from '../../types/index.js';

type LoadConfigFn = (configPath?: string) => Config;
type SaveConfigFn = (config: Config, configPath?: string) => void;
type ValidateConfigFn = (config: Config) => ValidationResult;

export interface ConfigWorkingCopyStore {
  getConfig(): Config;
  patchConfig(next: Config): void;
  validate(): ValidationResult;
  save(): void;
  importFromJson(raw: string): ValidationResult;
  exportToJson(): string;
}

export interface CreateConfigWorkingCopyStoreOptions {
  configPath?: string;
  loadConfigFn?: LoadConfigFn;
  saveConfigFn?: SaveConfigFn;
  validateConfigFn?: ValidateConfigFn;
}

export type ConfigWorkingCopyStoreWithDirty = ConfigWorkingCopyStore & {
  isDirty(): boolean;
};

function cloneConfig(config: Config): Config {
  return JSON.parse(JSON.stringify(config)) as Config;
}

class DefaultConfigWorkingCopyStore implements ConfigWorkingCopyStoreWithDirty {
  private workingCopy: Config;
  private dirty = false;

  constructor(
    private readonly configPath: string | undefined,
    private readonly saveConfigFn: SaveConfigFn,
    private readonly validateConfigFn: ValidateConfigFn,
    loadConfigFn: LoadConfigFn,
  ) {
    try {
      this.workingCopy = cloneConfig(loadConfigFn(this.configPath));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('配置文件不存在')) {
        throw new Error(`${message}\n请先运行 fastcli config init`);
      }

      if (message.includes('配置文件格式错误')) {
        throw new Error(
          `${message}\n配置文件格式错误，请检查 JSON 结构并修复后重试。`,
        );
      }

      throw error;
    }
  }

  getConfig(): Config {
    return cloneConfig(this.workingCopy);
  }

  patchConfig(next: Config): void {
    this.workingCopy = cloneConfig(next);
    this.dirty = true;
  }

  validate(): ValidationResult {
    return this.validateConfigFn(cloneConfig(this.workingCopy));
  }

  save(): void {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`保存已阻断：配置校验未通过\n${validation.errors.join('\n')}`);
    }

    try {
      this.saveConfigFn(cloneConfig(this.workingCopy), this.configPath);
      this.dirty = false;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`保存失败：可能是 IO/权限错误，请检查后重试。${message}`);
    }
  }

  importFromJson(raw: string): ValidationResult {
    let parsed: Config;
    try {
      parsed = JSON.parse(raw) as Config;
    } catch {
      return {
        valid: false,
        errors: ['导入失败：JSON 解析错误，请修复格式后重试'],
      };
    }

    this.workingCopy = cloneConfig(parsed);
    this.dirty = true;
    return this.validate();
  }

  exportToJson(): string {
    return JSON.stringify(this.workingCopy, null, 2);
  }

  isDirty(): boolean {
    return this.dirty;
  }
}

export function createConfigWorkingCopyStore(
  options: CreateConfigWorkingCopyStoreOptions = {},
): ConfigWorkingCopyStoreWithDirty {
  return new DefaultConfigWorkingCopyStore(
    options.configPath,
    options.saveConfigFn ?? saveConfig,
    options.validateConfigFn ?? validateConfig,
    options.loadConfigFn ?? loadConfig,
  );
}