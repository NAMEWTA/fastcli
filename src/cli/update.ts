import { color } from './terminal.js';
import { join } from 'node:path';
import { getConfigDir } from '../config/paths.js';
import { atomicWriteJson } from '../config/atomic.js';
import { offerUpdate, type UpdateChoice } from '../core/update-flow.js';
import { inspectSelfInstall } from '../core/self-update.js';
import type { CliContext } from './actions.js';

export function startupUpdate(ctx: CliContext, version: string, packageRoot: string, argv: string[]): Promise<number | undefined> {
  return offerUpdate({
    name: '@namewta/fastcli', local: version, prefix: 'FASTCLI', language: ctx.language, env: ctx.env,
    statePath: join(getConfigDir(), 'update-state.json'), writeState: atomicWriteJson,
    inspect: () => inspectSelfInstall({ name: '@namewta/fastcli', executable: 'fastcli', packageRoot, argv, env: ctx.env }),
    ui: {
      choose: async (message, choices) => {
        const [heading, ...command] = message.split('\n');
        return await ctx.prompts.select(`${color.bold(color.yellow(heading!))}\n${color.cyan(command.join('\n'))}`,
          choices.map(choice => ({ ...choice, tone: choice.value === 'update' ? 'action' : undefined }))) as UpdateChoice;
      },
      message(kind, message) { (ctx.prompts[kind] ?? ctx.prompts.info)(message); },
    },
  });
}
