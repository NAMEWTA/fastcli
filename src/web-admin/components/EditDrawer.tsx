import { useEffect, useState } from 'react';
import type { AdminValidationState, ModuleKey, ModuleValue } from '../lib/state.js';

export interface EditDrawerProps {
  module: ModuleKey | null;
  entryKey: string | null;
  value: ModuleValue | null;
  validation: AdminValidationState;
  onClose(): void;
  onUpdate(nextValue: ModuleValue): void;
  onValidateJson(raw: string): Promise<void> | void;
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringifyField(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function parseFieldValue(raw: string, previousValue: unknown): unknown {
  if (
    typeof previousValue === 'string' ||
    typeof previousValue === 'number' ||
    previousValue === undefined
  ) {
    return raw;
  }

  if (typeof previousValue === 'boolean') {
    return raw === 'true';
  }

  return JSON.parse(raw);
}

function getDrawerTitle(module: ModuleKey | null): string {
  switch (module) {
    case 'aliases':
      return 'Alias 编辑';
    case 'providers':
      return 'Provider 编辑';
    case 'credentials':
      return 'Credential 编辑';
    case 'workflows':
      return 'Workflow 编辑';
    default:
      return '编辑抽屉';
  }
}

export function EditDrawer({
  module,
  entryKey,
  value,
  validation,
  onClose,
  onUpdate,
  onValidateJson,
}: EditDrawerProps) {
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [jsonDraft, setJsonDraft] = useState('');
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!value) {
      setJsonDraft('');
      setFieldDrafts({});
      setFieldErrors({});
      return;
    }

    const nextFieldDrafts = Object.fromEntries(
      Object.entries(value).map(([key, fieldValue]) => [key, stringifyField(fieldValue)]),
    );

    setJsonDraft(JSON.stringify(value, null, 2));
    setFieldDrafts(nextFieldDrafts);
    setFieldErrors({});
    setMode('form');
  }, [value, entryKey]);

  if (!module || !entryKey || !value || !isPlainRecord(value)) {
    return (
      <aside className="drawer drawer--empty">
        <p className="eyebrow">编辑抽屉</p>
        <h2>选择一个条目开始编辑</h2>
        <p>左侧点击任意已有配置项后，这里会展示表单模式和 JSON 模式的编辑入口。</p>
      </aside>
    );
  }

  function handleFieldChange(fieldKey: string, rawValue: string) {
    const previousValue = value[fieldKey];
    setFieldDrafts((current) => ({
      ...current,
      [fieldKey]: rawValue,
    }));

    try {
      const nextValue = cloneValue(value);
      nextValue[fieldKey] = parseFieldValue(rawValue, previousValue);
      setFieldErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[fieldKey];
        return nextErrors;
      });
      onUpdate(nextValue as ModuleValue);
    } catch (error) {
      setFieldErrors((current) => ({
        ...current,
        [fieldKey]:
          error instanceof Error ? `字段 JSON 格式错误: ${error.message}` : '字段 JSON 格式错误',
      }));
    }
  }

  async function handleValidateJson() {
    setValidating(true);
    try {
      await onValidateJson(jsonDraft);
    } finally {
      setValidating(false);
    }
  }

  return (
    <aside className="drawer">
      <div className="drawer__header">
        <div>
          <p className="eyebrow">{getDrawerTitle(module)}</p>
          <h2>{entryKey}</h2>
        </div>
        <button className="ghost-button" onClick={onClose} type="button">
          关闭
        </button>
      </div>

      <div className="drawer__modes">
        <button
          className={mode === 'form' ? 'drawer-mode drawer-mode--active' : 'drawer-mode'}
          onClick={() => setMode('form')}
          type="button"
        >
          表单模式
        </button>
        <button
          className={mode === 'json' ? 'drawer-mode drawer-mode--active' : 'drawer-mode'}
          onClick={() => setMode('json')}
          type="button"
        >
          JSON 模式
        </button>
      </div>

      {mode === 'form' ? (
        <div className="drawer__body">
          {Object.entries(value).map(([fieldKey, fieldValue]) => (
            <label className="drawer-field" key={fieldKey}>
              <span>{fieldKey}</span>
              {typeof fieldValue === 'boolean' ? (
                <select
                  className="field__input"
                  onChange={(event) => handleFieldChange(fieldKey, event.target.value)}
                  value={fieldDrafts[fieldKey] ?? String(fieldValue)}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <textarea
                  className="drawer-textarea"
                  onChange={(event) => handleFieldChange(fieldKey, event.target.value)}
                  rows={typeof fieldValue === 'string' ? 3 : 8}
                  value={fieldDrafts[fieldKey] ?? stringifyField(fieldValue)}
                />
              )}
              {fieldErrors[fieldKey] ? (
                <small className="form-error">{fieldErrors[fieldKey]}</small>
              ) : null}
            </label>
          ))}
        </div>
      ) : (
        <div className="drawer__body">
          <label className="drawer-field">
            <span>完整 JSON</span>
            <textarea
              className="drawer-textarea drawer-textarea--json"
              onChange={(event) => setJsonDraft(event.target.value)}
              rows={18}
              value={jsonDraft}
            />
          </label>
          <button
            className="primary-button"
            disabled={validating}
            onClick={() => void handleValidateJson()}
            type="button"
          >
            {validating ? '校验中...' : '校验'}
          </button>
          <div className="validation-panel">
            <p className="validation-panel__title">
              {validation.valid ? '当前无校验错误' : `发现 ${validation.errors.length} 个问题`}
            </p>
            {validation.errors.length > 0 ? (
              <ul className="validation-list">
                {validation.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      )}
    </aside>
  );
}
