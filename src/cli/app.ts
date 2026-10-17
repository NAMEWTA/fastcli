import { consumeResumeMarker, shouldCheckUpdate } from '../core/update-flow.js';
import { color, wrapTerminalText } from './terminal.js';
import { startupUpdate } from './update.js';
import { findTool } from '../builtin/tools.js';
import { loadAppConfig } from '../config/reader.js';
import { saveAppConfig } from '../config/writer.js';
import { t } from '../i18n.js';
import { createTerminalPrompts, CancelledError, type PromptUI } from './prompts.js';
import { launchTool, manageAction, printTools, type CliContext } from './actions.js';
import { runInteractiveMenu } from './menu.js';
import type { ManagementAction } from '../core/npm-manager.js';
import { ProcessCancelledError } from '../core/executor.js';

function help(language: 'en' | 'zh-CN'): string {
  const text = `${language === 'zh-CN' ? 'fastcli — AI CLI 启动与 npm 管理' : 'fastcli — AI CLI launcher and npm manager'}\n\nfastcli\nfastcli <claude|codex|gemini|grok|opencode|pi> [args...]\nfastcli install <tool> [--dry-run]\nfastcli uninstall <tool> [--yes] [--dry-run]\nfastcli list\nfastcli info <tool>\nfastcli config [--language en|zh-CN]\nfastcli --help\nfastcli --version\n\n${language === 'zh-CN' ? '工具名后的所有参数原样传递；管理仅作用于当前 npm 全局环境。\n交互启动检查自身更新；FASTCLI_NO_UPDATE_CHECK=1 可关闭。' : 'All arguments after a tool name pass through. Management targets only the current global npm environment.\nInteractive starts check for updates; FASTCLI_NO_UPDATE_CHECK=1 disables this.'}`;
  return wrapTerminalText(text.split('\n').map((line, index) => index === 0 ? color.bold(color.cyan(line)) : line.startsWith('fastcli') ? line.replace(/^fastcli/, color.cyan('fastcli')) : line).join('\n'), process.stdout.columns || 80);
}

export async function runCli(argv: string[], options: { prompts?: PromptUI; interactive?: boolean; env?: NodeJS.ProcessEnv; version?: string; packageRoot?: string; checkUpdate?: () => Promise<number | undefined> } = {}): Promise<number> {
  // Parse native tool dispatch before wrapper flags so `fastcli codex --version` stays Codex's flag.
  const tool = argv[0] ? findTool(argv[0]) : undefined;
  const preview = !tool && argv.includes('--dry-run');
  const config = await loadAppConfig({ migrate: !preview && !argv.includes('--help') && !argv.includes('--version') });
  const ctx: CliContext = { language: config.language, interactive: options.interactive ?? Boolean(process.stdin.isTTY && process.stdout.isTTY),
    env: options.env ?? process.env, prompts: options.prompts ?? createTerminalPrompts(config.language), version: options.version };
  ctx.env = { ...ctx.env };
  const resumed = consumeResumeMarker(ctx.env, 'FASTCLI', options.version ?? 'unknown');
  // Remove the one-shot marker from the actual process as well as the injected environment.
  if (!options.env) delete process.env.FASTCLI_UPDATE_RESUME;
  const execute = async (action: () => Promise<number>): Promise<number> => {
    if (!preview && !resumed && shouldCheckUpdate(ctx.env, 'FASTCLI', ctx.interactive)) {
      const code = options.checkUpdate ? await options.checkUpdate() : options.version && options.packageRoot
        ? await startupUpdate(ctx, options.version, options.packageRoot, argv) : undefined;
      if (code !== undefined) return code;
    }
    return action();
  };
  try {
    if (tool) return await execute(() => launchTool(tool, argv.slice(1), ctx));
    if (argv.length === 0) {
      if (!ctx.interactive) { console.error(t(ctx.language, 'nonTtyMenu')); return 1; }
      return await execute(() => runInteractiveMenu(ctx));
    }
    if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) { console.log(help(ctx.language)); return 0; }
    if (argv.length === 1 && (argv[0] === '--version' || argv[0] === '-v')) { console.log(options.version ?? 'unknown'); return 0; }
    const [command, id, ...rest] = argv;
    if (['run', 'add', 'edit', 'remove', 'view', 'web', 'pi-coding-agent', 'copilot', 'cursor', 'codebuddy', 'openwiki', 'speculo'].includes(command!) || argv.some(arg => /^(--source|--tag|--category)(=|$)/.test(arg)) || (command === 'config' && id === 'edit')) {
      console.error(t(ctx.language, 'retired')); return 1;
    }
    if (['install', 'uninstall'].includes(command!)) {
      if (id === '--help' && !rest.length) { console.log(help(ctx.language)); return 0; }
      if (!id || rest.some(arg => arg !== '--dry-run' && !(command === 'uninstall' && arg === '--yes'))) { console.error(t(ctx.language, 'usageError')); return 1; }
      const target = findTool(id);
      if (!target) { console.error(t(ctx.language, 'unknownTool', { id })); return 1; }
      return await execute(() => manageAction(target, command as ManagementAction, ctx, { dryRun: preview, yes: rest.includes('--yes') }));
    }
    if (command === 'list' && !id) return await execute(async () => { await printTools(ctx); return 0; });
    if (command === 'info' && id && !rest.length) {
      const target = findTool(id);
      if (!target) { console.error(t(ctx.language, 'unknownTool', { id })); return 1; }
      return await execute(async () => { await printTools(ctx, target); return 0; });
    }
    if (command === 'config') {
      if (!id) { console.log(JSON.stringify(config, null, 2)); return 0; }
      const language = id === '--language' && rest.length === 1 ? rest[0] : id.startsWith('--language=') && !rest.length ? id.slice('--language='.length) : undefined;
      if (language === 'en' || language === 'zh-CN') {
        return await execute(async () => { await saveAppConfig({ ...config, language }); console.log(t(language, 'settingSaved')); return 0; });
      }
    }
    console.error(t(ctx.language, 'usageError')); return 1;
  } catch (error) {
    if (error instanceof ProcessCancelledError) { console.error(error.cleanupError ?? t(ctx.language, 'cancelled')); return error.code; }
    if (error instanceof CancelledError) { console.error(t(ctx.language, 'cancelled')); return 130; }
    throw error;
  }
}
