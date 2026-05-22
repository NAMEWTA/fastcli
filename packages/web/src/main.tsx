import {
  ArrowDown,
  ArrowUp,
  Eye,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  X,
  Pencil,
} from 'lucide-react';
import { StrictMode, useEffect, useMemo, useState } from 'react';
import type * as React from 'react';
import { createRoot } from 'react-dom/client';

import './styles.css';
import { normalizeLanguage, wt, type Language } from './i18n';

type Source = 'builtin' | 'user';

interface ToolEntry {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  commands: Record<string, string[]>;
  source: Source;
}

interface ToolsPayload {
  builtin: ToolEntry[];
  user: ToolEntry[];
}

interface AppConfig {
  version: '2';
  packageManager: 'volta' | 'npm';
  editor: string;
  confirmBeforeRun: boolean;
  firstRun: boolean;
  language: Language;
}

interface ConfigPayload {
  config: AppConfig;
  paths: {
    configDir: string;
    appConfigPath: string;
    toolsPath: string;
  };
}

interface ApiResult<T> {
  data: T;
  etag: string;
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: Record<string, unknown>,
    public readonly etag: string,
  ) {
    super(String(data.message ?? 'Request failed'));
  }
}

interface OperationDraft {
  name: string;
  commands: string[];
}

interface ToolDraft {
  id: string;
  name: string;
  description: string;
  tags: string;
  operations: OperationDraft[];
}

interface ToolFormState {
  mode: 'create' | 'edit';
  draft: ToolDraft;
  etag?: string;
  error?: string;
}

interface ConflictState {
  message: string;
  abandon: () => Promise<void>;
  overwrite: () => Promise<void>;
}

const token = new URLSearchParams(window.location.search).get('token') ?? '';

function toolToDraft(tool?: ToolEntry): ToolDraft {
  if (tool === undefined) {
    return {
      id: '',
      name: '',
      description: '',
      tags: '',
      operations: [],
    };
  }
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description ?? '',
    tags: tool.tags?.join(', ') ?? '',
    operations: Object.entries(tool.commands).map(([name, commands]) => ({
      name,
      commands: [...commands],
    })),
  };
}

type ToolPayload = Omit<ToolEntry, 'source' | 'id'> & { id?: string };

function draftToTool(draft: ToolDraft): ToolPayload {
  const commands: Record<string, string[]> = {};
  for (const op of draft.operations) {
    const name = op.name.trim();
    if (name.length === 0) continue;
    commands[name] = op.commands.map((command) => command.trim());
  }
  const tool = {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    tags: draft.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    commands,
  };
  return draft.id.trim().length > 0
    ? { ...tool, id: draft.id.trim() }
    : tool;
}

async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, { ...init, headers });
  const etag = response.headers.get('ETag') ?? '';
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, data, etag);
  }
  return { data: data as T, etag };
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    />
  );
}

function IconButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex size-8 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    />
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
    />
  );
}

function App() {
  const [tools, setTools] = useState<ToolsPayload>({ builtin: [], user: [] });
  const [toolsEtag, setToolsEtag] = useState('');
  const [configPayload, setConfigPayload] = useState<ConfigPayload | null>(null);
  const [configEtag, setConfigEtag] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<ToolEntry | null>(null);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const t = (key: string, params: Record<string, string | number | boolean | undefined> = {}) =>
    wt(key, params, language);
  const [lastSaved, setLastSaved] = useState('');
  const [form, setForm] = useState<ToolFormState | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [configDraft, setConfigDraft] = useState<AppConfig | null>(null);
  const [configError, setConfigError] = useState('');
  const [preview, setPreview] = useState<{ title: string; commands: string[] } | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [globalError, setGlobalError] = useState('');

  async function loadTools(nextSelected = selectedId) {
    const result = await api<ToolsPayload>('/api/tools');
    setTools(result.data);
    setToolsEtag(result.etag);
    const all = [...result.data.builtin, ...result.data.user];
    const id = nextSelected && all.some((tool) => tool.id === nextSelected)
      ? nextSelected
      : all[0]?.id ?? null;
    setSelectedId(id);
    if (id !== null) await loadTool(id);
  }

  async function loadTool(id: string): Promise<ApiResult<ToolEntry>> {
    const result = await api<ToolEntry>(`/api/tools/${id}`);
    setSelectedTool(result.data);
    setSelectedId(id);
    setToolsEtag(result.etag);
    return result;
  }

  async function loadConfig() {
    const result = await api<ConfigPayload>('/api/config');
    const nextLanguage = normalizeLanguage(result.data.config.language);
    setLanguage(nextLanguage);
    setConfigPayload(result.data);
    setConfigEtag(result.etag);
    setConfigDraft({ ...result.data.config, language: nextLanguage });
  }

  useEffect(() => {
    Promise.all([loadTools(null), loadConfig()]).catch((err) => {
      setGlobalError(err instanceof Error ? err.message : t('loadFailed'));
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (tool: ToolEntry): boolean => {
      if (q.length === 0) return true;
      return [
        tool.id,
        tool.name,
        tool.description ?? '',
        ...(tool.tags ?? []),
      ].some((item) => item.toLowerCase().includes(q));
    };
    return {
      builtin: tools.builtin.filter(match),
      user: tools.user.filter(match),
    };
  }, [search, tools]);

  async function openCreateForm() {
    setForm({ mode: 'create', draft: toolToDraft(), error: undefined });
  }

  async function openEditForm(tool: ToolEntry) {
    const fresh = await loadTool(tool.id);
    setForm({
      mode: 'edit',
      draft: toolToDraft(fresh.data),
      etag: fresh.etag,
      error: undefined,
    });
  }

  function validateDraft(state: ToolFormState): string | undefined {
    const { draft } = state;
    if (state.mode === 'edit' && !/^[a-z0-9][a-z0-9-]*$/.test(draft.id.trim())) {
      return t('idInvalid');
    }
    if (draft.name.trim().length === 0) return t('nameRequired');
    if (draft.operations.length === 0) return t('operationRequired');
    const names = new Set<string>();
    for (const op of draft.operations) {
      const name = op.name.trim();
      if (name.length === 0) return t('operationNameRequired');
      if (names.has(name)) return t('operationDuplicate', { name });
      names.add(name);
      if (op.commands.length === 0) return t('commandRequired', { name });
      if (op.commands.some((command) => command.trim().length === 0)) {
        return t('commandEmpty', { name });
      }
    }
    return undefined;
  }

  async function submitToolForm(overrideEtag?: string) {
    if (form === null) return;
    const validation = validateDraft(form);
    if (validation !== undefined) {
      setForm({ ...form, error: validation });
      return;
    }

    const payload = draftToTool(form.draft);
    try {
      let savedId = form.draft.id;
      if (form.mode === 'create') {
        const result = await api<ToolEntry>('/api/tools', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        savedId = result.data.id;
      } else {
        await api<ToolEntry>(`/api/tools/${form.draft.id}`, {
          method: 'PUT',
          headers: { 'If-Match': overrideEtag ?? form.etag ?? toolsEtag },
          body: JSON.stringify(payload),
        });
      }
      setForm(null);
      setLastSaved(new Date().toLocaleString());
      await loadTools(savedId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && form.mode === 'edit') {
        setConflict({
          message: t('toolsModified'),
          abandon: async () => {
            setConflict(null);
            setForm(null);
            await loadTools(selectedId);
          },
          overwrite: async () => {
            const yes = window.confirm(t('overwriteTools'));
            if (!yes) return;
            const fresh = await api<ToolEntry>(`/api/tools/${form.draft.id}`);
            setConflict(null);
            await submitToolForm(fresh.etag);
          },
        });
        return;
      }
      setForm({
        ...form,
        error: err instanceof Error ? err.message : t('saveFailed'),
      });
    }
  }

  async function deleteTool(tool: ToolEntry, overrideEtag?: string) {
    const yes = overrideEtag !== undefined || window.confirm(t('deleteConfirm', { id: tool.id }));
    if (!yes) return;
    try {
      const fresh = overrideEtag === undefined ? await loadTool(tool.id) : null;
      await api<{ ok: true }>(`/api/tools/${tool.id}`, {
        method: 'DELETE',
        headers: { 'If-Match': overrideEtag ?? fresh?.etag ?? toolsEtag },
      });
      setLastSaved(new Date().toLocaleString());
      await loadTools(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflict({
          message: t('toolsModified'),
          abandon: async () => {
            setConflict(null);
            await loadTools(null);
          },
          overwrite: async () => {
            const yesOverwrite = window.confirm(t('continueDelete'));
            if (!yesOverwrite) return;
            const fresh = await api<ToolEntry>(`/api/tools/${tool.id}`);
            setConflict(null);
            await deleteTool(tool, fresh.etag);
          },
        });
        return;
      }
      setGlobalError(err instanceof Error ? err.message : t('deleteFailed'));
    }
  }

  async function submitConfig() {
    if (configDraft === null) return;
    setConfigError('');
    try {
      const result = await api<{ config: AppConfig }>('/api/config', {
        method: 'PUT',
        headers: { 'If-Match': configEtag },
        body: JSON.stringify({
          packageManager: configDraft.packageManager,
          editor: configDraft.editor,
          confirmBeforeRun: configDraft.confirmBeforeRun,
          language: configDraft.language,
        }),
      });
      setConfigOpen(false);
      setLanguage(normalizeLanguage(result.data.config.language));
      setConfigPayload((current) =>
        current === null ? current : { ...current, config: result.data.config },
      );
      setLastSaved(new Date().toLocaleString());
      await loadConfig();
      await loadTools(selectedId);
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : t('saveFailed'));
    }
  }

  async function previewOperation(tool: ToolEntry, op: string) {
    const version = window.prompt(t('versionPrompt')) ?? undefined;
    const body: { op: string; version?: string } = { op };
    if (version !== undefined && version.length > 0) body.version = version;
    const result = await api<{ commands: string[] }>(`/api/tools/${tool.id}/dry-run`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setPreview({ title: `${tool.id}.${op}`, commands: result.data.commands });
  }

  return (
    <div className="min-h-screen bg-[#f6f7f4] text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-5 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">fastcli</div>
            <div className="truncate text-xs text-zinc-600">
              {configPayload?.paths.toolsPath ?? 'tools.json'}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span>{t('lastSaved')}{lastSaved || t('unsaved')}</span>
            <Button onClick={() => setConfigOpen(true)} title={t('config')}>
              <Settings size={16} /> {t('config')}
            </Button>
          </div>
        </div>
      </header>

      {globalError && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-2 text-sm text-red-700">
          {globalError}
        </div>
      )}

      <main className="grid min-h-[calc(100vh-61px)] grid-cols-1 lg:grid-cols-[360px_1fr]">
        <aside className="border-r border-zinc-200 bg-white px-4 py-4">
          <div className="mb-3 flex gap-2">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-zinc-400" size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-600"
                placeholder={t('searchTools')}
              />
            </label>
            <IconButton onClick={openCreateForm} title={t('addTool')}>
              <Plus size={16} />
            </IconButton>
          </div>
          <ToolGroup
            title={t('builtinTools')}
            tools={filtered.builtin}
            selectedId={selectedId}
            onSelect={(id) => loadTool(id).catch(console.error)}
            language={language}
          />
          <ToolGroup
            title={t('customTools')}
            tools={filtered.user}
            selectedId={selectedId}
            onSelect={(id) => loadTool(id).catch(console.error)}
            language={language}
          />
        </aside>

        <section className="px-6 py-5">
          {selectedTool === null ? (
            <div className="text-sm text-zinc-500">{t('noTools')}</div>
          ) : (
            <ToolDetail
              tool={selectedTool}
              onEdit={() => openEditForm(selectedTool).catch(console.error)}
              onDelete={() => deleteTool(selectedTool).catch(console.error)}
              onPreview={(op) => previewOperation(selectedTool, op).catch(console.error)}
              language={language}
            />
          )}
        </section>
      </main>

      {form !== null && (
        <ToolForm
          form={form}
          setForm={setForm}
          onSubmit={() => submitToolForm().catch(console.error)}
          language={language}
        />
      )}

      {configOpen && configDraft !== null && configPayload !== null && (
        <ConfigDialog
          draft={configDraft}
          setDraft={setConfigDraft}
          paths={configPayload.paths}
          error={configError}
          onClose={() => setConfigOpen(false)}
          onSubmit={() => submitConfig().catch(console.error)}
          language={language}
        />
      )}

      {preview !== null && (
        <Modal title={preview.title} onClose={() => setPreview(null)} language={language}>
          <pre className="max-h-[55vh] overflow-auto rounded-md bg-zinc-950 p-3 text-sm text-zinc-50">
            {preview.commands.map((command, index) =>
              `[${index + 1}/${preview.commands.length}] $ ${command}`,
            ).join('\n')}
          </pre>
        </Modal>
      )}

      {conflict !== null && (
        <Modal title={t('conflictTitle')} onClose={() => setConflict(null)} language={language}>
          <p className="mb-4 text-sm text-zinc-700">{conflict.message}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => conflict.abandon().catch(console.error)}>
              {t('discardRefresh')}
            </Button>
            <Button onClick={() => conflict.overwrite().catch(console.error)}>
              {t('overwrite')}
            </Button>
            <Button onClick={() => setConflict(null)}>{t('closeDialog')}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ToolGroup(props: {
  title: string;
  tools: ToolEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  language: Language;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-xs font-semibold uppercase text-zinc-500">
        {props.title}
      </div>
      <div className="space-y-1">
        {props.tools.length === 0 ? (
          <div className="rounded-md px-2 py-2 text-sm text-zinc-400">
            {wt('empty', {}, props.language)}
          </div>
        ) : (
          props.tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => props.onSelect(tool.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                props.selectedId === tool.id
                  ? 'bg-emerald-700 text-white'
                  : 'hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{tool.name}</span>
                <span className="text-xs opacity-75">{Object.keys(tool.commands).length}</span>
              </div>
              <div className="truncate text-xs opacity-75">{tool.id}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function ToolDetail(props: {
  tool: ToolEntry;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: (op: string) => void;
  language: Language;
}) {
  const disabled = props.tool.source === 'builtin';
  const t = (key: string, params: Record<string, string | number | boolean | undefined> = {}) =>
    wt(key, params, props.language);
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase text-zinc-500">
            {props.tool.source === 'builtin' ? t('builtinTools') : t('customTools')}
          </div>
          <h1 className="mt-1 text-2xl font-semibold">{props.tool.name}</h1>
          <div className="mt-1 text-sm text-zinc-600">{props.tool.id}</div>
        </div>
        <div className="flex gap-2">
          <Button disabled={disabled} onClick={props.onEdit} title={disabled ? t('builtinReadonly') : t('edit')}>
            <Pencil size={16} /> {t('edit')}
          </Button>
          <Button disabled={disabled} onClick={props.onDelete} title={disabled ? t('builtinReadonly') : t('delete')}>
            <Trash2 size={16} /> {t('delete')}
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 text-sm md:grid-cols-2">
        <InfoRow label="description" value={props.tool.description ?? t('empty')} />
        <InfoRow label="tags" value={props.tool.tags?.join(', ') || t('empty')} />
        <InfoRow label="source" value={props.tool.source} />
      </div>

      <div className="space-y-4">
        {Object.entries(props.tool.commands).map(([op, commands]) => (
          <div key={op} className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{op}</h2>
              <Button onClick={() => props.onPreview(op)}>
                <Eye size={16} /> {t('previewCommand')}
              </Button>
            </div>
            <div className="space-y-2">
              {commands.map((command, index) => (
                <pre key={`${op}-${index}`} className="overflow-auto rounded-md bg-zinc-950 p-3 text-sm text-zinc-50">
                  [{index + 1}/{commands.length}] {command}
                </pre>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow(props: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-zinc-500">
        {props.label}
      </div>
      <div className="mt-1 break-words text-zinc-800">{props.value}</div>
    </div>
  );
}

function ToolForm(props: {
  form: ToolFormState;
  setForm: (form: ToolFormState | null) => void;
  onSubmit: () => void;
  language: Language;
}) {
  const { form, setForm } = props;
  const t = (key: string, params: Record<string, string | number | boolean | undefined> = {}) =>
    wt(key, params, props.language);
  const updateDraft = (draft: ToolDraft) => setForm({ ...form, draft, error: undefined });
  const draft = form.draft;

  function updateOperation(index: number, next: OperationDraft) {
    const operations = [...draft.operations];
    operations[index] = next;
    updateDraft({ ...draft, operations });
  }

  return (
    <Modal
      title={form.mode === 'create' ? t('createTool') : t('editTool')}
      onClose={() => setForm(null)}
      language={props.language}
    >
      <div className="grid max-h-[72vh] gap-4 overflow-auto pr-1">
        {form.error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {form.error}
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {form.mode === 'edit' && (
            <label className="text-sm">
              <span className="mb-1 block text-zinc-600">id</span>
              <Field value={draft.id} disabled />
            </label>
          )}
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600">name</span>
            <Field
              value={draft.name}
              onChange={(event) => updateDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-zinc-600">description</span>
            <Field
              value={draft.description}
              onChange={(event) => updateDraft({ ...draft, description: event.target.value })}
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-zinc-600">tags</span>
            <Field
              value={draft.tags}
              onChange={(event) => updateDraft({ ...draft, tags: event.target.value })}
              placeholder="coding, openai"
            />
          </label>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{t('operation')}</h3>
          <Button
            onClick={() =>
              updateDraft({
                ...draft,
                operations: [...draft.operations, { name: '', commands: [''] }],
              })
            }
          >
            <Plus size={16} /> {t('addOperation')}
          </Button>
        </div>

        <div className="space-y-3">
          {draft.operations.map((op, opIndex) => (
            <div key={opIndex} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <div className="mb-3 flex gap-2">
                <Field
                  value={op.name}
                  onChange={(event) =>
                    updateOperation(opIndex, { ...op, name: event.target.value })
                  }
                  placeholder={t('operationName')}
                />
                <IconButton
                  title={t('deleteOperation')}
                  onClick={() =>
                    updateDraft({
                      ...draft,
                      operations: draft.operations.filter((_, index) => index !== opIndex),
                    })
                  }
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
              <div className="space-y-2">
                {op.commands.map((command, commandIndex) => (
                  <div key={commandIndex} className="flex gap-2">
                    <Field
                      value={command}
                      onChange={(event) => {
                        const commands = [...op.commands];
                        commands[commandIndex] = event.target.value;
                        updateOperation(opIndex, { ...op, commands });
                      }}
                      placeholder={t('command')}
                    />
                    <IconButton
                      title={t('moveUp')}
                      disabled={commandIndex === 0}
                      onClick={() => {
                        const commands = [...op.commands];
                        [commands[commandIndex - 1], commands[commandIndex]] = [
                          commands[commandIndex]!,
                          commands[commandIndex - 1]!,
                        ];
                        updateOperation(opIndex, { ...op, commands });
                      }}
                    >
                      <ArrowUp size={16} />
                    </IconButton>
                    <IconButton
                      title={t('moveDown')}
                      disabled={commandIndex === op.commands.length - 1}
                      onClick={() => {
                        const commands = [...op.commands];
                        [commands[commandIndex + 1], commands[commandIndex]] = [
                          commands[commandIndex]!,
                          commands[commandIndex + 1]!,
                        ];
                        updateOperation(opIndex, { ...op, commands });
                      }}
                    >
                      <ArrowDown size={16} />
                    </IconButton>
                    <IconButton
                      title={t('deleteCommand')}
                      onClick={() =>
                        updateOperation(opIndex, {
                          ...op,
                          commands: op.commands.filter((_, index) => index !== commandIndex),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                ))}
              </div>
              <Button
                className="mt-3"
                onClick={() =>
                  updateOperation(opIndex, { ...op, commands: [...op.commands, ''] })
                }
              >
                <Plus size={16} /> {t('addCommand')}
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={() => setForm(null)}>
          <X size={16} /> {t('cancel')}
        </Button>
        <Button onClick={props.onSubmit}>
          <Save size={16} /> {t('save')}
        </Button>
      </div>
    </Modal>
  );
}

function ConfigDialog(props: {
  draft: AppConfig;
  setDraft: (draft: AppConfig) => void;
  paths: ConfigPayload['paths'];
  error: string;
  onClose: () => void;
  onSubmit: () => void;
  language: Language;
}) {
  const t = (key: string, params: Record<string, string | number | boolean | undefined> = {}) =>
    wt(key, params, props.language);
  return (
    <Modal title={t('config')} onClose={props.onClose} language={props.language}>
      <div className="grid gap-4">
        {props.error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {props.error}
          </div>
        )}
        <InfoRow label="configDir" value={props.paths.configDir} />
        <InfoRow label="config.json" value={props.paths.appConfigPath} />
        <InfoRow label="tools.json" value={props.paths.toolsPath} />
        <label className="text-sm">
          <span className="mb-1 block text-zinc-600">packageManager</span>
          <select
            value={props.draft.packageManager}
            onChange={(event) =>
              props.setDraft({
                ...props.draft,
                packageManager: event.target.value as AppConfig['packageManager'],
              })
            }
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 outline-none focus:border-emerald-600"
          >
            <option value="volta">volta</option>
            <option value="npm">npm</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-600">editor</span>
          <Field
            value={props.draft.editor}
            onChange={(event) =>
              props.setDraft({ ...props.draft, editor: event.target.value })
            }
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-600">{t('language')}</span>
          <select
            value={props.draft.language}
            onChange={(event) =>
              props.setDraft({
                ...props.draft,
                language: normalizeLanguage(event.target.value),
              })
            }
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 outline-none focus:border-emerald-600"
          >
            <option value="en">English</option>
            <option value="zh-CN">中文</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={props.draft.confirmBeforeRun}
            onChange={(event) =>
              props.setDraft({
                ...props.draft,
                confirmBeforeRun: event.target.checked,
              })
            }
          />
          confirmBeforeRun
        </label>
        <InfoRow label="version" value={props.draft.version} />
        <InfoRow label="firstRun" value={String(props.draft.firstRun)} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={props.onClose}>
          <X size={16} /> {t('cancel')}
        </Button>
        <Button onClick={props.onSubmit}>
          <Save size={16} /> {t('save')}
        </Button>
      </div>
    </Modal>
  );
}

function Modal(props: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  language?: Language;
}) {
  const language = props.language ?? 'en';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 p-4">
      <div className="w-full max-w-3xl rounded-md bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{props.title}</h2>
          <IconButton onClick={props.onClose} title={wt('close', {}, language)}>
            <X size={16} />
          </IconButton>
        </div>
        {props.children}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
