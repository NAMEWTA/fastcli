/**
 * 内置工具的元数据列表。
 *
 * 这些条目由二进制本身内置（`source: 'builtin'`），不会写入 `~/.fastcli/tools.json`，
 * 也不会读取它（满足 Requirement 1.4）。每个条目仅声明纯元数据：`id`、`name`、
 * `description`、`npmPackage` 与 `tags`。
 *
 * 真正的命令字符串（`install` / `uninstall` / `danger`）不在这里硬编码，而是由
 * `src/core/builtin-templates.ts` 在运行时根据用户配置的 `packageManager`（volta 或
 * npm）按需生成；这样切换包管理器时不需要改这份清单。
 *
 * 内置工具的 `id` 与 `npmPackage` 与 PRD §3.1.1 严格一致：
 *
 * | id       | npmPackage                       |
 * |----------|----------------------------------|
 * | claude   | @anthropic-ai/claude-code        |
 * | codex    | @openai/codex                    |
 * | gemini   | @google/gemini-cli               |
 * | copilot  | @github/copilot                  |
 * | opencode | opencode                         |
 *
 * 当用户在 `tools.json` 中定义了与某个内置工具同 `id` 的条目时，`core/registry.ts`
 * 会让用户条目覆盖内置条目（并打印一次性 warn），见 Requirement 1.5。
 */

import type { ToolCommands } from '../config/schema.js';

/**
 * 内置工具的纯元数据描述。
 *
 * 不包含命令字符串（除非通过 `commands` 直接指定）：如果有 `commands`，它会被直接用作
 * ToolEntry.commands；否则由 `core/builtin-templates.ts` 根据 `npmPackage` 和
 * `AppConfig.packageManager` 动态生成。
 */
export interface BuiltinSpec {
  /** 全局唯一 slug，与用户工具共用命名空间。 */
  id: string;
  /** 展示名，亦用于 `{{name}}` 变量替换。 */
  name: string;
  /** 一句话描述，用于 `list` / `info` 展示。 */
  description: string;
  /** 对应的 npm 包名。提供后由 buildBuiltinCommands 生成命令；若提供 commands 则可省略。 */
  npmPackage?: string;
  /** 可选标签，用于 `list --tag=<T>` 过滤。 */
  tags?: string[];
  /** 工具分类：coding = AI 编程工具，tool = 通用开发工具。 */
  category: 'coding' | 'tool';
  /**
   * 可选的自定义命令对象。
   *
   * 提供后直接用作 ToolEntry.commands，不再调用 buildBuiltinCommands。
   * 适用于非 npm 安装方式（如 curl、brew 等）的工具。
   */
  commands?: ToolCommands;
}

/**
 * 内置工具列表。顺序仅作展示之用；`registry` 在合并 builtin + user 时会按
 * `name` 字母序重新排序。
 */
export const BUILTIN_TOOLS: BuiltinSpec[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    description: 'Anthropic Claude Code CLI',
    npmPackage: '@anthropic-ai/claude-code',
    tags: ['anthropic', 'coding'],
    category: 'coding',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    description: 'OpenAI Codex CLI',
    npmPackage: '@openai/codex',
    tags: ['openai', 'coding'],
    category: 'coding',
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    description: 'Google Gemini CLI',
    npmPackage: '@google/gemini-cli',
    tags: ['google', 'coding'],
    category: 'coding',
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    description: 'GitHub Copilot CLI',
    npmPackage: '@github/copilot',
    tags: ['github', 'coding'],
    category: 'coding',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    description: 'OpenCode CLI',
    npmPackage: 'opencode',
    tags: ['opensource', 'coding'],
    category: 'coding',
  },
  {
    id: 'pi-coding-agent',
    name: 'PI Coding Agent',
    description: 'PI Coding Agent CLI',
    npmPackage: '@earendil-works/pi-coding-agent',
    tags: ['pi', 'coding'],
    category: 'coding',
  },
  {
    id: 'grok',
    name: 'Grok CLI',
    description: 'xAI Grok CLI',
    tags: ['xai', 'coding'],
    category: 'coding',
    commands: {
      install: ['curl -fsSL https://x.ai/cli/install.sh | bash'],
    },
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'Cursor CLI',
    tags: ['cursor', 'coding'],
    category: 'coding',
    commands: {
      install: ['curl https://cursor.com/install -fsS | bash'],
    },
  },
  {
    id: 'speculo',
    name: 'Speculo',
    description: 'Speculo CLI',
    npmPackage: '@namewta/speculo',
    tags: ['spec', 'tool'],
    category: 'tool',
  },
];
