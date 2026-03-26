import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWebSessionManager } from '../../../src/core/web/token-session.js';

afterEach(() => {
  vi.useRealTimers();
});

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

  it('should expire one-time token after ttl', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const manager = createWebSessionManager({ tokenTtlMs: 5 * 60 * 1000 });
    const token = manager.issueOneTimeToken();

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    const result = manager.verifyOneTimeToken(token);
    expect(result.ok).toBe(false);
  });

  it('should expire session after ttl', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const manager = createWebSessionManager({ sessionTtlMs: 30 * 60 * 1000 });
    const token = manager.issueOneTimeToken();
    const result = manager.verifyOneTimeToken(token);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(manager.isSessionValid(result.sessionId)).toBe(true);

    vi.advanceTimersByTime(30 * 60 * 1000 + 1);

    expect(manager.isSessionValid(result.sessionId)).toBe(false);
  });
});
