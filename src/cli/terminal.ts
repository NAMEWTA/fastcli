import * as clack from "@clack/prompts";
import pc from "picocolors";
import stringWidth from "string-width";
import wrapAnsi from "wrap-ansi";
import { stripVTControlCharacters } from "node:util";

export function terminalColors(stream: { isTTY?: boolean } = process.stdout, env = process.env) {
  return pc.createColors(stream.isTTY === true && !("NO_COLOR" in env) && env.FORCE_COLOR !== "0" && env.TERM !== "dumb");
}

export const color = terminalColors();
// Clack uses the same picocolors instance; apply the stream policy to its own chrome too.
Object.assign(pc, color);
export const terminalWidth = () => Math.max(8, (process.stdout.columns || 80) - 5);

export function wrapTerminalText(text: string, width: number): string {
  return wrapAnsi(text, Math.max(1, width), { hard: true, trim: false, wordWrap: false });
}

export function promptMessage(message: string): string {
  return wrapTerminalText(message, terminalWidth()).replaceAll("\n", `\n${color.gray("│")}  `);
}

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
export function fitTerminalText(text: string, width: number): string {
  const plain = stripVTControlCharacters(text).replace(/\s+/g, " ");
  if (stringWidth(plain) <= width) return plain;
  if (width < 1) return "";
  let result = "", columns = 0;
  for (const { segment } of graphemes.segment(plain)) {
    const size = stringWidth(segment);
    if (columns + size > width - 1) break;
    result += segment;
    columns += size;
  }
  return result + "…";
}

// Reserve the guide, wrapped message, bottom border and a spare terminal row.
export function visibleChoiceCount(count: number, message: string, rows = process.stdout.rows || 24, width = terminalWidth()): number {
  return Math.max(1, Math.min(count, rows - wrapTerminalText(message, width).split("\n").length - 4));
}

export type TerminalChoice = { value: string; label: string; hint?: string; tone?: "selected" | "action" };
export function fitChoices(choices: TerminalChoice[], width = terminalWidth()): TerminalChoice[] {
  return choices.map(choice => {
    const plainLabel = fitTerminalText(choice.label, width - 2);
    const remaining = width - stringWidth(plainLabel) - 5;
    return {
      ...choice,
      label: choice.tone === "selected" ? color.green(plainLabel) : choice.tone === "action" ? color.cyan(plainLabel) : plainLabel,
      hint: remaining >= 8 && choice.hint ? fitTerminalText(choice.hint, remaining) : undefined,
    };
  });
}

export function logMessage(kind: "info" | "success" | "warn" | "error", message: string): void {
  if (!process.stdout.isTTY) { console.error(message); return; }
  clack.log[kind](wrapTerminalText(message, terminalWidth()));
}

export async function withProgress<T>(message: string, work: () => Promise<T>): Promise<T> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return work();
  const spinner = clack.spinner();
  spinner.start(message);
  try { const result = await work(); spinner.stop(message); return result; }
  catch (error) { spinner.stop(message, 1); throw error; }
}
