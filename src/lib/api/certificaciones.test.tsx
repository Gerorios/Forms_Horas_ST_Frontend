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

// FastAPI espera `contratos=A&contratos=B` (claves repetidas, sin corchetes)
// para `List[str] = Query(default=[])` — el serializer de arrays por defecto
// de axios emite `contratos[]=A&...`, que FastAPI no bindea. Estos tests
// verifican que los hooks de Task 7 arman los query params a mano.
describe('hooks de /analytics/* (Task 7): serialización de filtros', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });
  afterEach(() => vi.restoreAllMocks());

  it('useEvolucionMensual: contratos/provincias van como claves repetidas sin corchetes', async () => {
    const { apiCert, useEvolucionMensual } = await import('./certificaciones');
    const spy = vi.spyOn(apiCert, 'get').mockResolvedValue({ data: [] });

    const { result } = renderHook(
      () =>
        useEvolucionMensual({
          contratos: ['K5', 'K6'],
          provincias: ['Salta'],
          tipo: 'OPEX',
          desde: '2026-01',
          hasta: '2026-08',
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data).toBeDefined());

    const [url, config] = spy.mock.calls[0];
    expect(url).toBe('/analytics/evolucion-mensual');
    const params = config?.params as URLSearchParams;
    expect(params.toString()).toBe(
      'contratos=K5&contratos=K6&provincias=Salta&tipo=OPEX&desde=2026-01&hasta=2026-08',
    );
  });

  it('useInteranual: el endpoint no acepta desde/hasta — no se mandan aunque vengan en filtros', async () => {
    const { apiCert, useInteranual } = await import('./certificaciones');
    const spy = vi.spyOn(apiCert, 'get').mockResolvedValue({
      data: { anio_actual: 2026, anio_anterior: 2025, meses: [] },
    });

    const { result } = renderHook(
      () =>
        useInteranual({
          contratos: ['K5'],
          tipo: 'OPEX',
          desde: '2026-01',
          hasta: '2026-08',
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data).toBeDefined());

    const [url, config] = spy.mock.calls[0];
    expect(url).toBe('/analytics/interanual');
    const params = config?.params as URLSearchParams;
    expect(params.toString()).toBe('contratos=K5&tipo=OPEX');
    expect(params.has('desde')).toBe(false);
    expect(params.has('hasta')).toBe(false);
  });

  it('useTopItems: sin filtros, no manda query params vacíos', async () => {
    const { apiCert, useTopItems } = await import('./certificaciones');
    const spy = vi.spyOn(apiCert, 'get').mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useTopItems({}), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const [, config] = spy.mock.calls[0];
    const params = config?.params as URLSearchParams;
    expect(params.toString()).toBe('');
  });

  it('useEstadoCargasCompleto: trae el histórico completo sin filtrar por período', async () => {
    const { apiCert, useEstadoCargasCompleto } = await import('./certificaciones');
    vi.spyOn(apiCert, 'get').mockResolvedValue({
      data: [
        { contrato: 'K5', periodo: '2026-07', cargado: true, usuario: 'ana', cargado_en: '2026-07-05', filas_cargadas: 10, estado: 'ok' },
        { contrato: 'K5', periodo: '2026-08', cargado: false, usuario: null, cargado_en: null, filas_cargadas: 0, estado: 'pendiente' },
      ],
    });

    const { result } = renderHook(() => useEstadoCargasCompleto(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(2);
  });

  // Único endpoint de /analytics/* restringido a gerente/admin — el nivel
  // 'carga' del claim `cert` no tiene acceso (403). `habilitado=false` no
  // debe disparar la request.
  it('useEstadoCargasCompleto: con habilitado=false no dispara la request', async () => {
    const { apiCert, useEstadoCargasCompleto } = await import('./certificaciones');
    const spy = vi.spyOn(apiCert, 'get').mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useEstadoCargasCompleto(false), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it('useEstadoCargas: con habilitado=false no dispara la request aunque haya período', async () => {
    const { apiCert, useEstadoCargas } = await import('./certificaciones');
    const spy = vi.spyOn(apiCert, 'get').mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useEstadoCargas('2026-08', false), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });
});
