import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { setToken } from './token';

type ReqConfig = { headers: Record<string, string | undefined> };

// Mismo helper que client.test.ts: accede al primer handler de request
// registrado en el interceptor de axios, sin recurrir a `any`.
function runRequestInterceptor(instance: AxiosInstance, config: ReqConfig): Promise<ReqConfig> {
  const manager = instance.interceptors.request as unknown as {
    handlers: { fulfilled: (c: ReqConfig) => ReqConfig | Promise<ReqConfig> }[];
  };
  return Promise.resolve(manager.handlers[0].fulfilled(config));
}

describe('apiCert client', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });
  afterEach(() => vi.restoreAllMocks());

  it('usa NEXT_PUBLIC_CERT_API_URL o el default de localhost:8000', async () => {
    const { apiCert } = await import('./certificaciones');
    expect(apiCert.defaults.baseURL).toBe('http://localhost:8000');
  });

  it('el interceptor de request adjunta el Bearer cuando hay token', async () => {
    setToken('tok-cert-1');
    const { apiCert } = await import('./certificaciones');
    const config = await runRequestInterceptor(apiCert, { headers: {} });
    expect(config.headers.Authorization).toBe('Bearer tok-cert-1');
  });

  it('sin token, el interceptor no agrega Authorization', async () => {
    const { apiCert } = await import('./certificaciones');
    const config = await runRequestInterceptor(apiCert, { headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });
});
