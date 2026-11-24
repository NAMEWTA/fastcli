import { clearScreenDown, cursorTo, emitKeypressEvents, moveCursor, type Key } from 'node:readline';
import type { ReadStream, WriteStream } from 'node:tty';
import { ProcessCancelledError } from '../core/executor.js';
import { t, type Language } from '../i18n.js';
import type { Choice } from './prompts.js';
import { color, fitTerminalText, wrapTerminalText } from './terminal.js';

/** Filter in place so query changes cannot reorder a batch. */
function matches(text: string, query: string): boolean {
  let start = 0;
  for (const character of query) {
    const index = text.indexOf(character, start);
    if (index === -1) return false;
    start = index + character.length;
  }
  return true;
}

const normalize = (text: string) => text.normalize('NFKC').toLowerCase();

export function chooseMany(message: string, choices: Choice[], language: Language, search: boolean,
  input: ReadStream = process.stdin, output: WriteStream = process.stdout): Promise<string[] | null> {
  const selected = new Set<string>();
  const searchable = choices.map(choice => ({ choice, text: normalize(`${choice.label} ${choice.searchText ?? ''}`) }));
  let visible = choices;
  let query = '', cursor = 0, offset = 0, renderedRows = 0;
  const raw = input.isRaw;
  const flowing = input.readableFlowing;

  function clearFrame() {
    if (!renderedRows) return;
    moveCursor(output, 0, 1 - renderedRows);
    cursorTo(output, 0);
    clearScreenDown(output);
  }

  function render() {
    const width = Math.max(8, (output.columns || 80) - 5);
    const height = Math.max(1, (output.rows || 24) - 1);
    const status = search ? [t(language, 'searchQuery', { query })] : [];
    status.push(t(language, 'selectedCount', { count: selected.size }));
    const hints = search ? [t(language, 'multiselectSearchHelp')] : [];
    hints.unshift(t(language, 'multiselectHelp'));
    const helpLines = wrapTerminalText(hints.join('\n'), width).split('\n');
    const headingLimit = height - 1;
    const helpLimit = headingLimit - status.length - 1;
    const help = helpLines.length <= helpLimit ? helpLines
      : helpLimit > 0 ? [t(language, 'multiselectCompactHelp')] : [];
    const heading = [message, ...help, ...status].slice(Math.max(0, 1 + help.length + status.length - headingLimit))
      .map(line => fitTerminalText(line, width));
    const count = Math.max(1, Math.min(visible.length, height - heading.length));
    offset = Math.max(0, Math.min(offset, visible.length - count, cursor));
    if (cursor >= offset + count) offset = cursor - count + 1;
    const rows = visible.slice(offset, offset + count).map((choice, index) => {
      const indicator = offset + index === cursor ? '› ' : '  ';
      const mark = choice.disabled ? '–' : selected.has(choice.value) ? '■' : '□';
      const description = [choice.label, choice.hint].filter(Boolean).join(' · ');
      const row = `${indicator}${mark} ${fitTerminalText(description, width - 4)}`;
      return choice.disabled ? color.dim(row) : row;
    });
    if (visible.length === 0) rows.push(color.dim(t(language, 'noMatches')));
    const frame = [...heading, ...rows].join('\n');
    clearFrame();
    output.write(frame);
    renderedRows = frame.split('\n').length;
  }

  function filter(next: string) {
    const focused = visible[cursor];
    query = next;
    const normalized = normalize(query);
    visible = searchable.filter(entry => matches(entry.text, normalized)).map(entry => entry.choice);
    cursor = focused ? Math.max(0, visible.indexOf(focused)) : 0;
  }

  return new Promise((resolve, reject) => {
    function finish(result: string[] | null, error?: Error) {
      input.off('keypress', keypress).off('end', cancel).off('error', onError);
      output.off('resize', render);
      process.off('SIGINT', cancel).off('SIGTERM', terminate);
      input.setRawMode(raw);
      if (!flowing) input.pause();
      clearFrame();
      if (error) reject(error);
      else resolve(result);
    }

    const cancel = () => finish(null, new ProcessCancelledError('SIGINT'));
    const terminate = () => finish(null, new ProcessCancelledError('SIGTERM'));
    const onError = (error: Error) => finish(null, error);

    function keypress(character: string | undefined, key: Key) {
      if (key.ctrl && key.name === 'c') return cancel();
      if (key.name === 'escape') return finish(null);
      if (key.name === 'return' || key.name === 'enter') {
        if (selected.size) finish(choices.filter(choice => selected.has(choice.value)).map(choice => choice.value));
        return;
      }
      if (key.name === 'up' && visible.length) cursor = (cursor + visible.length - 1) % visible.length;
      else if (key.name === 'down' && visible.length) cursor = (cursor + 1) % visible.length;
      else if ((key.name === 'space' || character === '　') && !key.ctrl && !key.meta) {
        const focused = visible[cursor];
        if (focused && !focused.disabled && !selected.delete(focused.value)) selected.add(focused.value);
      } else if (search && key.name === 'backspace') filter([...query].slice(0, -1).join(''));
      else if (search && key.ctrl && key.name === 'u') filter('');
      else if (search && character && !key.ctrl && !key.meta && !/\p{Cc}/u.test(character)) filter(query + character);
      else return;
      render();
    }

    emitKeypressEvents(input);
    input.setRawMode(true);
    input.on('keypress', keypress).once('end', cancel).once('error', onError);
    output.on('resize', render);
    process.on('SIGINT', cancel).on('SIGTERM', terminate);
    input.resume();
    render();
  });
}
