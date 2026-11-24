import { PassThrough } from 'node:stream';
import type { ReadStream, WriteStream } from 'node:tty';
import { stripVTControlCharacters } from 'node:util';
import { expect, it } from 'vitest';
import stringWidth from 'string-width';
import { chooseMany } from '../../src/cli/multiselect.js';

function terminal() {
  const input = Object.assign(new PassThrough(), {
    isRaw: false,
    setRawMode(value: boolean) { this.isRaw = value; return this; },
  });
  input.pause();
  const output = Object.assign(new PassThrough(), { columns: 30, rows: 12 });
  let display = '';
  output.on('data', chunk => { display += chunk.toString(); });
  return { input, output, display: () => stripVTControlCharacters(display),
    pick: (search: boolean) => chooseMany('Choose', [
      { value: 'build', label: 'Build 项目', searchText: 'pnpm build' },
      { value: 'blocked', label: 'Blocked', disabled: true },
      { value: 'test', label: 'Run tests', searchText: 'pnpm test' },
    ], 'en', search, input as unknown as ReadStream, output as unknown as WriteStream) };
}

it('handles real key sequences and submits hidden selections in original order', async () => {
  const tty = terminal();
  const result = tty.pick(true);
  tty.input.write('\r');
  tty.input.write('RTEST ');
  expect(tty.display()).toContain('Selected: 1');
  tty.input.write('\x15PBL　');
  expect(tty.display()).toContain('Selected: 2');
  tty.input.write('\r');
  expect(await result).toEqual(['build', 'test']);
  expect(tty.input.isRaw).toBe(false);
  expect(tty.input.isPaused()).toBe(true);
  expect(tty.input.listenerCount('keypress')).toBe(0);
});

it('keeps disabled entries out of the batch and fits a narrow display', async () => {
  const tty = terminal();
  tty.output.columns = 20;
  tty.output.rows = 8;
  const result = tty.pick(true);
  expect(tty.display().split('\n').every(line => stringWidth(line) <= tty.output.columns)).toBe(true);
  expect(tty.display().split('\n').length).toBeLessThan(tty.output.rows);
  tty.input.write('\x1b[B \x1b[B \r');
  expect(await result).toEqual(['test']);
});

it('distinguishes Esc from Ctrl+C and restores raw mode in both cases', async () => {
  const tty = terminal();
  const back = tty.pick(false);
  tty.input.write('\x1b');
  await expect(back).resolves.toBeNull();
  expect(tty.input.isRaw).toBe(false);

  const cancelled = tty.pick(false);
  tty.input.write('\x03');
  await expect(cancelled).rejects.toMatchObject({ code: 130 });
  expect(tty.input.isRaw).toBe(false);
  expect(tty.output.listenerCount('resize')).toBe(0);
});
