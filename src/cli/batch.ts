import { ProcessCancelledError } from '../core/executor.js';
import { t } from '../i18n.js';
import type { CliContext } from './actions.js';
import { CancelledError } from './prompts.js';

export async function runBatch<Item extends { name: string }>(ctx: CliContext, items: readonly Item[],
  execute: (item: Item) => Promise<number>): Promise<void> {
  let succeeded = 0;
  for (const [index, item] of items.entries()) {
    ctx.prompts.info(t(ctx.language, 'batchItem', { current: index + 1, total: items.length, name: item.name }));
    try {
      const code = await execute(item);
      if (code === 130 || code === 143) throw new ProcessCancelledError(code === 130 ? 'SIGINT' : 'SIGTERM');
      if (code === 0) succeeded++;
      else ctx.prompts.error(t(ctx.language, 'batchError', { name: item.name, reason: code }));
    } catch (error) {
      if (error instanceof CancelledError || error instanceof ProcessCancelledError) throw error;
      const reason = error instanceof Error ? error.message : String(error);
      ctx.prompts.error(t(ctx.language, 'batchError', { name: item.name, reason }));
    }
  }
  ctx.prompts.info(t(ctx.language, 'batchSummary', { succeeded, failed: items.length - succeeded }));
}
