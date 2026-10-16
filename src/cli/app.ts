import { findTool } from '../builtin/tools.js';
import { loadAppConfig } from '../config/reader.js';
import { saveAppConfig } from '../config/writer.js';
import { t } from '../i18n.js';
import { terminalPrompts, CancelledError, type PromptUI } from './prompts.js';
import { launchTool, manageAction, printTools, type CliContext } from './actions.js';
import { runInteractiveMenu } from './menu.js';
import type { ManagementAction } from '../core/npm-manager.js';
import { ProcessCancelledError } from '../core/executor.js';

function help(language: 'en' | 'zh-CN'): string {
  return `${language === 'zh-CN' ? 'fastcli — AI CLI 启动与 npm 管理' : 'fastcli — AI CLI launcher and npm manager'}\n\nfastcli\nfastcli <claude|codex|gemini|grok|opencode|pi> [args...]\nfastcli install <tool> [--dry-run]\nfastcli upgrade <tool> [--dry-run]\nfastcli uninstall <tool> [--yes] [--dry-run]\nfastcli list\nfastcli info <tool>\nfastcli config [--language en|zh-CN]\nfastcli --help\nfastcli --version\n\n${language === 'zh-CN' ? '工具名后的所有参数原样传递；管理仅作用于当前 npm 全局环境。' : 'All arguments after a tool name pass through. Management targets only the current global npm environment.'}`;
}

export async function runCli(argv: string[], options: { prompts?: PromptUI; interactive?: boolean; env?: NodeJS.ProcessEnv; version?: string } = {}): Promise<number> {
  // Parse native tool dispatch before wrapper flags so `fastcli codex --version` stays Codex's flag.
  const tool = argv[0] ? findTool(argv[0]) : undefined;
  const preview = !tool && argv.includes('--dry-run');
  const config = await loadAppConfig({ migrate: !preview && !argv.includes('--help') && !argv.includes('--version') });
  const ctx: CliContext = { language: config.language, interactive: options.interactive ?? Boolean(process.stdin.isTTY && process.stdout.isTTY),
    env: options.env ?? process.env, prompts: options.prompts ?? terminalPrompts };
  try {
    if (tool) return await launchTool(tool, argv.slice(1), ctx);
    if (argv.length === 0) {
      if (!ctx.interactive) { console.error(t(ctx.language, 'nonTtyMenu')); return 1; }
      return await runInteractiveMenu(ctx);
    }
    if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) { console.log(help(ctx.language)); return 0; }
    if (argv.length === 1 && (argv[0] === '--version' || argv[0] === '-v')) { console.log(options.version ?? 'unknown'); return 0; }
    const [command, id, ...rest] = argv;
    if (['run', 'add', 'edit', 'remove', 'view', 'web', 'pi-coding-agent', 'copilot', 'cursor', 'codebuddy', 'openwiki', 'speculo'].includes(command!) || argv.some(arg => /^(--source|--tag|--category)(=|$)/.test(arg)) || (command === 'config' && id === 'edit')) {
      console.error(t(ctx.language, 'retired')); return 1;
    }
    if (['install', 'upgrade', 'uninstall'].includes(command!)) {
      if (id === '--help' && !rest.length) { console.log(help(ctx.language)); return 0; }
      if (!id || rest.some(arg => arg !== '--dry-run' && !(command === 'uninstall' && arg === '--yes'))) { console.error(t(ctx.language, 'usageError')); return 1; }
      const target = findTool(id);
      if (!target) { console.error(t(ctx.language, 'unknownTool', { id })); return 1; }
      return await manageAction(target, command as ManagementAction, ctx, { dryRun: preview, yes: rest.includes('--yes') });
    }
    if (command === 'list' && !id) { await printTools(ctx); return 0; }
    if (command === 'info' && id && !rest.length) {
      const target = findTool(id);
      if (!target) { console.error(t(ctx.language, 'unknownTool', { id })); return 1; }
      await printTools(ctx, target); return 0;
    }
    if (command === 'config') {
      if (!id) { console.log(JSON.stringify(config, null, 2)); return 0; }
      const language = id === '--language' && rest.length === 1 ? rest[0] : id.startsWith('--language=') && !rest.length ? id.slice('--language='.length) : undefined;
      if (language === 'en' || language === 'zh-CN') {
        await saveAppConfig({ ...config, language }); console.log(t(language, 'settingSaved')); return 0;
      }
    }
    console.error(t(ctx.language, 'usageError')); return 1;
  } catch (error) {
    if (error instanceof ProcessCancelledError) { console.error(error.cleanupError ?? t(ctx.language, 'cancelled')); return error.code; }
    if (error instanceof CancelledError) { console.error(t(ctx.language, 'cancelled')); return 130; }
    throw error;
  }
}
