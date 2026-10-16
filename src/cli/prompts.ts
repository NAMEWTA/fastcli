import { select, confirm, isCancel, log, intro, outro } from '@clack/prompts';

export interface Choice { value: string; label: string; hint?: string }
export interface PromptUI {
  select(message: string, options: Choice[]): Promise<string>;
  confirm(message: string): Promise<boolean>;
  info(message: string): void;
  error(message: string): void;
  intro(message: string): void;
  outro(message: string): void;
}
export class CancelledError extends Error {}

export const terminalPrompts: PromptUI = {
  async select(message, options) {
    const result = await select({ message, options });
    if (isCancel(result)) throw new CancelledError();
    return result;
  },
  async confirm(message) {
    const result = await confirm({ message, initialValue: false });
    if (isCancel(result)) throw new CancelledError();
    return result;
  },
  info: log.info, error: log.error, intro, outro,
};
