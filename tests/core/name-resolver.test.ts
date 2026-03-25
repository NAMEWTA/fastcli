import { describe, it, expect } from 'vitest';
import { resolveName, isNameAvailable } from '../../src/core/name-resolver.js';
import type { Config } from '../../src/types/index.js';

const mockConfig: Config = {
  aliases: {
    gp: { command: 'git push' },
  },
  workflows: {
    deploy: {
      steps: [
        { id: 'env', prompt: '选择环境', options: [{ name: 'prod', command: 'deploy prod' }] },
      ],
    },
  },
};

describe('NameResolver', () => {
  describe('resolveName', () => {
    it('应该解析别名', () => {
      const result = resolveName('gp', mockConfig);
      expect(result?.type).toBe('alias');
      expect(result?.data.command).toBe('git push');
    });

    it('应该解析工作流', () => {
      const result = resolveName('deploy', mockConfig);
      expect(result?.type).toBe('workflow');
    });

    it('应该对不存在的名称返回 null', () => {
      const result = resolveName('unknown', mockConfig);
      expect(result).toBeNull();
    });
  });

  describe('isNameAvailable', () => {
    it('应该检测已使用的名称', () => {
      expect(isNameAvailable('gp', mockConfig)).toBe(false);
      expect(isNameAvailable('deploy', mockConfig)).toBe(false);
    });

    it('应该检测可用的名称', () => {
      expect(isNameAvailable('newname', mockConfig)).toBe(true);
    });
  });
});
