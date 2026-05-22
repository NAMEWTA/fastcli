import { describe, it, expect } from 'vitest';

/**
 * Smoke 测试：确保 vitest 在重构早期阶段不会因「无测试文件」而报错。
 * 后续父任务会逐步用真实测试取代 / 扩展该文件。
 */
describe('smoke', () => {
  it('runs vitest', () => {
    expect(1).toBe(1);
  });
});
