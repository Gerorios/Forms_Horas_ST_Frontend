import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { AxiosInstance } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
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

// El backend de ninguno de los dos endpoints filtra por período (devuelve el
// histórico/últimas ~200 filas completo) — el filtro por período seleccionado
// se hace client-side vía `select` en el hook. Estos tests verifican que,
// con filas de 2 períodos distintos, solo quedan las del período pedido.
function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('filtrado client-side por período', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });
  afterEach(() => vi.restoreAllMocks());

  it('useResumenCert: filas de 2 períodos → solo quedan las del período seleccionado', async () => {
    const { apiCert, useResumenCert } = await import('./certificaciones');
    vi.spyOn(apiCert, 'get').mockResolvedValue({
      data: [
        { periodo: '2026-07', contrato: 'K5', tipo: 'obra', lineas: 3, monto_total: 100 },
        { periodo: '2026-08', contrato: 'K6', tipo: 'obra', lineas: 2, monto_total: 200 },
        { periodo: '2026-08', contrato: 'K7', tipo: 'obra', lineas: 5, monto_total: 300 },
      ],
    });

    const { result } = renderHook(() => useResumenCert('2026-08'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.every((f) => f.periodo === '2026-08')).toBe(true);
  });

  it('useEstadoCargas: filas de 2 períodos → los KPIs de cargados/faltantes solo cuentan el período seleccionado', async () => {
    const { apiCert, useEstadoCargas } = await import('./certificaciones');
    vi.spyOn(apiCert, 'get').mockResolvedValue({
      data: [
        { contrato: 'K5', periodo: '2026-07', cargado: true, usuario: 'ana', cargado_en: '2026-07-05', filas_cargadas: 10, estado: 'ok' },
        { contrato: 'K6', periodo: '2026-08', cargado: true, usuario: 'ana', cargado_en: '2026-08-05', filas_cargadas: 8, estado: 'ok' },
        { contrato: 'K7', periodo: '2026-08', cargado: false, usuario: null, cargado_en: null, filas_cargadas: 0, estado: 'pendiente' },
      ],
    });

    const { result } = renderHook(() => useEstadoCargas('2026-08'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.filter((c) => c.cargado)).toHaveLength(1);
    expect(result.current.data?.filter((c) => !c.cargado)).toHaveLength(1);
  });
});
