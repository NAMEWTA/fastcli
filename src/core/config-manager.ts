import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getConfigPath } from '../utils/path.js';
import { DEFAULT_CONFIG, type Config, type ValidationResult } from '../types/index.js';

/**
 * 加载配置文件
 * @param configPath - 配置文件路径（默认使用标准路径）
 */
export function loadConfig(configPath: string = getConfigPath()): Config {
  if (!existsSync(configPath)) {
    throw new Error(`配置文件不存在: ${configPath}\n请运行 fastcli config init 初始化`);
  }

  const content = readFileSync(configPath, 'utf-8');
  try {
    return JSON.parse(content) as Config;
  } catch {
    throw new Error(`配置文件格式错误: ${configPath}`);
  }
}

/**
 * 保存配置文件
 * @param config - 配置对象
 * @param configPath - 配置文件路径（默认使用标准路径）
 */
export function saveConfig(
  config: Config,
  configPath: string = getConfigPath()
): void {
  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 确保配置文件存在，不存在则创建默认配置
 * @param configPath - 配置文件路径（默认使用标准路径）
 */
export function ensureConfigExists(configPath: string = getConfigPath()): void {
  if (!existsSync(configPath)) {
    saveConfig(DEFAULT_CONFIG, configPath);
  }
}

/**
 * 校验配置文件
 * @param config - 配置对象
 */
export function validateConfig(config: Config): ValidationResult {
  const errors: string[] = [];
  const providers = config.providers ?? {};
  const providerIds = new Set(Object.keys(providers));

  for (const [providerId, provider] of Object.entries(providers)) {
    if (provider.envMapping) {
      for (const [envKey, valueKey] of Object.entries(provider.envMapping)) {
        if (envKey.trim() === '' || valueKey.trim() === '') {
          const envKeyLabel = envKey.trim() === '' ? '<empty-env-key>' : envKey;
          const valueKeyLabel = valueKey.trim() === '' ? '<empty-value-key>' : valueKey;
          errors.push(
            `providers.${providerId}.envMapping.${envKeyLabel}: 映射值不能为空（当前值: ${valueKeyLabel}）`,
          );
        }
      }
    }
  }

  // 检查 aliases 和 workflows 名称冲突
  const aliasNames = Object.keys(config.aliases);
  const workflowNames = Object.keys(config.workflows);
  const conflicts = aliasNames.filter((name) => workflowNames.includes(name));

  if (conflicts.length > 0) {
    for (const name of conflicts) {
      errors.push(`名称冲突: aliases.${name} 与 workflows.${name} 不能同名`);
    }
  }

  // 检查工作流步骤引用是否有效
  for (const [name, workflow] of Object.entries(config.workflows)) {
    const stepIds = new Set(workflow.steps.map((s) => s.id));

    if (workflow.provider && !providerIds.has(workflow.provider)) {
      errors.push(
        `workflows.${name}.provider: 引用了不存在的 provider "${workflow.provider}"`,
      );
    }

    for (const step of workflow.steps) {
      for (const option of step.options) {
        if (option.provider && !providerIds.has(option.provider)) {
          errors.push(
            `workflows.${name}.steps.${step.id}.options.${option.name}.provider: 引用了不存在的 provider "${option.provider}"`,
          );
        }

        if (option.next && !stepIds.has(option.next)) {
          errors.push(
            `workflows.${name}.steps.${step.id}.options.${option.name}.next: 引用了不存在的步骤 "${option.next}"`,
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
