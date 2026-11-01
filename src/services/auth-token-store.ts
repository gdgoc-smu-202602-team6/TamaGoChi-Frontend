import * as SecureStore from 'expo-secure-store';

import { authTokenKey } from '@/constants/api';
import type { TokenStore } from '@/types/auth';

export const authTokenStore: TokenStore = {
  get: () => SecureStore.getItemAsync(authTokenKey),
  set: (token) => SecureStore.setItemAsync(authTokenKey, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  remove: () => SecureStore.deleteItemAsync(authTokenKey),
};
