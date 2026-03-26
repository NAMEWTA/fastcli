export type OneTimeTokenVerifyResult =
  | { ok: true; sessionId: string }
  | { ok: false; reason: string };

export interface WebSessionManager {
  issueOneTimeToken(): string;
  verifyOneTimeToken(token: string): OneTimeTokenVerifyResult;
  isSessionValid(sessionId: string | undefined): boolean;
}
