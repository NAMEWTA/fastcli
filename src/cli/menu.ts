import { BUILTIN_TOOLS, findTool } from '../builtin/tools.js';
import { loadAppConfig } from '../config/reader.js';
import { saveAppConfig } from '../config/writer.js';
import { t, type Language } from '../i18n.js';
import { inspectNpmPackage, type ManagementAction } from '../core/npm-manager.js';
import { launchTool, manageAction, optionalNpm, scanTools, installationLabel, managementProblem, type CliContext } from './actions.js';
import { ProcessCancelledError } from '../core/executor.js';
import { CancelledError } from './prompts.js';

const back = (ctx: CliContext) => ({ value: ':back', label: t(ctx.language, 'back') });

async function managementMenu(ctx: CliContext): Promise<void> {
  while (true) {
    const action = await ctx.prompts.select(t(ctx.language, 'choose'), [
      ...(['install', 'uninstall'] as const).map(value => ({ value, label: t(ctx.language, value) })), back(ctx),
    ]);
    if (action === ':back') return;
    while (true) {
      const npm = await optionalNpm(ctx);
      if (!npm.context) { ctx.prompts.error(`${t(ctx.language, 'npmUnavailable')}: ${npm.error}`); break; }
      const context = npm.context;
      const states = await Promise.all(BUILTIN_TOOLS.map(tool => inspectNpmPackage(tool, context)));
      const detections = await scanTools(ctx, context);
      const options = BUILTIN_TOOLS.map((tool, index) => {
        const state = states[index]!;
        const entry = detections[index]!.installations.find(item => item.isPathDefault) ?? detections[index]!.installations[0];
        const problem = managementProblem(state, action as ManagementAction, ctx.language);
        return { value: tool.id, label: tool.name,
          hint: `${problem ? `${problem} · ` : ''}${entry ? installationLabel(entry, ctx.language) : t(ctx.language, 'notInstalled')}` };
      });
      const id = await ctx.prompts.select(t(ctx.language, 'chooseTool'), [...options, back(ctx)]);
      if (id === ':back') break;
      const index = BUILTIN_TOOLS.findIndex(tool => tool.id === id);
      const problem = managementProblem(states[index]!, action as ManagementAction, ctx.language);
      if (problem) { ctx.prompts.error(problem); continue; }
      const code = await manageAction(BUILTIN_TOOLS[index]!, action as ManagementAction, ctx, { npm: context });
      if (code === 130 || code === 143) throw new ProcessCancelledError(code === 130 ? 'SIGINT' : 'SIGTERM');
      return;
    }
  }
}

async function yoloMenu(ctx: CliContext): Promise<void> {
  const npm = await optionalNpm(ctx);
  const results = await scanTools(ctx, npm.context);
  const installed = results.filter(result => result.installations.length > 0);
  if (!installed.length) {
    ctx.prompts.info(t(ctx.language, 'noTools'));
    const choice = await ctx.prompts.select(t(ctx.language, 'choose'), [{ value: 'install', label: t(ctx.language, 'manage') }, back(ctx)]);
    if (choice === 'install') await managementMenu(ctx);
    return;
  }
  const id = await ctx.prompts.select(t(ctx.language, 'chooseTool'), [
    ...installed.map(result => ({ value: result.tool.id, label: result.tool.name,
      hint: installationLabel(result.installations.find(item => item.isPathDefault) ?? result.installations[0]!, ctx.language) })), back(ctx),
  ]);
  if (id === ':back') return;
  const code = await launchTool(findTool(id)!, [], ctx);
  if (code === 130 || code === 143) throw new ProcessCancelledError(code === 130 ? 'SIGINT' : 'SIGTERM');
  if (code !== 0) ctx.prompts.error(`${t(ctx.language, 'operationFailed')}: ${code}`);
}

/** The same launch/management actions power both direct commands and this terminal menu. */
export async function runInteractiveMenu(ctx: CliContext): Promise<number> {
  ctx.prompts.intro(`fastcli${ctx.version ? ` v${ctx.version}` : ''} · ${t(ctx.language, 'tagline')}`);
  while (true) {
    const section = await ctx.prompts.select(t(ctx.language, 'choose'), [
      { value: 'yolo', label: t(ctx.language, 'yolo'), hint: t(ctx.language, 'yoloHint'), tone: 'action' },
      { value: 'manage', label: t(ctx.language, 'manage'), hint: t(ctx.language, 'manageHint') },
      { value: 'settings', label: t(ctx.language, 'settings'), hint: t(ctx.language, 'settingsHint') }, { value: 'exit', label: t(ctx.language, 'exit') },
    ]);
    if (section === 'exit') { ctx.prompts.outro(t(ctx.language, 'goodbye')); return 0; }
    try {
      if (section === 'yolo') await yoloMenu(ctx);
      else if (section === 'manage') await managementMenu(ctx);
      else if (section === 'settings') {
        const language = await ctx.prompts.select(t(ctx.language, 'language'), [
          { value: 'en', label: 'English' }, { value: 'zh-CN', label: '简体中文' }, back(ctx),
        ]);
        if (language !== ':back') {
          await saveAppConfig({ ...await loadAppConfig(), language: language as Language });
          ctx.language = language as Language;
          ctx.prompts.setLanguage?.(ctx.language);
          ctx.prompts.info(t(ctx.language, 'settingSaved'));
        }
      }
    } catch (error) {
      if (error instanceof CancelledError || error instanceof ProcessCancelledError) throw error;
      ctx.prompts.error(String(error));
    }
  }
}
