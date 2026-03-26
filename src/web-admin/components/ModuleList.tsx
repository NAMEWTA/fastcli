import type {
  Alias,
  Config,
  CredentialConfig,
  ProviderConfig,
  Workflow,
} from '../../types/index.js';
import type { ModuleKey } from '../lib/state.js';

interface ModuleListProps {
  config: Config;
  selectedModule: ModuleKey | null;
  selectedEntryKey: string | null;
  onSelect(module: ModuleKey, entryKey: string): void;
}

interface ModuleGroupItem {
  key: string;
  description: string;
}

interface ModuleGroup {
  key: ModuleKey;
  label: string;
  items: ModuleGroupItem[];
}

function describeAlias(alias: Alias): string {
  return alias.description ?? alias.command;
}

function describeProvider(provider: ProviderConfig): string {
  return provider.command;
}

function describeCredential(credential: CredentialConfig): string {
  return credential.label ?? Object.keys(credential.values).join(', ');
}

function describeWorkflow(workflow: Workflow): string {
  return workflow.description ?? `${workflow.steps.length} 个步骤`;
}

function buildGroups(config: Config): ModuleGroup[] {
  return [
    {
      key: 'aliases',
      label: 'Aliases',
      items: Object.entries(config.aliases).map(([key, value]) => ({
        key,
        description: describeAlias(value),
      })),
    },
    {
      key: 'providers',
      label: 'Providers',
      items: Object.entries(config.providers ?? {}).map(([key, value]) => ({
        key,
        description: describeProvider(value),
      })),
    },
    {
      key: 'credentials',
      label: 'Credentials',
      items: Object.entries(config.credentials ?? {}).map(([key, value]) => ({
        key,
        description: describeCredential(value),
      })),
    },
    {
      key: 'workflows',
      label: 'Workflows',
      items: Object.entries(config.workflows).map(([key, value]) => ({
        key,
        description: describeWorkflow(value),
      })),
    },
  ];
}

export function ModuleList({
  config,
  selectedModule,
  selectedEntryKey,
  onSelect,
}: ModuleListProps) {
  const groups = buildGroups(config);

  return (
    <section className="module-list-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">已有配置</p>
          <h2>按模块浏览</h2>
        </div>
        <p>v1 仅支持编辑已有条目，不支持新增或删除。</p>
      </div>

      <div className="module-groups">
        {groups.map((group) => (
          <section className="module-group" key={group.key}>
            <header className="module-group__header">
              <h3>{group.label}</h3>
              <span>{group.items.length} 项</span>
            </header>
            <div className="module-group__items">
              {group.items.map((item) => {
                const selected =
                  selectedModule === group.key && selectedEntryKey === item.key;

                return (
                  <button
                    className={selected ? 'module-item module-item--active' : 'module-item'}
                    key={item.key}
                    onClick={() => onSelect(group.key, item.key)}
                    type="button"
                  >
                    <strong>{item.key}</strong>
                    <span>{item.description}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
