import type { AdminState, ModuleKey, ModuleValue } from '../lib/state.js';
import { EditDrawer } from './EditDrawer.js';
import { ModuleList } from './ModuleList.js';
import { OverviewCards } from './OverviewCards.js';

const TASK_NAV_ITEMS = ['配置总览', '配置校验', '导入配置', '导出配置'];
const TYPE_NAV_ITEMS = ['Aliases', 'Providers', 'Credentials', 'Workflows'];

export interface AdminShellProps {
  state: AdminState;
  selectedModule: ModuleKey | null;
  selectedEntryKey: string | null;
  onSelect(module: ModuleKey, entryKey: string): void;
  onCloseEditor(): void;
  onUpdateEntry(nextValue: ModuleValue): void;
  onValidateJson(raw: string): Promise<void> | void;
}

function getSelectedValue(
  state: AdminState,
  module: ModuleKey | null,
  entryKey: string | null,
): ModuleValue | null {
  if (!module || !entryKey) {
    return null;
  }

  switch (module) {
    case 'aliases':
      return state.workingCopy.aliases[entryKey] ?? null;
    case 'providers':
      return state.workingCopy.providers?.[entryKey] ?? null;
    case 'credentials':
      return state.workingCopy.credentials?.[entryKey] ?? null;
    case 'workflows':
      return state.workingCopy.workflows[entryKey] ?? null;
  }
}

export function AdminShell({
  state,
  selectedModule,
  selectedEntryKey,
  onSelect,
  onCloseEditor,
  onUpdateEntry,
  onValidateJson,
}: AdminShellProps) {
  const selectedValue = getSelectedValue(state, selectedModule, selectedEntryKey);

  return (
    <div className="admin-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">fastcli web admin</p>
          <h1>本地配置管理后台</h1>
        </div>
        <div className="topbar__actions">
          <button className="ghost-button" disabled type="button">
            保存全部
          </button>
          <button className="ghost-button" disabled type="button">
            导入
          </button>
          <button className="ghost-button" disabled type="button">
            导出
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <section className="nav-group">
            <p className="nav-group__title">按任务</p>
            <nav>
              {TASK_NAV_ITEMS.map((item) => (
                <button className="nav-item" key={item} type="button">
                  {item}
                </button>
              ))}
            </nav>
          </section>

          <section className="nav-group">
            <p className="nav-group__title">按类型</p>
            <nav>
              {TYPE_NAV_ITEMS.map((item) => (
                <button className="nav-item" key={item} type="button">
                  {item}
                </button>
              ))}
            </nav>
          </section>
        </aside>

        <main className="content-panel">
          <section className="content-card">
            <p className="eyebrow">当前工作态</p>
            <h2>欢迎进入后台骨架</h2>
            <p>
              工作态变更只保留在前端内存里，保存前会走统一校验。右侧抽屉支持表单和 JSON 双模式编辑。
            </p>
          </section>

          <OverviewCards
            config={state.workingCopy}
            lastUpdated={state.lastUpdated}
          />
          <ModuleList
            config={state.workingCopy}
            onSelect={onSelect}
            selectedEntryKey={selectedEntryKey}
            selectedModule={selectedModule}
          />
        </main>

        <EditDrawer
          entryKey={selectedEntryKey}
          module={selectedModule}
          onClose={onCloseEditor}
          onUpdate={onUpdateEntry}
          onValidateJson={onValidateJson}
          validation={state.validation}
          value={selectedValue}
        />
      </div>
    </div>
  );
}
