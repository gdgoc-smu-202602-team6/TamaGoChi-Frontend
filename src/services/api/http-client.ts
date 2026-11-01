export class ApiError extends Error {
  constructor(
    readonly kind: 'http' | 'network' | 'timeout' | 'response' | 'storage' | 'config',
    readonly status?: number,
    readonly code?: string,
  ) {
    // Never include response bodies, credentials, URLs with reset tokens, or authorization headers.
    super(`API ${kind}${status ? ` (${status})` : ''}`);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
};

export type HttpClient = {
  request: <T>(path: string, options?: RequestOptions) => Promise<{ data: T; headers: Headers }>;
};

function errorCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return;
  const record = data as Record<string, unknown>;
  if (typeof record.code === 'string') return record.code;
  if (typeof record.type === 'string') return record.type.split('/').at(-1);
}

export function createHttpClient({ baseUrl, fetcher = fetch, timeoutMs = 15000 }: {
  baseUrl: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}): HttpClient {
  return {
    async request<T>(path: string, options: RequestOptions = {}) {
      let base: URL;
      try {
        base = new URL(baseUrl);
        if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || !path.startsWith('/') || path.startsWith('//')) throw new Error();
      } catch { throw new ApiError('config'); }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const headers = new Headers({ Accept: 'application/json, application/problem+json' });
        if (options.body !== undefined) headers.set('Content-Type', 'application/json');
        if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
        const response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
          method: options.method ?? 'GET', headers,
          ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
          signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error',
        });
        let data: unknown;
        if (response.status !== 204) {
          try { data = await response.json(); }
          catch { if (response.ok) throw new ApiError('response'); }
        }
        if (!response.ok) throw new ApiError('http', response.status, errorCode(data));
        return { data: data as T, headers: response.headers };
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(controller.signal.aborted ? 'timeout' : 'network');
      } finally { clearTimeout(timeout); }
    },
  };
}

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return '요청을 완료하지 못했어요. 다시 시도해 주세요.';
  if (error.kind === 'network' || error.kind === 'timeout') return '서버에 연결하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.';
  if (error.kind === 'storage') return '로그인 정보를 저장하거나 지우지 못했어요. 다시 시도해 주세요.';
  if (error.kind === 'config') return '지금은 연결을 준비하고 있어요. 잠시 후 다시 시도해 주세요.';
  if (error.code === 'EMAIL_NOT_VERIFIED') return '이메일 인증 후 로그인해 주세요.';
  if (error.code === 'INVALID_EMAIL_OR_PASSWORD') return '이메일 또는 비밀번호를 확인해 주세요.';
  if (error.code === 'INVALID_TOKEN' || error.code === 'TOKEN_EXPIRED') return '링크가 만료되었거나 올바르지 않아요. 새 링크를 요청해 주세요.';
  if (error.code === 'INVALID_ORIGIN' || error.code === 'INVALID_REDIRECT_URL' || error.code === 'INVALID_CALLBACK_URL') return '이 기기의 로그인 연결을 준비하고 있어요. 잠시 후 다시 시도해 주세요.';
  if (error.status === 429) return '요청이 많아요. 잠시 기다린 뒤 다시 시도해 주세요.';
  if (error.status === 401) return '로그인이 만료되었어요. 다시 로그인해 주세요.';
  if (error.status === 400 || error.status === 422) return '입력 내용을 확인하고 다시 시도해 주세요.';
  return '요청을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.';
}
