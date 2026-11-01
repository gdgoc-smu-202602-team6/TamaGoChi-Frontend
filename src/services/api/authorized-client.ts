import { ApiError, type HttpClient } from './http-client';

export function createAuthorizedClient(client: HttpClient, options: {
  getToken: () => Promise<string | null>;
  isCurrent: () => boolean;
  onUnauthorized: () => void;
}): HttpClient {
  const check = () => { if (!options.isCurrent()) throw new ApiError('session'); };
  return {
    async request<T>(path: string, input?: Parameters<HttpClient['request']>[1]) {
      check();
      let token: string | null;
      try { token = await options.getToken(); } catch { throw new ApiError('storage'); }
      check();
      try {
        if (!token) throw new ApiError('http', 401);
        const response = await client.request<T>(path, { ...input, token });
        check();
        return response;
      } catch (error) {
        if (options.isCurrent() && error instanceof ApiError && error.status === 401) options.onUnauthorized();
        throw error;
      }
    },
  };
}
