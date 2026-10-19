import { color, wrapTerminalText, terminalWidth } from './terminal.js';
import { homedir } from 'node:os';
import { realpath } from 'node:fs/promises';
import { relative } from 'node:path';
import { BUILTIN_TOOLS } from '../builtin/tools.js';
import { discoverTool, detectTools, installationEnv, probeInstallation } from '../core/detection.js';
import { runProcess, formatInvocation, ProcessCancelledError } from '../core/executor.js';
import { getNpmContext, inspectNpmPackage, buildNpmInvocation, manageTool, managementBlockReason, type NpmPackageState, type NpmContext, type ManagementAction } from '../core/npm-manager.js';
import type { ToolDefinition, DetectedInstallation, ToolDetection } from '../core/types.js';
import { t, type Language } from '../i18n.js';
import type { PromptUI } from './prompts.js';

export interface CliContext { version?: string; language: Language; interactive: boolean; env: NodeJS.ProcessEnv; prompts: PromptUI }
export function discoveryOptions(ctx: CliContext, npm?: NpmContext) {
  return { env: ctx.env, home: (process.platform === 'win32' ? ctx.env.USERPROFILE : ctx.env.HOME) || homedir(), npmPrefix: npm?.prefix };
}
export async function optionalNpm(ctx: CliContext): Promise<{ context?: NpmContext; error?: string }> {
  try { return { context: await getNpmContext(ctx.env) }; }
  catch (error) { if (error instanceof ProcessCancelledError) throw error; return { error: String(error) }; }
}
export async function scanTools(ctx: CliContext, npm?: NpmContext): Promise<ToolDetection[]> {
  const scan = () => detectTools(BUILTIN_TOOLS, discoveryOptions(ctx, npm));
  return ctx.prompts.progress ? ctx.prompts.progress(t(ctx.language, 'scanning'), scan) : scan();
}
export function installationLabel(entry: DetectedInstallation, language: Language): string {
  return `${entry.version ?? t(language, 'versionUnknown')} · ${entry.path}${entry.isPathDefault ? ` · ${t(language, 'pathDefault')}` : ''}${entry.error ? ` · ${entry.error}` : ''}`;
}

export function managementProblem(state: NpmPackageState, action: ManagementAction, language: Language): string | undefined {
  const blocked = managementBlockReason(state, action);
  if (!blocked) return undefined;
  return `${t(language, blocked)}${blocked === 'unmanaged-package' && state.reason ? ` ${t(language, state.reason)}` : ''}`;
}

export async function launchTool(tool: ToolDefinition, args: string[], ctx: CliContext): Promise<number> {
  let detection = await discoverTool(tool, discoveryOptions(ctx));
  // The normal path needs neither npm nor a version probe. A custom npm prefix is a fallback only.
  if (!detection.installations.some(entry => entry.isPathDefault)) {
    const npm = await optionalNpm(ctx);
    if (npm.context) detection = await discoverTool(tool, discoveryOptions(ctx, npm.context));
  }
  const entries = detection.installations;
  if (entries.length === 0) { console.error(t(ctx.language, 'notFound', { id: tool.id })); return 127; }
  let entry = entries.find(item => item.isPathDefault) ?? (entries.length === 1 ? entries[0] : undefined);
  if (!entry) {
    if (!ctx.interactive) {
      console.error(t(ctx.language, 'ambiguous'));
      for (const candidate of entries) console.error(candidate.path);
      return 1;
    }
    const choice = await ctx.prompts.select(t(ctx.language, 'choosePath'), [
      ...entries.map(item => ({ value: item.path, label: item.path })), { value: ':back', label: t(ctx.language, 'back') },
    ]);
    if (choice === ':back') return 0;
    entry = entries.find(item => item.path === choice)!;
  }
  const result = await runProcess({ file: entry.path, args: [...tool.launchArgs, ...args], env: installationEnv(entry, ctx.env) });
  if (result.error) console.error(result.error);
  if (result.cleanupError) console.error(result.cleanupError);
  return result.code;
}

/** Report launch selection independently from npm's verified mutation result. */
async function reportInstalledLaunch(tool: ToolDefinition, version: string | undefined, npm: NpmContext, ctx: CliContext): Promise<void> {
  const state = await inspectNpmPackage(tool, npm);
  console.error(`${t(ctx.language, 'npmExecutable')}: ${version ?? t(ctx.language, 'versionUnknown')} · ${state.entryPath ?? t(ctx.language, 'versionUnknown')}`);
  const detection = await discoverTool(tool, discoveryOptions(ctx, npm));
  const selected = detection.installations.find(entry => entry.isPathDefault);
  if (!selected) {
    console.error(t(ctx.language, 'noDefaultEntry'));
    console.error(t(ctx.language, 'entryAdvice'));
    return;
  }
  const current = await probeInstallation(tool, selected, { env: ctx.env });
  console.error(`${t(ctx.language, 'defaultExecutable')}: ${installationLabel(current, ctx.language)}`);
  let sameEntry = false;
  if (state.entryPath && !state.reason) {
    try {
      const managedPath = await realpath(state.entryPath);
      sameEntry = process.platform === 'win32'
        ? managedPath.toLowerCase() === current.realPath.toLowerCase()
        : managedPath === current.realPath;
    } catch { /* An entry that changed during verification cannot prove alignment. */ }
  }
  if (!sameEntry) {
    console.error(t(ctx.language, 'defaultOtherEntry'));
    console.error(t(ctx.language, 'entryAdvice'));
  } else if (current.error || !current.version || current.version !== version) {
    console.error(t(ctx.language, 'defaultUnverified'));
  } else console.error(t(ctx.language, 'defaultMatches'));
}

export async function manageAction(tool: ToolDefinition, action: ManagementAction, ctx: CliContext,
  options: { dryRun?: boolean; yes?: boolean; npm?: NpmContext } = {}): Promise<number> {
  if (options.dryRun) {
    console.log(`$ ${formatInvocation(buildNpmInvocation(tool, action))}`);
    console.error(t(ctx.language, 'dryRun'));
    return 0;
  }
  const npm = options.npm ?? await getNpmContext(ctx.env);
  const state = await inspectNpmPackage(tool, npm);
  console.error(`${t(ctx.language, 'npmTarget')}: ${tool.npmPackage} · ${npm.prefix}`);
  const problem = managementProblem(state, action, ctx.language);
  if (problem) { console.error(problem); return 1; }
  const before = await discoverTool(tool, discoveryOptions(ctx, npm));
  if (before.installations.some(item => !state.entryPath || relative(item.path, state.entryPath) !== '')) console.error(t(ctx.language, 'coexist'));
  if (action === 'uninstall' && !options.yes) {
    if (!ctx.interactive) { console.error(t(ctx.language, 'nonTtyUninstall')); return 1; }
    if (!await ctx.prompts.confirm(t(ctx.language, 'confirmUninstall', { name: tool.name, prefix: npm.prefix }))) {
      console.error(t(ctx.language, 'cancelled')); return 0;
    }
  }
  const result = await manageTool(tool, action, npm);
  const message = action === 'install' && result.code === 0 ? 'npmInstallSuccess' : result.message;
  if (ctx.interactive) (result.code === 0 ? ctx.prompts.success ?? ctx.prompts.info : ctx.prompts.error)(t(ctx.language, message));
  else console.error(t(ctx.language, message));
  if (result.details) console.error(result.details);
  console.error(`${tool.name}: ${t(ctx.language, result.installed ? 'installed' : 'notInstalled')}${result.version ? ` · ${result.version}` : ''}`);
  if (action === 'install' && result.code === 0) await reportInstalledLaunch(tool, result.version, npm, ctx);
  if (action === 'uninstall' || result.code !== 0) {
    const after = await discoverTool(tool, discoveryOptions(ctx, npm));
    if (after.installations.length) console.error(`${t(ctx.language, 'remaining')}: ${after.installations.map(item => item.path).join(', ')}`);
  }
  return result.code;
}

export async function printTools(ctx: CliContext, only?: ToolDefinition): Promise<void> {
  const npm = await optionalNpm(ctx);
  const tools = only ? [only] : BUILTIN_TOOLS;
  const results = await detectTools(tools, discoveryOptions(ctx, npm.context));
  for (const result of results) {
    console.log(`${color.cyan(color.bold(result.tool.id))} — ${color.bold(result.tool.name)}`);
    if (!result.installations.length) console.log(`  ${color.dim(t(ctx.language, 'notInstalled'))}`);
    for (const entry of result.installations) {
      const version = entry.version ? color.green(entry.version) : color.yellow(t(ctx.language, 'versionUnknown'));
      const details = `${version} · ${color.dim(entry.path)}${entry.isPathDefault ? ` · ${color.cyan(t(ctx.language, 'pathDefault'))}` : ''}${entry.error ? ` · ${color.yellow(entry.error)}` : ''}`;
      console.log('  ' + (process.stdout.isTTY ? wrapTerminalText(details, terminalWidth()).replaceAll('\n', '\n  ') : details));
      if (only) console.log(`  ${t(ctx.language, 'source')}: ${entry.source} · ${entry.realPath}`);
    }
    if (only) {
      console.log(`  $ ${formatInvocation({ file: result.tool.executable, args: result.tool.launchArgs })}`);
      if (npm.context) {
        const state = await inspectNpmPackage(result.tool, npm.context);
        console.log(`  ${t(ctx.language, 'npmTarget')}: ${result.tool.npmPackage} · ${npm.context.prefix} · ${t(ctx.language, state.installed ? 'installed' : 'notInstalled')}`);
        console.log(`  ${t(ctx.language, 'npmExecutable')}: ${state.entryPath ?? managementProblem(state, 'uninstall', ctx.language) ?? t(ctx.language, 'notInstalled')}`);
      } else console.log(`  ${t(ctx.language, 'npmUnavailable')}: ${npm.error}`);
    }
  }
}
