import { randomBytes, randomInt } from 'node:crypto';
import type {
  OneTimeTokenVerifyResult,
  WebSessionManager,
  WebSessionManagerOptions,
} from './types.js';

const TOKEN_LENGTH = 16;
const SESSION_ID_LENGTH = 24;
const TOKEN_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_TOKEN_TTL_MS = 5 * 60 * 1000;
const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1000;

function validateTtlOption(name: string, value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a finite positive integer`);
  }
  return value;
}

function generateToken(): string {
  let token = '';
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    const index = randomInt(0, TOKEN_CHARSET.length);
    token += TOKEN_CHARSET[index];
  }
  return token;
}

function generateSessionId(): string {
  // 12 bytes => 24 hex chars.
  return randomBytes(12).toString('hex').slice(0, SESSION_ID_LENGTH);
}

class InMemoryWebSessionManager implements WebSessionManager {
  private readonly activeTokens = new Map<string, number>();
  private readonly activeSessions = new Map<string, number>();

  constructor(
    private readonly tokenTtlMs: number,
    private readonly sessionTtlMs: number,
  ) {}

  private cleanupExpiredTokens(now: number): void {
    for (const [token, expiresAt] of this.activeTokens) {
      if (expiresAt <= now) {
        this.activeTokens.delete(token);
      }
    }
  }

  private cleanupExpiredSessions(now: number): void {
    for (const [sessionId, expiresAt] of this.activeSessions) {
      if (expiresAt <= now) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  issueOneTimeToken(): string {
    const now = Date.now();
    this.cleanupExpiredTokens(now);

    let token = generateToken();
    while (this.activeTokens.has(token)) {
      token = generateToken();
    }

    this.activeTokens.set(token, now + this.tokenTtlMs);
    return token;
  }

  verifyOneTimeToken(token: string): OneTimeTokenVerifyResult {
    const now = Date.now();
    this.cleanupExpiredTokens(now);
    this.cleanupExpiredSessions(now);

    const tokenExpiresAt = this.activeTokens.get(token);
    if (!tokenExpiresAt || tokenExpiresAt <= now) {
      this.activeTokens.delete(token);
      return { ok: false, reason: 'invalid_token' };
    }

    // Token is one-time use and becomes invalid immediately after successful verification.
    this.activeTokens.delete(token);

    let sessionId = generateSessionId();
    while (this.activeSessions.has(sessionId)) {
      sessionId = generateSessionId();
    }
    this.activeSessions.set(sessionId, now + this.sessionTtlMs);

    return { ok: true, sessionId };
  }

  isSessionValid(sessionId: string | undefined): boolean {
    const now = Date.now();
    this.cleanupExpiredSessions(now);

    if (!sessionId) {
      return false;
    }

    const expiresAt = this.activeSessions.get(sessionId);
    if (!expiresAt || expiresAt <= now) {
      this.activeSessions.delete(sessionId);
      return false;
    }
    return true;
  }
}

export function createWebSessionManager(options?: WebSessionManagerOptions): WebSessionManager {
  const tokenTtlMs =
    options?.tokenTtlMs === undefined
      ? DEFAULT_TOKEN_TTL_MS
      : validateTtlOption('tokenTtlMs', options.tokenTtlMs);
  const sessionTtlMs =
    options?.sessionTtlMs === undefined
      ? DEFAULT_SESSION_TTL_MS
      : validateTtlOption('sessionTtlMs', options.sessionTtlMs);

  return new InMemoryWebSessionManager(
    tokenTtlMs,
    sessionTtlMs,
  );
}
