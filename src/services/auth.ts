import { apiBaseUrl } from '@/constants/api';
import { createAuthService } from '@/services/api/auth-service';
import { createHttpClient } from '@/services/api/http-client';
import { authTokenStore } from '@/services/auth-token-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountLocalDataKeys } from './account-local-data';

export const apiClient = createHttpClient({ baseUrl: apiBaseUrl });
export const authService = createAuthService(apiClient, authTokenStore, async userId => {
  const keys = accountLocalDataKeys(await AsyncStorage.getAllKeys(), apiBaseUrl, userId);
  if (keys.length) await AsyncStorage.multiRemove(keys);
});
