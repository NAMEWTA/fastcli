import type { Config, ProviderConfig } from '../types/index.js';

export function resolveProviderId(
  optionProvider?: string,
  workflowProvider?: string
): string | undefined {
  return optionProvider ?? workflowProvider;
}

export function getProvider(config: Config, providerId: string): ProviderConfig {
  const provider = config.providers?.[providerId];
  if (!provider) {
    throw new Error(`provider 不存在: ${providerId}`);
  }
  return provider;
}

export function getCredentialValues(
  config: Config,
  credentialId: string
): Record<string, string> {
  const values = config.credentials?.[credentialId]?.values;
  if (!values) {
    throw new Error(`credentialId 不存在: ${credentialId}`);
  }
  return values;
}

export function resolveModeArgs(provider: ProviderConfig, mode?: string): string[] {
  if (!mode) {
    return [];
  }

  const args = provider.modeArgs?.[mode];
  return args ? [...args] : [];
}

export function buildProviderCommand(command: string, modeArgs: string[]): string {
  const args = modeArgs.join(' ').trim();
  return args.length > 0 ? `${command} ${args}` : command;
}

export function buildInjectedEnv(
  baseEnv: NodeJS.ProcessEnv,
  mapping: Record<string, string> | undefined,
  values: Record<string, string>
): NodeJS.ProcessEnv {
  if (!mapping) {
    return { ...baseEnv };
  }

  const env: NodeJS.ProcessEnv = { ...baseEnv };
  for (const [envKey, valueKey] of Object.entries(mapping)) {
    const value = values[valueKey];
    if (value === undefined) {
      throw new Error(`凭据字段缺失: ${valueKey}`);
    }
    env[envKey] = value;
  }

  return env;
}
