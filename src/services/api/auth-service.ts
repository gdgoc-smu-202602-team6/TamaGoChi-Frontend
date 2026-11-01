import type { AuthService, AuthUser, TokenStore } from '../../types/auth';
import { ApiError, type HttpClient } from './http-client';

function parseUser(data: unknown): AuthUser {
  if (!data || typeof data !== 'object') throw new ApiError('response');
  const user = data as Record<string, unknown>;
  if (typeof user.id !== 'string' || !user.id || typeof user.email !== 'string' || typeof user.nickname !== 'string') throw new ApiError('response');
  return { id: user.id, email: user.email, nickname: user.nickname };
}

export function createAuthService(client: HttpClient, tokens: TokenStore): AuthService {
  // Serialize session writes and restore so a delayed restore cannot resurrect a signed-out session.
  let tail: Promise<unknown> = Promise.resolve();
  function sessionOperation<T>(work: () => Promise<T>): Promise<T> {
    const operation = tail.then(work, work);
    tail = operation.catch(() => undefined);
    return operation;
  }
  async function storage<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); } catch { throw new ApiError('storage'); }
  }
  async function me(token: string) {
    return parseUser((await client.request<unknown>('/users/me', { token })).data);
  }
  return {
    getToken: () => sessionOperation(() => storage(() => tokens.get())),
    restore: () => sessionOperation(async () => {
      const token = await storage(() => tokens.get());
      if (!token) return null;
      try { return await me(token); }
      catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await storage(() => tokens.remove());
          return null;
        }
        // Offline, server, and malformed-response errors preserve the token for retry.
        throw error;
      }
    }),
    signIn: (email, password) => sessionOperation(async () => {
      let response;
      try { response = await client.request<unknown>('/auth/sign-in/email', { method: 'POST', body: { email: email.trim(), password } }); }
      catch (error) {
        if (error instanceof ApiError && error.status === 401) throw new ApiError('http', 401, 'INVALID_EMAIL_OR_PASSWORD');
        throw error;
      }
      const token = response.headers.get('set-auth-token');
      if (!token?.trim()) throw new ApiError('response');
      const user = await me(token);
      await storage(() => tokens.set(token));
      return user;
    }),
    signOut: () => sessionOperation(async () => {
      const token = await storage(() => tokens.get());
      if (token) {
        try { await client.request('/auth/sign-out', { method: 'POST', token, body: {} }); }
        catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
      }
      await storage(() => tokens.remove());
    }),
    async signUp({ nickname, email, password }) {
      await client.request('/auth/sign-up/email', { method: 'POST', body: { name: nickname.trim(), email: email.trim(), password } });
      // Verification is mandatory: signup success never creates a local authenticated session.
    },
    async sendVerification(email) {
      await client.request('/auth/send-verification-email', { method: 'POST', body: { email: email.trim() } });
    },
    async requestPasswordReset(email, redirectTo) {
      if (!redirectTo) throw new ApiError('config');
      await client.request('/auth/request-password-reset', { method: 'POST', body: { email: email.trim(), redirectTo } });
    },
    async resetPassword(token, newPassword) {
      if (!token) throw new ApiError('config');
      await client.request('/auth/reset-password', { method: 'POST', body: { token, newPassword } });
    },
  };
}
