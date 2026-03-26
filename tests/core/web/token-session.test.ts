import { describe, expect, it } from 'vitest';
import { createWebSessionManager } from '../../../src/core/web/token-session.js';

describe('WebTokenSession', () => {
  it('should issue token with expected length and charset rule', () => {
    const manager = createWebSessionManager();

    const token = manager.issueOneTimeToken();

    expect(token).toHaveLength(16);
    expect(token).toMatch(/^[A-Z2-9]+$/);
  });

  it('should verify token once and create valid session', () => {
    const manager = createWebSessionManager();
    const token = manager.issueOneTimeToken();

    const result = manager.verifyOneTimeToken(token);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.sessionId).toHaveLength(24);
    expect(manager.isSessionValid(result.sessionId)).toBe(true);
  });

  it('should not allow reusing the same token', () => {
    const manager = createWebSessionManager();
    const token = manager.issueOneTimeToken();

    const first = manager.verifyOneTimeToken(token);
    const second = manager.verifyOneTimeToken(token);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
  });

  it('should fail for invalid token', () => {
    const manager = createWebSessionManager();

    const result = manager.verifyOneTimeToken('INVALIDTOKEN1234');

    expect(result.ok).toBe(false);
  });
});
