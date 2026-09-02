import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

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
    const { api } = await import('./client');
    const { useResumenCert } = await import('./certificaciones');
    vi.spyOn(api, 'get').mockResolvedValue({
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
    const { api } = await import('./client');
    const { useEstadoCargas } = await import('./certificaciones');
    vi.spyOn(api, 'get').mockResolvedValue({
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

// NestJS espera `contratos=A&contratos=B` (claves repetidas, sin corchetes)
// para el binding de listas de query params — el serializer de arrays por
// defecto de axios emite `contratos[]=A&...`, que no bindea igual. Estos
// tests verifican que los hooks de /analytics/* arman los query params a mano.
describe('hooks de /certificaciones/analytics/*: serialización de filtros', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });
  afterEach(() => vi.restoreAllMocks());

  it('useEvolucionMensual: contratos/provincias van como claves repetidas sin corchetes', async () => {
    const { api } = await import('./client');
    const { useEvolucionMensual } = await import('./certificaciones');
    const spy = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });

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
    expect(url).toBe('/certificaciones/analytics/evolucion-mensual');
    const params = config?.params as URLSearchParams;
    expect(params.toString()).toBe(
      'contratos=K5&contratos=K6&provincias=Salta&tipo=OPEX&desde=2026-01&hasta=2026-08',
    );
  });

  it('useInteranual: el endpoint no acepta desde/hasta — no se mandan aunque vengan en filtros', async () => {
    const { api } = await import('./client');
    const { useInteranual } = await import('./certificaciones');
    const spy = vi.spyOn(api, 'get').mockResolvedValue({
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
    expect(url).toBe('/certificaciones/analytics/interanual');
    const params = config?.params as URLSearchParams;
    expect(params.toString()).toBe('contratos=K5&tipo=OPEX');
    expect(params.has('desde')).toBe(false);
    expect(params.has('hasta')).toBe(false);
  });

  it('useTopItems: sin filtros, no manda query params vacíos', async () => {
    const { api } = await import('./client');
    const { useTopItems } = await import('./certificaciones');
    const spy = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useTopItems({}), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const [url, config] = spy.mock.calls[0];
    expect(url).toBe('/certificaciones/analytics/top-items');
    const params = config?.params as URLSearchParams;
    expect(params.toString()).toBe('');
  });

  it('useEstadoCargasCompleto: trae el histórico completo sin filtrar por período', async () => {
    const { api } = await import('./client');
    const { useEstadoCargasCompleto } = await import('./certificaciones');
    vi.spyOn(api, 'get').mockResolvedValue({
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
    const { api } = await import('./client');
    const { useEstadoCargasCompleto } = await import('./certificaciones');
    const spy = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useEstadoCargasCompleto(false), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it('useEstadoCargas: con habilitado=false no dispara la request aunque haya período', async () => {
    const { api } = await import('./client');
    const { useEstadoCargas } = await import('./certificaciones');
    const spy = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useEstadoCargas('2026-08', false), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });
});

// useDeshacerCarga: verifica el ALCANCE del invalidate tras deshacer una
// carga — deshacer cambia montos ya cacheados en varias pantallas del módulo
// (resumen, analytics, estado-cargas, presupuesto, incidencia-mo), no solo el
// historial. Ronda de fix 1 del code review: `usePresupuesto` usa
// `['certificaciones','presupuesto']`, que NO vive bajo el prefijo
// `['certificaciones','analytics']` (a diferencia de lo que decía el comentario
// original) — este test fija con un QueryClient real que esa key puntual
// también se invalida.
describe('useDeshacerCarga: alcance del invalidate', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });
  afterEach(() => vi.restoreAllMocks());

  it('invalida historial, resumen, analytics, estado-cargas, presupuesto e incidencia-mo', async () => {
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const { api } = await import('./client');
    const { useDeshacerCarga } = await import('./certificaciones');
    vi.spyOn(api, 'delete').mockResolvedValue({ data: { mensaje: 'Carga deshecha', filasBorradas: 3 } });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    function localWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useDeshacerCarga(), { wrapper: localWrapper });
    result.current.mutate(7);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keysInvalidados = invalidateSpy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keysInvalidados).toContain(JSON.stringify(['certificaciones', 'carga', 'historial']));
    expect(keysInvalidados).toContain(JSON.stringify(['certificaciones', 'resumen']));
    expect(keysInvalidados).toContain(JSON.stringify(['certificaciones', 'analytics']));
    expect(keysInvalidados).toContain(JSON.stringify(['certificaciones', 'estado-cargas']));
    expect(keysInvalidados).toContain(JSON.stringify(['certificaciones', 'presupuesto']));
    expect(keysInvalidados).toContain(JSON.stringify(['certificaciones', 'incidencia-mo']));
  });
});

// useConfirmarCarga: una carga cambia los mismos números que un deshacer
// (montos que suben en vez de bajar), así que debe invalidar el MISMO set de
// 6 queries que `useDeshacerCarga` — fix 3 de la ronda final de review.
describe('useConfirmarCarga: alcance del invalidate', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });
  afterEach(() => vi.restoreAllMocks());

  it('invalida historial, resumen, analytics, estado-cargas, presupuesto e incidencia-mo', async () => {
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const { api } = await import('./client');
    const { useConfirmarCarga } = await import('./certificaciones');
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { mensaje: 'ok', insertadas: 1, omitidas: 0, errores: [] },
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    function localWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useConfirmarCarga(), { wrapper: localWrapper });
    result.current.mutate({ previewId: 'preview-1', ediciones: [] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keysInvalidados = invalidateSpy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keysInvalidados).toContain(JSON.stringify(['certificaciones', 'carga', 'historial']));
    expect(keysInvalidados).toContain(JSON.stringify(['certificaciones', 'resumen']));
    expect(keysInvalidados).toContain(JSON.stringify(['certificaciones', 'analytics']));
    expect(keysInvalidados).toContain(JSON.stringify(['certificaciones', 'estado-cargas']));
    expect(keysInvalidados).toContain(JSON.stringify(['certificaciones', 'presupuesto']));
    expect(keysInvalidados).toContain(JSON.stringify(['certificaciones', 'incidencia-mo']));
  });
});
