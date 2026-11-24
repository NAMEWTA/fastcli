import { COMMAND_SHELLS, CustomCommandChangedError, CustomCommandsCorruptError, deleteCustomCommand, loadCustomCommands,
  saveCustomCommand, validCommandLine, validCommandName, type CommandShell, type CustomCommand } from '../config/custom-commands.js';
import { findCommandShell, runShellCommand, SHELL_LABELS } from '../core/command-shell.js';
import { ProcessCancelledError } from '../core/executor.js';
import { t } from '../i18n.js';
import type { CliContext } from './actions.js';
import { runBatch } from './batch.js';

async function commandForm(ctx: CliContext, previous?: CustomCommand): Promise<void> {
  const { language, prompts } = ctx;
  const available = await Promise.all(COMMAND_SHELLS.map(async shell => ({ shell, file: await findCommandShell(shell, ctx.env) })));
  const shells = available.filter(shell => shell.file).map(({ shell }) => ({ value: shell, label: SHELL_LABELS[shell] }));
  if (!shells.length) throw new Error(t(language, 'customShellMissing', { shell: process.platform === 'win32' ? 'CMD / PowerShell' : 'sh' }));
  const name = await prompts.text(t(language, 'customName'), { initialValue: previous?.name,
    validate: value => validCommandName(value) ? undefined : t(language, 'customInvalidName') });
  const preferred = shells.find(shell => shell.value === previous?.shell);
  const shell = await prompts.select(t(language, 'customShell'), [
    ...(preferred ? [preferred, ...shells.filter(shell => shell !== preferred)] : shells),
    { value: ':back', label: t(language, 'back') },
  ]);
  if (shell === ':back') return;
  const command = await prompts.text(t(language, 'customLine'), { initialValue: previous?.command,
    validate: value => validCommandLine(value) ? undefined : t(language, 'customInvalidLine') });
  await saveCustomCommand({ name, shell: shell as CommandShell, command }, previous);
  prompts.info(t(language, 'customSaved'));
}

export async function customCommandsMenu(ctx: CliContext): Promise<void> {
  const { language, prompts } = ctx;
  const back = { value: ':back', label: t(language, 'back') };
  const cwd = process.cwd();
  while (true) {
    const action = await prompts.select(t(language, 'customCommands'), [
      { value: 'run', label: t(language, 'customRun') }, { value: 'add', label: t(language, 'customAdd') },
      { value: 'edit', label: t(language, 'customEdit') }, { value: 'delete', label: t(language, 'customDelete') }, back,
    ]);
    if (action === ':back') return;
    try {
      if (action === 'add') { await commandForm(ctx); continue; }
      const commands = await loadCustomCommands();
      if (!commands.length) { prompts.info(t(language, 'customEmpty')); continue; }
      const choices = commands.map(command => ({ value: command.id, label: command.name,
        hint: `${SHELL_LABELS[command.shell]} · ${command.command}`, searchText: command.command }));
      if (action === 'run') {
        const ids = new Set(await prompts.multiselect(t(language, 'chooseCommands'), choices, { search: true }));
        const selected = commands.filter(command => ids.has(command.id));
        if (!selected.length) continue;
        await runBatch(ctx, selected, async command => {
          const file = await findCommandShell(command.shell, ctx.env);
          if (!file) throw new Error(t(language, 'customShellMissing', { shell: SHELL_LABELS[command.shell] }));
          const result = await runShellCommand(command.shell, file, command.command, ctx.env, cwd);
          if (result.signal === 'SIGINT' || result.signal === 'SIGTERM') throw new ProcessCancelledError(result.signal, result.cleanupError);
          if (result.error) throw new Error(result.error);
          return result.code;
        });
        continue;
      }
      const id = await prompts.select(t(language, action === 'edit' ? 'customEdit' : 'customDelete'), [...choices, back]);
      const command = commands.find(item => item.id === id);
      if (!command) continue;
      if (action === 'edit') await commandForm(ctx, command);
      else if (await prompts.confirm(t(language, 'customConfirmDelete', { name: command.name }))) {
        await deleteCustomCommand(command);
        prompts.info(t(language, 'customDeleted'));
      }
    } catch (error) {
      if (error instanceof CustomCommandsCorruptError) prompts.error(t(language, 'customCorrupt', { path: error.path }));
      else if (error instanceof CustomCommandChangedError) prompts.error(t(language, 'customChanged'));
      else throw error;
    }
  }
}
