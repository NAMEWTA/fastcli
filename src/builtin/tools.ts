import type { ToolDefinition } from '../core/types.js';

/** The only supported-tool catalog. No user data can replace these definitions. */
export const BUILTIN_TOOLS: readonly ToolDefinition[] = [
  { id: 'claude', name: 'Claude Code', npmPackage: '@anthropic-ai/claude-code', executable: 'claude', launchArgs: ['--dangerously-skip-permissions'], versionArgs: ['--version'], minimumNode: '22.0.0' },
  { id: 'codex', name: 'Codex', npmPackage: '@openai/codex', executable: 'codex', launchArgs: ['--dangerously-bypass-approvals-and-sandbox'], versionArgs: ['--version'], minimumNode: '16.0.0' },
  { id: 'gemini', name: 'Gemini CLI', npmPackage: '@google/gemini-cli', executable: 'gemini', launchArgs: ['--yolo'], versionArgs: ['--version'], minimumNode: '20.0.0' },
  { id: 'grok', name: 'Grok Build', npmPackage: '@xai-official/grok', executable: 'grok', launchArgs: ['--yolo', '--sandbox', 'off'], versionArgs: ['version'], minimumNode: '20.0.0' },
  { id: 'opencode', name: 'OpenCode', npmPackage: 'opencode-ai', executable: 'opencode', launchArgs: ['--auto'], versionArgs: ['--version'] },
  { id: 'pi', name: 'Pi', npmPackage: '@earendil-works/pi-coding-agent', executable: 'pi', launchArgs: [], versionArgs: ['--version'], minimumNode: '22.19.0' },
];

export function findTool(id: string): ToolDefinition | undefined {
  return BUILTIN_TOOLS.find(tool => tool.id === id);
}
