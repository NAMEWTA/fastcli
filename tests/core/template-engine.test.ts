import { describe, it, expect } from 'vitest';
import { parseTemplate } from '../../src/core/template-engine.js';

describe('TemplateEngine', () => {
  describe('parseTemplate', () => {
    it('应该替换单个变量', () => {
      const result = parseTemplate('git add {{path}}', { path: 'src/' });
      expect(result).toBe('git add src/');
    });

    it('应该替换多个变量', () => {
      const result = parseTemplate(
        'git commit -m "{{type}}: {{message}}"',
        { type: 'feat', message: 'add feature' }
      );
      expect(result).toBe('git commit -m "feat: add feature"');
    });

    it('应该处理没有变量的模板', () => {
      const result = parseTemplate('git push', {});
      expect(result).toBe('git push');
    });

    it('应该处理缺失的变量（保留原样）', () => {
      const result = parseTemplate('git add {{path}}', {});
      expect(result).toBe('git add {{path}}');
    });

    it('应该处理带连字符的变量名', () => {
      const result = parseTemplate('{{select-account}}', { 'select-account': 'user1' });
      expect(result).toBe('user1');
    });
  });
});
