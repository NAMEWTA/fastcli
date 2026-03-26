import { useRef, useState, type ChangeEvent } from 'react';
import type { AdminState, ModuleKey, ModuleValue } from '../lib/state.js';
import { EditDrawer } from './EditDrawer.js';
import { ModuleList } from './ModuleList.js';
import { OverviewCards } from './OverviewCards.js';

const TASK_NAV_ITEMS = ['配置总览', '配置校验', '导入配置', '导出配置'];
const TYPE_NAV_ITEMS = ['Aliases', 'Providers', 'Credentials', 'Workflows'];

export interface AdminShellProps {
  state: AdminState;
  dirty: boolean;
  selectedModule: ModuleKey | null;
  selectedEntryKey: string | null;
  onSelect(module: ModuleKey, entryKey: string): void;
  onCloseEditor(): void;
  onUpdateEntry(nextValue: ModuleValue): void;
  onValidateJson(raw: string): Promise<void> | void;
  onSaveAll(): Promise<void>;
  onImport(raw: string): Promise<void>;
  onExport(): void;
}

interface ConfirmImportOptions {
  confirmReplace(): boolean | Promise<boolean>;
  importAll(raw: string): Promise<void>;
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

export async function confirmImportBeforeApply(
  raw: string,
  options: ConfirmImportOptions,
): Promise<boolean> {
  const confirmed = await options.confirmReplace();
  if (!confirmed) {
    return false;
  }

  await options.importAll(raw);
  return true;
}

export function AdminShell({
  state,
  dirty,
  selectedModule,
  selectedEntryKey,
  onSelect,
  onCloseEditor,
  onUpdateEntry,
  onValidateJson,
  onSaveAll,
  onImport,
  onExport,
}: AdminShellProps) {
  const selectedValue = getSelectedValue(state, selectedModule, selectedEntryKey);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'save' | 'import' | null>(null);

  async function handleSaveClick() {
    setBusyAction('save');
    try {
      await onSaveAll();
      setActionError(null);
      setActionMessage('保存成功，当前工作态已落盘。');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '保存失败');
      setActionMessage(null);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setBusyAction('import');
    try {
      const raw = await file.text();
      const imported = await confirmImportBeforeApply(raw, {
        confirmReplace: () =>
          window.confirm('导入会全量覆盖当前工作态，是否继续？'),
        importAll: onImport,
      });

      if (imported) {
        setActionError(null);
        setActionMessage('导入完成，当前工作态已被新配置覆盖。');
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '导入失败');
      setActionMessage(null);
    } finally {
      setBusyAction(null);
    }
  }

  function handleExportClick() {
    onExport();
    setActionError(null);
    setActionMessage('已开始导出当前工作态 JSON。');
  }

  return (
    <div className="admin-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">fastcli web admin</p>
          <h1>本地配置管理后台</h1>
          <p className="topbar__meta">
            {dirty ? '存在未保存修改' : '当前工作态已同步'}
            {state.validation.valid ? ' · 校验通过' : ` · ${state.validation.errors.length} 个错误待修复`}
          </p>
        </div>
        <div className="topbar__actions">
          <button
            className="ghost-button"
            disabled={busyAction === 'save'}
            onClick={() => void handleSaveClick()}
            type="button"
          >
            {busyAction === 'save' ? '保存中...' : '保存全部'}
          </button>
          <button
            className="ghost-button"
            disabled={busyAction === 'import'}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            导入
          </button>
          <button className="ghost-button" onClick={handleExportClick} type="button">
            导出
          </button>
        </div>
      </header>

      <input
        accept=".json,application/json"
        hidden
        onChange={(event) => void handleImportChange(event)}
        ref={fileInputRef}
        type="file"
      />

      {actionError ? <div className="feedback feedback--error">{actionError}</div> : null}
      {!actionError && actionMessage ? (
        <div className="feedback feedback--success">{actionMessage}</div>
      ) : null}

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
