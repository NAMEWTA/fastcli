import { describe, it, expect } from 'vitest';
import {
  findStepById,
  buildFinalCommand,
  calculateTotalSteps,
  decideFinalCommand,
  resolveCredentialId,
} from '../../src/core/workflow-runner.js';
import type { Workflow } from '../../src/types/index.js';

const mockWorkflow: Workflow = {
  description: '测试工作流',
  steps: [
    {
      id: 'step1',
      prompt: '步骤1',
      options: [
        { name: '选项A', value: 'a', next: 'step2' },
        { name: '选项B', value: 'b', command: 'echo b' },
      ],
    },
    {
      id: 'step2',
      prompt: '步骤2',
      options: [{ name: '完成', command: 'echo {{step1}}' }],
    },
  ],
};

describe('WorkflowRunner', () => {
  describe('findStepById', () => {
    it('应该找到存在的步骤', () => {
      const step = findStepById(mockWorkflow, 'step1');
      expect(step?.prompt).toBe('步骤1');
    });

    it('应该对不存在的步骤返回 undefined', () => {
      const step = findStepById(mockWorkflow, 'nonexistent');
      expect(step).toBeUndefined();
    });
  });

  describe('buildFinalCommand', () => {
    it('应该替换变量', () => {
      const cmd = buildFinalCommand('echo {{step1}}', { step1: 'hello' });
      expect(cmd).toBe('echo hello');
    });
  });

  describe('calculateTotalSteps', () => {
    it('应该计算最短路径长度', () => {
      const total = calculateTotalSteps(mockWorkflow, 'step1');
      expect(total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('decideFinalCommand', () => {
    it('option.command 存在时应优先使用 option.command', () => {
      const result = decideFinalCommand('echo hi', 'codex --resume');
      expect(result).toBe('echo hi');
    });

    it('option.command 不存在时应回退到 provider command', () => {
      const result = decideFinalCommand(undefined, 'codex --resume');
      expect(result).toBe('codex --resume');
    });
  });

  describe('resolveCredentialId', () => {
    it('应优先使用 option.value 作为 credentialId', () => {
      expect(resolveCredentialId('work', { 'select-account': 'prod' })).toBe('work');
    });

    it('option.value 缺失时应回退到 select-account', () => {
      expect(resolveCredentialId(undefined, { 'select-account': 'prod' })).toBe('prod');
    });
  });
});
