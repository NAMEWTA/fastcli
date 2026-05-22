/**
 * 工具注册中心：合并内置工具与用户工具，提供按 id 查找与按条件过滤的能力。
 *
 * 注册中心是命令解析与 TUI 菜单的入口数据源。它负责：
 *
 * - 把 {@link BUILTIN_TOOLS} 中的纯元数据，配合当前 {@link AppConfig.packageManager}，
 *   通过 {@link buildBuiltinCommands} 生成具体的 install / update / uninstall
 *   命令字符串，构造出 `source: 'builtin'` 的 {@link ToolEntry}
 * - 把 `~/.fastcli/tools.json` 中读到的用户工具列表统一标记为 `source: 'user'`
 *   （即便文件中字段缺失或写错，也强制覆盖，避免下游误判来源）
 * - 当 user 中的 `id` 与某个 builtin 重名时，让 user 覆盖 builtin，并通过
 *   `console.warn` 打印一次性提示（Requirement 1.5）
 *
 * 本模块只负责数据装配与查询，不做排序——分组与字母序由上层
 * `cli/list` 与 `cli/menu` 在展示阶段处理（设计文档 §Components / Property 3）。
 *
 * Validates: Requirements 1.5, 3.2, 3.3, 3.4
 */

import { BUILTIN_TOOLS } from '../builtin/tools.js';
import { loadAppConfig, loadToolsFile } from '../config/reader.js';
import type { AppConfig, ToolEntry, ToolsFile } from '../config/schema.js';
import { buildBuiltinCommands } from './builtin-templates.js';

/**
 * `Registry.list()` 的过滤条件。
 *
 * - `source`：严格匹配 `ToolEntry.source`
 * - `tag`：要求 `entry.tags?.includes(tag)` 为真；未声明 `tags` 的条目不会被命中
 *
 * 两个字段都可选；未提供时不施加该维度的过滤。两者同时提供时取交集。
 */
export interface ListFilter {
  /** 仅返回某个来源的条目。 */
  source?: 'builtin' | 'user';
  /** 仅返回包含该 tag 的条目。 */
  tag?: string;
}

/**
 * 注册中心的对外查询接口。
 *
 * 实例由 {@link loadRegistry} 异步构造；内部持有合并后的 `Map<id, ToolEntry>`，
 * 查询 O(1)，过滤 O(n)。
 */
export interface Registry {
  /** 按 id 精确查找（builtin 与 user 共用命名空间，user 覆盖 builtin）。 */
  findById(id: string): ToolEntry | undefined;
  /** 列出全部条目，可按 `source` / `tag` 过滤；不保证顺序。 */
  list(filter?: ListFilter): ToolEntry[];
}

/**
 * {@link loadRegistry} 的依赖注入参数。
 *
 * 当调用方已经在更外层加载过配置和用户工具时，可以直接传入避免重复读盘；
 * 测试中也用它跳过文件系统，对 registry 做纯内存断言。
 */
export interface LoadRegistryDeps {
  /** 已加载的全局配置；缺省时调用 {@link loadAppConfig}。 */
  appConfig?: AppConfig;
  /** 已加载的用户工具文件；缺省时调用 {@link loadToolsFile}。 */
  toolsFile?: ToolsFile;
}

/**
 * 把内置工具元数据装配为 {@link ToolEntry}，命令模板按当前 PM 生成。
 */
function buildBuiltinEntries(appConfig: AppConfig): ToolEntry[] {
  return BUILTIN_TOOLS.map((spec) => ({
    id: spec.id,
    name: spec.name,
    description: spec.description,
    tags: spec.tags,
    commands: buildBuiltinCommands(appConfig.packageManager, spec.npmPackage),
    source: 'builtin',
  }));
}

/**
 * 把用户工具文件中的条目强制标记为 `source: 'user'`。
 *
 * `tools.json` 是用户可手动编辑的文本文件，其中的 `source` 字段可能缺失、
 * 写错（例如复制示例时残留 `'builtin'`），这里直接覆盖以保证不变量：
 * 文件里的所有条目都来自用户。
 */
function buildUserEntries(toolsFile: ToolsFile): ToolEntry[] {
  return toolsFile.tools.map((entry) => ({
    ...entry,
    source: 'user',
  }));
}

/**
 * 加载并构造一个注册中心实例。
 *
 * 行为细节：
 *
 * 1. 解析 `appConfig` / `toolsFile`：如果调用方传入则直接使用，否则懒加载读盘
 * 2. 由 builtin 元数据 + 当前包管理器生成 builtin {@link ToolEntry}
 * 3. 把 `tools.json` 中的条目映射为 user {@link ToolEntry}（强制 `source: 'user'`）
 * 4. 合并：builtin 先入 Map，user 后入；遇到 id 冲突时先 `console.warn` 再覆盖
 * 5. 返回的 Registry 持有这个 Map；`findById` / `list` 都直接基于它
 *
 * @param deps  可选的依赖注入；测试中常传入 in-memory 的 `appConfig` / `toolsFile`
 *              以避免文件系统副作用
 *
 * @example
 *   const registry = await loadRegistry();
 *   const claude = registry.findById('claude');
 *   const userTools = registry.list({ source: 'user' });
 */
export async function loadRegistry(
  deps: LoadRegistryDeps = {},
): Promise<Registry> {
  const appConfig = deps.appConfig ?? (await loadAppConfig());
  const toolsFile = deps.toolsFile ?? (await loadToolsFile());

  const merged = new Map<string, ToolEntry>();

  for (const entry of buildBuiltinEntries(appConfig)) {
    merged.set(entry.id, entry);
  }

  for (const entry of buildUserEntries(toolsFile)) {
    if (merged.has(entry.id)) {
      // Requirement 1.5：用户工具覆盖同名内置工具时给一次性 warn。
      console.warn(`用户工具 "${entry.id}" 覆盖了同名内置工具`);
    }
    merged.set(entry.id, entry);
  }

  return {
    findById(id: string): ToolEntry | undefined {
      return merged.get(id);
    },
    list(filter: ListFilter = {}): ToolEntry[] {
      const all = Array.from(merged.values());
      return all.filter((entry) => {
        if (filter.source !== undefined && entry.source !== filter.source) {
          return false;
        }
        if (filter.tag !== undefined && !entry.tags?.includes(filter.tag)) {
          return false;
        }
        return true;
      });
    },
  };
}
