import { select, confirm, text, isCancel, intro, outro } from '@clack/prompts';
import { color, fitChoices, logMessage, promptMessage, visibleChoiceCount, withProgress, wrapTerminalText, terminalWidth } from './terminal.js';
import type { Language } from '../i18n.js';
import { chooseMany } from './multiselect.js';

export interface Choice { value: string; label: string; hint?: string; tone?: 'selected' | 'action'; disabled?: boolean; searchText?: string }
export interface PromptUI {
  select(message: string, options: Choice[]): Promise<string>;
  multiselect(message: string, options: Choice[], settings?: { search?: boolean }): Promise<string[] | null>;
  text(message: string, options?: { initialValue?: string; validate?: (value: string) => string | undefined }): Promise<string>;
  confirm(message: string): Promise<boolean>;
  info(message: string): void;
  error(message: string): void;
  intro(message: string): void;
  outro(message: string): void;
  success?(message: string): void;
  warn?(message: string): void;
  progress?<T>(message: string, work: () => Promise<T>): Promise<T>;
  setLanguage?(language: Language): void;
}
export class CancelledError extends Error {}

export function createTerminalPrompts(language: Language = 'en'): PromptUI { return {
  setLanguage(value) { language = value; },
  async select(message, options) {
    const help = language === 'zh-CN' ? '↑↓ 移动 · Enter 选择 · Esc 取消' : '↑↓ Move · Enter Select · Esc Cancel';
    const body = `${message}\n${color.dim(help)}`;
    const result = await select({ message: promptMessage(body), options: fitChoices(options), maxItems: visibleChoiceCount(options.length, body) });
    if (isCancel(result)) throw new CancelledError();
    return result;
  },
  multiselect(message, options, settings) {
    return chooseMany(message, options, language, settings?.search ?? false);
  },
  async text(message, options) {
    const result = await text({ message: promptMessage(message), ...options });
    if (isCancel(result)) throw new CancelledError();
    return result;
  },
  async confirm(message) {
    const result = await confirm({ message: promptMessage(message), initialValue: false,
      active: language === 'zh-CN' ? '确认' : 'Yes', inactive: language === 'zh-CN' ? '取消' : 'No' });
    if (isCancel(result)) throw new CancelledError();
    return result;
  },
  info: message => logMessage('info', message), error: message => logMessage('error', message),
  success: message => logMessage('success', message), warn: message => logMessage('warn', message),
  intro: message => intro(color.bold(color.cyan(message))),
  outro: message => outro(wrapTerminalText(color.dim(message), terminalWidth())),
  progress: withProgress,
}; }
export const terminalPrompts = createTerminalPrompts();
