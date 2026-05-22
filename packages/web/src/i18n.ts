export type Language = 'en' | 'zh-CN';

type Params = Record<string, string | number | boolean | undefined>;
type Messages = Record<string, string>;

const en: Messages = {
  requestFailed: 'Request failed',
  loadFailed: 'Failed to load',
  unsaved: 'Not saved yet',
  saveFailed: 'Failed to save',
  deleteFailed: 'Failed to delete',
  lastSaved: 'Last saved:',
  config: 'Config',
  searchTools: 'Search tools',
  addTool: 'Add tool',
  builtinTools: 'Builtin tools',
  customTools: 'Custom tools',
  noTools: 'No tools',
  empty: '(none)',
  builtinReadonly: 'Builtin tools cannot be modified',
  edit: 'Edit',
  delete: 'Delete',
  previewCommand: 'Preview commands',
  conflictTitle: 'Write conflict',
  toolsModified: 'tools.json was modified externally. Overwrite, discard this change, or redo from the latest version?',
  overwriteTools: 'Overwrite latest tools.json with this change?',
  deleteConfirm: 'Delete tool "{id}"?',
  continueDelete: 'Continue deleting based on the latest version?',
  discardRefresh: 'Discard changes and refresh',
  overwrite: 'Overwrite with this change',
  closeDialog: 'Close dialog',
  versionPrompt: 'Version (leave empty if unused)',
  addOperation: 'Add operation',
  operation: 'Operations',
  operationName: 'Operation name',
  command: 'Command',
  deleteOperation: 'Delete operation',
  moveUp: 'Move up',
  moveDown: 'Move down',
  deleteCommand: 'Delete command',
  addCommand: 'Add command',
  cancel: 'Cancel',
  save: 'Save',
  close: 'Close',
  createTool: 'Add tool',
  editTool: 'Edit tool',
  idInvalid: 'id must match ^[a-z0-9][a-z0-9-]*$',
  nameRequired: 'name cannot be empty',
  operationRequired: 'At least one operation is required',
  operationNameRequired: 'Operation name cannot be empty',
  operationDuplicate: 'Operation "{name}" is duplicated',
  commandRequired: 'Operation "{name}" requires at least one command',
  commandEmpty: 'Operation "{name}" contains an empty command',
  language: 'Language',
};

const zhCN: Messages = {
  requestFailed: '请求失败',
  loadFailed: '加载失败',
  unsaved: '尚未保存',
  saveFailed: '保存失败',
  deleteFailed: '删除失败',
  lastSaved: '最后保存时间：',
  config: '配置',
  searchTools: '搜索工具',
  addTool: '新增工具',
  builtinTools: '内置工具',
  customTools: '自定义工具',
  noTools: '暂无工具',
  empty: '（无）',
  builtinReadonly: '内置工具不可修改',
  edit: '编辑',
  delete: '删除',
  previewCommand: '预览命令',
  conflictTitle: '写入冲突',
  toolsModified: 'tools.json 已被外部修改，是否覆盖、放弃本次修改、还是基于最新内容重做？',
  overwriteTools: '确认用本次修改覆盖最新 tools.json？',
  deleteConfirm: '确认删除工具 "{id}"？',
  continueDelete: '确认基于最新版本继续删除？',
  discardRefresh: '放弃本次修改并刷新',
  overwrite: '用本次修改覆盖',
  closeDialog: '关闭对话框',
  versionPrompt: '版本号（可留空）',
  addOperation: '添加操作',
  operation: '操作',
  operationName: '操作名',
  command: '命令',
  deleteOperation: '删除操作',
  moveUp: '上移',
  moveDown: '下移',
  deleteCommand: '删除命令',
  addCommand: '添加命令',
  cancel: '取消',
  save: '保存',
  close: '关闭',
  createTool: '新增工具',
  editTool: '编辑工具',
  idInvalid: 'id 必须匹配 ^[a-z0-9][a-z0-9-]*$',
  nameRequired: 'name 不能为空',
  operationRequired: '至少需要一个操作',
  operationNameRequired: '操作名不能为空',
  operationDuplicate: '操作 "{name}" 重复',
  commandRequired: '操作 "{name}" 至少需要一条命令',
  commandEmpty: '操作 "{name}" 包含空命令',
  language: '语言',
};

const dictionaries: Record<Language, Messages> = {
  en,
  'zh-CN': zhCN,
};

export function normalizeLanguage(value: unknown): Language {
  return value === 'zh-CN' || value === 'en' ? value : 'en';
}

export function wt(key: string, params: Params = {}, language: Language = 'en'): string {
  const template = dictionaries[language][key] ?? dictionaries.en[key] ?? key;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}
