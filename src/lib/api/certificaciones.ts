import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { getToken } from './token';

// Cliente aparte del `api` de Horas (NestJS): el portal de Certificaciones es
// un backend FastAPI propio (mismo token Bearer, distinto host/baseURL).
export const apiCert = axios.create({
  baseURL: process.env.NEXT_PUBLIC_CERT_API_URL ?? 'http://localhost:8000',
});

apiCert.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getCert = async <T>(url: string, params?: Record<string, unknown>) =>
  (await apiCert.get<T>(url, params ? { params } : undefined)).data;

// ---- Filtros comunes de /analytics/* (Task 7) ----
export interface FiltrosAnalytics {
  contratos?: string[];
  provincias?: string[];
  tipo?: 'OPEX' | 'CAPEX';
  desde?: string;
  hasta?: string;
}

/** El backend usa FastAPI `Query(default=[])` para `contratos`/`provincias`
 * (List[str]): espera claves repetidas SIN corchetes (`contratos=A&contratos=B`).
 * El serializer de arrays por defecto de axios emite `contratos[]=A&...`, que
 * FastAPI no bindea — por eso se arma el `URLSearchParams` a mano acá en vez
 * de pasar el objeto `filtros` directo como `params`. */
function paramsAnalytics(filtros: FiltrosAnalytics): URLSearchParams {
  const usp = new URLSearchParams();
  for (const c of filtros.contratos ?? []) usp.append('contratos', c);
  for (const p of filtros.provincias ?? []) usp.append('provincias', p);
  if (filtros.tipo) usp.append('tipo', filtros.tipo);
  if (filtros.desde) usp.append('desde', filtros.desde);
  if (filtros.hasta) usp.append('hasta', filtros.hasta);
  return usp;
}

const getCertAnalytics = async <T>(url: string, filtros: FiltrosAnalytics) =>
  (await apiCert.get<T>(url, { params: paramsAnalytics(filtros) })).data;

// ---- GET /analytics/evolucion-mensual (FastAPI) ----
// NOTA (Task 7): el brief describía el shape como { periodo, monto, pgn } —
// analytics.py (fuente de verdad) devuelve { periodo, monto_total, pgn_total }.
// Se sigue el código real.
export interface EvolucionMensualPunto {
  periodo: string;
  monto_total: number;
  pgn_total: number;
}

export function useEvolucionMensual(filtros: FiltrosAnalytics) {
  return useQuery({
    queryKey: ['certificaciones', 'analytics', 'evolucion-mensual', filtros],
    queryFn: () => getCertAnalytics<EvolucionMensualPunto[]>('/analytics/evolucion-mensual', filtros),
  });
}

// ---- GET /analytics/por-contrato-mes (FastAPI) ----
export interface PorContratoMesPunto {
  periodo: string;
  contrato: string;
  monto_total: number;
  pgn_total: number;
}

export function usePorContratoMes(filtros: FiltrosAnalytics) {
  return useQuery({
    queryKey: ['certificaciones', 'analytics', 'por-contrato-mes', filtros],
    queryFn: () => getCertAnalytics<PorContratoMesPunto[]>('/analytics/por-contrato-mes', filtros),
  });
}

// ---- GET /analytics/por-provincia (FastAPI) ----
export interface PorProvinciaPunto {
  provincia: string;
  monto_total: number;
  pgn_total: number;
  lineas: number;
}

export function usePorProvincia(filtros: FiltrosAnalytics) {
  return useQuery({
    queryKey: ['certificaciones', 'analytics', 'por-provincia', filtros],
    queryFn: () => getCertAnalytics<PorProvinciaPunto[]>('/analytics/por-provincia', filtros),
  });
}

// ---- GET /analytics/top-items (FastAPI) ----
// NOTA (Task 7): el brief describía { item_codigo, tarea, monto, cantidad } —
// analytics.py no tiene un campo `cantidad`; devuelve además `contrato` y
// `pgn_total`. Se sigue el código real.
export interface TopItemPunto {
  item_codigo: string;
  tarea: string;
  contrato: string;
  monto_total: number;
  pgn_total: number;
}

export function useTopItems(filtros: FiltrosAnalytics) {
  return useQuery({
    queryKey: ['certificaciones', 'analytics', 'top-items', filtros],
    queryFn: () => getCertAnalytics<TopItemPunto[]>('/analytics/top-items', filtros),
  });
}

// ---- GET /analytics/interanual (FastAPI) ----
// NOTA (Task 7): el brief describía un array plano [{ mes, actual, anterior,
// variacion }] — analytics.py devuelve un objeto { anio_actual, anio_anterior,
// meses: [...] } con monto Y pgn por separado (el endpoint tampoco acepta
// `desde`/`hasta`: siempre compara año actual vs anterior). Se sigue el
// código real.
export interface InteranualMes {
  mes: number;
  monto_actual: number | null;
  monto_anterior: number | null;
  pgn_actual: number | null;
  pgn_anterior: number | null;
  var_monto: number | null;
  var_pgn: number | null;
}

export interface InteranualResponse {
  anio_actual: number | null;
  anio_anterior: number | null;
  meses: InteranualMes[];
}

/** El endpoint no acepta `desde`/`hasta` (siempre año actual vs. anterior) —
 * se descartan acá antes de armar la query key y los params, para que ni se
 * manden al backend ni disparen un refetch innecesario cuando el usuario
 * cambia el rango de fechas de los demás gráficos. */
export function useInteranual(filtros: FiltrosAnalytics) {
  const filtrosSinFecha: FiltrosAnalytics = {
    contratos: filtros.contratos,
    provincias: filtros.provincias,
    tipo: filtros.tipo,
  };
  return useQuery({
    queryKey: ['certificaciones', 'analytics', 'interanual', filtrosSinFecha],
    queryFn: () => getCertAnalytics<InteranualResponse>('/analytics/interanual', filtrosSinFecha),
  });
}

// ---- GET /analytics/contratos y /analytics/provincias (FastAPI) — listas
// para poblar los MultiFiltro de la barra de filtros de Analytics ----
export function useContratosAnalytics() {
  return useQuery({
    queryKey: ['certificaciones', 'analytics', 'contratos-disponibles'],
    queryFn: () => getCert<string[]>('/analytics/contratos'),
  });
}

export function useProvinciasAnalytics() {
  return useQuery({
    queryKey: ['certificaciones', 'analytics', 'provincias-disponibles'],
    queryFn: () => getCert<string[]>('/analytics/provincias'),
  });
}

/** Histórico completo de `/analytics/estado-cargas` (sin filtro de período),
 * para la matriz operativa contrato×período — mismo endpoint y mismo
 * queryKey base que `useEstadoCargas` (Task 6, que filtra a un período con
 * `select`); acá se necesita TODO el histórico para armar la matriz, así
 * que va sin `select` y con su propia entrada de caché en TanStack Query
 * (agrega `'todas'` a la key para no pisar el resultado ya cacheado por
 * `useEstadoCargas`).
 *
 * Igual que `useEstadoCargas`: el endpoint exige gerente/admin (único de
 * `/analytics/*` con esa restricción extra) — `habilitado` (default `true`)
 * deja gatear la query para el nivel `carga` del claim `cert`. */
export function useEstadoCargasCompleto(habilitado = true) {
  return useQuery({
    queryKey: ['certificaciones', 'estado-cargas', 'todas'],
    queryFn: () => getCert<EstadoCargaContrato[]>('/analytics/estado-cargas'),
    enabled: habilitado,
  });
}

// ---- GET /certificaciones/resumen (FastAPI) ----
export interface FilaResumenCert {
  periodo: string;
  contrato: string;
  tipo: string;
  lineas: number;
  monto_total: number;
}

/** El backend NO filtra por período (devuelve las últimas ~200 filas de
 * TODOS los períodos, orden desc, cada fila trae su `periodo`) — el filtro
 * por período seleccionado se hace client-side acá. Si el volumen crece,
 * agregar filtro server-side (query param real en el endpoint). */
export function useResumenCert(periodo: string) {
  return useQuery({
    queryKey: ['certificaciones', 'resumen'],
    queryFn: () => getCert<FilaResumenCert[]>('/certificaciones/resumen'),
    select: (filas) => filas.filter((f) => f.periodo === periodo),
    enabled: periodo !== '',
  });
}

// ---- GET /analytics/estado-cargas (FastAPI) ----
// NOTA (Task 7): `filas_cargadas` y `estado` también son `null` cuando el
// contrato no cargó ese período (analytics.py devuelve `None` en ese caso) —
// se corrige el tipo, antes marcado como no-nulo (Task 6).
export interface EstadoCargaContrato {
  contrato: string;
  periodo: string;
  cargado: boolean;
  usuario: string | null;
  cargado_en: string | null;
  filas_cargadas: number | null;
  estado: string | null;
}

/** El backend devuelve TODO el histórico contrato×período desde 2025-01 (no
 * acepta filtro) — el filtro por período seleccionado se hace client-side
 * acá, mismo criterio que `useResumenCert`.
 *
 * `/analytics/estado-cargas` exige rol gerente/admin (`require_gerente_or_admin`
 * en analytics.py) — es el ÚNICO endpoint del módulo con esa restricción extra
 * (el resto de `/analytics/*` acepta admin/gerente/jefe). El nivel `carga` del
 * claim `cert` del front-end no tiene acceso; `habilitado` (default `true`)
 * deja que quien llama al hook lo desactive para ese caso sin disparar un 403
 * innecesario. */
export function useEstadoCargas(periodo: string, habilitado = true) {
  return useQuery({
    queryKey: ['certificaciones', 'estado-cargas'],
    queryFn: () => getCert<EstadoCargaContrato[]>('/analytics/estado-cargas'),
    select: (filas) => filas.filter((f) => f.periodo === periodo),
    enabled: periodo !== '' && habilitado,
  });
}

// ---- GET /analytics/presupuesto (FastAPI) — lista, una fila por contrato;
// 403 para nivel 'carga' ----
export interface PresupuestoContrato {
  contrato: string;
  descripcion: string;
  periodo_desde: string;
  periodo_hasta: string;
  monto_presupuesto: number;
  consumido: number;
  pct: number;
}

export function usePresupuesto() {
  return useQuery({
    queryKey: ['certificaciones', 'presupuesto'],
    queryFn: () => getCert<PresupuestoContrato[]>('/analytics/presupuesto'),
    retry: false, // 403 no corresponde reintentar (nivel 'carga' sin el permiso)
  });
}

// ---- GET /certificaciones/incidencia-mo (backend de Horas, axios `api`) ----
export interface IncidenciaMoResponse {
  contratos: { codigo: string; montoMo: number }[];
  sinAsignar: number | null;
}

export function useIncidenciaMo(anio: number, mes: number, enabled = true) {
  return useQuery({
    queryKey: ['certificaciones', 'incidencia-mo', anio, mes],
    queryFn: () => api.get<IncidenciaMoResponse>('/certificaciones/incidencia-mo', { params: { anio, mes } }).then((r) => r.data),
    enabled,
    retry: false, // 403 si el usuario no corresponde (ver perfil.cert.inc)
  });
}

// ---- GET /certificaciones/incidencia-mo/serie (backend de Horas, axios `api`) ----
// Serie de 12 meses (orden ascendente) para el gráfico de evolución de la
// incidencia de MO del Resumen (Task 3) — mismo criterio de acceso que
// `useIncidenciaMo` (403 si `perfil.cert.inc` no corresponde para el nivel
// `carga`, ver `muestraIncidencia` en la página).
export interface IncidenciaMesSerie {
  anio: number;
  mes: number;
  contratos: { codigo: string; montoMo: number }[];
  sinAsignar: number | null;
}

export function useIncidenciaSerie(anio: number, mes: number, habilitado: boolean) {
  return useQuery({
    queryKey: ['certificaciones', 'incidencia-mo', 'serie', anio, mes],
    queryFn: () =>
      api
        .get<IncidenciaMesSerie[]>('/certificaciones/incidencia-mo/serie', { params: { anio, mes, meses: 12 } })
        .then((r) => r.data),
    enabled: habilitado,
    retry: false, // 403 si el usuario no corresponde (ver perfil.cert.inc)
  });
}
