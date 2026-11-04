import { AccountDeletionError, type AccountDeletionIdentity, type AuthService, type AuthUser, type TokenStore } from '../../types/auth';
import { ApiError, type HttpClient } from './http-client';

function parseUser(data: unknown): AuthUser {
  if (!data || typeof data !== 'object') throw new ApiError('response');
  const user = data as Record<string, unknown>;
  if (typeof user.id !== 'string' || !user.id || typeof user.email !== 'string' || typeof user.nickname !== 'string') throw new ApiError('response');
  return { id: user.id, email: user.email, nickname: user.nickname };
}

export function createAuthService(client: HttpClient, tokens: TokenStore, cleanupAccount: (userId: string) => Promise<void> = async () => {}): AuthService {
  // Serialize session writes and restore so a delayed restore cannot resurrect a signed-out session.
  let tail: Promise<unknown> = Promise.resolve();
  let deletion: (AccountDeletionIdentity & { confirmed: boolean }) | null = null;
  let completedDeletion: AccountDeletionIdentity | null = null;
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
  function sameDeletion(expected: AccountDeletionIdentity) { return deletion?.userId === expected.userId && deletion.token === expected.token; }
  async function finishDeletion() {
    if (!deletion?.confirmed) throw new AccountDeletionError('uncertain');
    try {
      const token = await storage(() => tokens.get());
      if (token && token !== deletion.token) throw new AccountDeletionError('changed');
      await cleanupAccount(deletion.userId);
      if (token) await storage(() => tokens.remove());
      completedDeletion = { userId: deletion.userId, token: deletion.token }; deletion = null;
    } catch (error) { if (error instanceof AccountDeletionError) throw error; throw new AccountDeletionError('cleanup'); }
  }
  return {
    getToken: () => sessionOperation(() => storage(() => tokens.get())),
    restore: () => sessionOperation(async () => {
      if (deletion?.confirmed) { await finishDeletion(); return null; }
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
      deletion = null; completedDeletion = null;
      return user;
    }),
    signOut: () => sessionOperation(async () => {
      const token = await storage(() => tokens.get());
      if (token) {
        try { await client.request('/auth/sign-out', { method: 'POST', token, body: {} }); }
        catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
      }
      await storage(() => tokens.remove());
      deletion = null; completedDeletion = null;
    }),
    deleteAccount: expected => sessionOperation(async () => {
      if (completedDeletion?.userId === expected.userId && completedDeletion.token === expected.token && !await storage(() => tokens.get())) return;
      if (deletion) {
        if (!sameDeletion(expected)) throw new AccountDeletionError('changed');
        if (deletion.confirmed) return finishDeletion();
        throw new AccountDeletionError('uncertain');
      }
      if (!expected.userId || !expected.token || await storage(() => tokens.get()) !== expected.token) throw new AccountDeletionError('changed');
      if ((await me(expected.token)).id !== expected.userId) throw new AccountDeletionError('changed');
      deletion = { ...expected, confirmed: false };
      try {
        const response = await client.request('/users/me', { method: 'DELETE', token: expected.token });
        if (response.status !== 204) throw new ApiError('response');
        deletion.confirmed = true;
      } catch (error) {
        if (error instanceof ApiError && error.kind === 'http' && !!error.status && error.status < 500 && error.status !== 408) { deletion = null; throw error; }
        throw new AccountDeletionError('uncertain');
      }
      await finishDeletion();
    }),
    checkAccountDeletion: expected => sessionOperation(async () => {
      if (completedDeletion?.userId === expected.userId && completedDeletion.token === expected.token && !await storage(() => tokens.get())) return { status: 'deleted' };
      if (!sameDeletion(expected)) throw new AccountDeletionError('changed');
      if (deletion!.confirmed) { await finishDeletion(); return { status: 'deleted' }; }
      const token = await storage(() => tokens.get());
      if (token && token !== expected.token) throw new AccountDeletionError('changed');
      if (!token) return { status: 'unavailable' };
      try {
        const user = await me(expected.token);
        if (user.id !== expected.userId) throw new AccountDeletionError('changed');
        deletion = null;
        return { status: 'present', user };
      } catch (error) {
        if (error instanceof ApiError && [401, 404].includes(error.status ?? 0)) {
          // A revoked/expired session alone cannot prove account deletion.
          await storage(() => tokens.remove());
          return { status: 'unavailable' };
        }
        if (error instanceof AccountDeletionError) throw error;
        throw new AccountDeletionError('uncertain');
      }
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
