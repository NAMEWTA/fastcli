import { randomBytes, randomInt } from 'node:crypto';
import type { OneTimeTokenVerifyResult, WebSessionManager } from './types.js';

const TOKEN_LENGTH = 16;
const SESSION_ID_LENGTH = 24;
const TOKEN_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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
  private readonly activeTokens = new Set<string>();
  private readonly activeSessions = new Set<string>();

  issueOneTimeToken(): string {
    let token = generateToken();
    while (this.activeTokens.has(token)) {
      token = generateToken();
    }

    this.activeTokens.add(token);
    return token;
  }

  verifyOneTimeToken(token: string): OneTimeTokenVerifyResult {
    if (!this.activeTokens.has(token)) {
      return { ok: false, reason: 'invalid_token' };
    }

    // Token is one-time use and becomes invalid immediately after successful verification.
    this.activeTokens.delete(token);

    let sessionId = generateSessionId();
    while (this.activeSessions.has(sessionId)) {
      sessionId = generateSessionId();
    }
    this.activeSessions.add(sessionId);

    return { ok: true, sessionId };
  }

  isSessionValid(sessionId: string | undefined): boolean {
    if (!sessionId) {
      return false;
    }
    return this.activeSessions.has(sessionId);
  }
}

export function createWebSessionManager(): WebSessionManager {
  return new InMemoryWebSessionManager();
}
