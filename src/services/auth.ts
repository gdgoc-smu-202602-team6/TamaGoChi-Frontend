import { apiBaseUrl } from '@/constants/api';
import { createAuthService } from '@/services/api/auth-service';
import { createHttpClient } from '@/services/api/http-client';
import { authTokenStore } from '@/services/auth-token-store';

export const apiClient = createHttpClient({ baseUrl: apiBaseUrl });
export const authService = createAuthService(apiClient, authTokenStore);
