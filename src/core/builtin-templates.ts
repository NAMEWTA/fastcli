/**
 * 内置工具的命令模板生成器。
 *
 * 内置工具（`src/builtin/tools.ts`）只声明纯元数据，不预先写入命令字符串。
 * 真正的 `install` / `uninstall` / `danger` 命令在加载 registry 时由本模块根据
 * 当前 `AppConfig.packageManager` 动态生成；这样用户切换 `packageManager` 时
 * 不必改任何源码或配置文件，重新启动即生效。
 *
 * 命令字符串严格遵循 PRD §3.1.2 的字面量：
 *
 * - `pm === 'volta'`：
 *   - install:   `volta install <pkg>@latest`
 *   - uninstall: `volta uninstall <pkg>`
 * - `pm === 'npm'`：
 *   - install:   `npm install -g <pkg>`
 *   - uninstall: `npm uninstall -g <pkg>`
 * - 支持全权限启动的内置工具额外生成 `danger`。
 *
 * 验证依据：Requirements 1.2、1.3。
 */

import type { ToolCommands } from '../config/schema.js';

/**
 * 内置工具支持的包管理器。
 *
 * `AppConfig.packageManager` 字段使用同样的字面量联合类型；这里单独导出
 * 别名是为了避免 `core` 反过来依赖 `config/schema` 的具名类型，也让本模块
 * 的对外签名更易读。
 */
export type PackageManager = 'volta' | 'npm';

const DANGER_COMMANDS: Record<string, string> = {
  '@anthropic-ai/claude-code': 'claude --dangerously-skip-permissions',
  '@openai/codex': 'codex --dangerously-bypass-approvals-and-sandbox',
  '@github/copilot': 'copilot --autopilot --yolo',
  '@google/gemini-cli': 'gemini --yolo',
  opencode: 'opencode run --dangerously-skip-permissions',
};

/**
 * 根据包管理器和 npm 包名，生成内置工具的 `install` / `uninstall` 命令字符串；
 * 支持全权限启动的工具会额外生成 `danger`。
 *
 * 返回值结构与 `ToolCommands` 兼容：调用方可以直接把它作为 `ToolEntry.commands`
 * 写入 registry。`{{name}}` / `{{version}}` 等变量替换是后续 resolver 的职责，
 * 本函数只产出字面量命令。
 *
 * @param pm         当前用户选择的包管理器（来自 `AppConfig.packageManager`）。
 * @param npmPackage 内置工具对应的 npm 包名（来自 `BuiltinSpec.npmPackage`）。
 * @returns          含 `install` / `uninstall`，以及可选 `danger` 字段的命令对象。
 *
 * @example
 *   buildBuiltinCommands('volta', '@anthropic-ai/claude-code')
 *   // => {
 *   //   install:   'volta install @anthropic-ai/claude-code@latest',
 *   //   uninstall: 'volta uninstall @anthropic-ai/claude-code',
 *   //   danger:    'claude --dangerously-skip-permissions',
 *   // }
 */
export function buildBuiltinCommands(
  pm: PackageManager,
  npmPackage: string,
): ToolCommands {
  const commands: ToolCommands = pm === 'volta'
    ? {
        install: [`volta install ${npmPackage}@latest`],
        uninstall: [`volta uninstall ${npmPackage}`],
      }
    : {
        install: [`npm install -g ${npmPackage}`],
        uninstall: [`npm uninstall -g ${npmPackage}`],
      };

  const danger = DANGER_COMMANDS[npmPackage];
  if (danger !== undefined) {
    commands.danger = [danger];
  }
  return commands;
}
