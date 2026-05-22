import { describe, expect, it } from 'vitest';

import { normalizeLanguage, t } from '../src/i18n.js';

describe('i18n', () => {
  it('defaults invalid or missing language to English', () => {
    expect(normalizeLanguage(undefined)).toBe('en');
    expect(normalizeLanguage('fr')).toBe('en');
    expect(normalizeLanguage('en')).toBe('en');
    expect(normalizeLanguage('zh-CN')).toBe('zh-CN');
  });

  it('interpolates parameters', () => {
    expect(t('cli.notFound.tool', { toolId: 'clade' })).toBe(
      'Tool "clade" not found',
    );
  });

  it('uses Chinese dictionary when requested', () => {
    expect(t('cli.notFound.tool', { toolId: 'clade' }, 'zh-CN')).toBe(
      '找不到工具 "clade"',
    );
  });

  it('falls back to the key for unknown messages', () => {
    expect(t('missing.key')).toBe('missing.key');
  });
});
