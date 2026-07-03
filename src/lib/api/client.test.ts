import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { getToken, setToken, clearToken } from './token';

type ReqConfig = { headers: Record<string, string | undefined> };

// Accede al primer handler de request registrado en el interceptor de axios
// (internamente `interceptors.request.handlers`), sin recurrir a `any`.
function runRequestInterceptor(api: AxiosInstance, config: ReqConfig): Promise<ReqConfig> {
  const manager = api.interceptors.request as unknown as {
    handlers: { fulfilled: (c: ReqConfig) => ReqConfig | Promise<ReqConfig> }[];
  };
  return Promise.resolve(manager.handlers[0].fulfilled(config));
}

describe('token storage', () => {
  beforeEach(() => window.localStorage.clear());

  it('setToken y getToken hacen round-trip', () => {
    setToken('abc123');
    expect(getToken()).toBe('abc123');
  });

  it('clearToken borra el token', () => {
    setToken('abc123');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('api client interceptors', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });
  afterEach(() => vi.restoreAllMocks());

  it('el interceptor de request adjunta el Bearer cuando hay token', async () => {
    setToken('tok-999');
    const { api } = await import('./client');
    const config = await runRequestInterceptor(api, { headers: {} });
    expect(config.headers.Authorization).toBe('Bearer tok-999');
  });

  it('sin token, el interceptor no agrega Authorization', async () => {
    const { api } = await import('./client');
    const config = await runRequestInterceptor(api, { headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });
});
