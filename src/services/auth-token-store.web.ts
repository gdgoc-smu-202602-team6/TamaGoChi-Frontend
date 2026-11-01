import { authTokenKey } from '@/constants/api';
import type { TokenStore } from '@/types/auth';

export const authTokenStore: TokenStore = {
  async get() { return typeof window === 'undefined' ? null : window.sessionStorage.getItem(authTokenKey); },
  async set(token) { window.sessionStorage.setItem(authTokenKey, token); },
  async remove() { window.sessionStorage.removeItem(authTokenKey); },
};
