import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

// Módulo Certificaciones (Etapa 2 ERP): todo pega contra el backend NestJS
// de Horas (`api`, `./client`). El Portal de Certificaciones sigue activo en
// etapa 2; lo que finalizó es la dependencia del módulo Horas hacia él.
const getCert = async <T>(url: string) => (await api.get<T>(url)).data;

// ---- Filtros comunes de /certificaciones/analytics/* ----
export interface FiltrosAnalytics {
  contratos?: string[];
  provincias?: string[];
  tipo?: 'OPEX' | 'CAPEX';
  desde?: string;
  hasta?: string;
}

/** El backend espera `contratos`/`provincias` como claves repetidas SIN
 * corchetes (`contratos=A&contratos=B`). El serializer de arrays por defecto
 * de axios emite `contratos[]=A&...`, que no bindea igual — por eso se arma
 * el `URLSearchParams` a mano acá en vez de pasar el objeto `filtros` directo
 * como `params`. */
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
  (await api.get<T>(url, { params: paramsAnalytics(filtros) })).data;

// ---- GET /certificaciones/analytics/evolucion-mensual ----
export interface EvolucionMensualPunto {
  periodo: string;
  monto_total: number;
  pgn_total: number;
}

export function useEvolucionMensual(filtros: FiltrosAnalytics) {
  return useQuery({
    queryKey: ['certificaciones', 'analytics', 'evolucion-mensual', filtros],
    queryFn: () => getCertAnalytics<EvolucionMensualPunto[]>('/certificaciones/analytics/evolucion-mensual', filtros),
  });
}

// ---- GET /certificaciones/analytics/por-contrato-mes ----
export interface PorContratoMesPunto {
  periodo: string;
  contrato: string;
  monto_total: number;
  pgn_total: number;
}

export function usePorContratoMes(filtros: FiltrosAnalytics) {
  return useQuery({
    queryKey: ['certificaciones', 'analytics', 'por-contrato-mes', filtros],
    queryFn: () => getCertAnalytics<PorContratoMesPunto[]>('/certificaciones/analytics/por-contrato-mes', filtros),
  });
}

// ---- GET /certificaciones/analytics/por-provincia ----
export interface PorProvinciaPunto {
  provincia: string;
  monto_total: number;
  pgn_total: number;
  lineas: number;
}

export function usePorProvincia(filtros: FiltrosAnalytics) {
  return useQuery({
    queryKey: ['certificaciones', 'analytics', 'por-provincia', filtros],
    queryFn: () => getCertAnalytics<PorProvinciaPunto[]>('/certificaciones/analytics/por-provincia', filtros),
  });
}

// ---- GET /certificaciones/analytics/top-items ----
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
    queryFn: () => getCertAnalytics<TopItemPunto[]>('/certificaciones/analytics/top-items', filtros),
  });
}

// ---- GET /certificaciones/analytics/interanual ----
// El endpoint devuelve un objeto { anio_actual, anio_anterior, meses: [...] }
// con monto Y pgn por separado (tampoco acepta `desde`/`hasta`: siempre
// compara año actual vs anterior).
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
    queryFn: () => getCertAnalytics<InteranualResponse>('/certificaciones/analytics/interanual', filtrosSinFecha),
  });
}

// ---- GET /certificaciones/analytics/contratos y /certificaciones/analytics/provincias — listas
// para poblar los MultiFiltro de la barra de filtros de Analytics ----
export function useContratosAnalytics() {
  return useQuery({
    queryKey: ['certificaciones', 'analytics', 'contratos-disponibles'],
    queryFn: () => getCert<string[]>('/certificaciones/analytics/contratos'),
  });
}

export function useProvinciasAnalytics() {
  return useQuery({
    queryKey: ['certificaciones', 'analytics', 'provincias-disponibles'],
    queryFn: () => getCert<string[]>('/certificaciones/analytics/provincias'),
  });
}

/** Histórico completo de `/certificaciones/analytics/estado-cargas` (sin
 * filtro de período), para la matriz operativa contrato×período — mismo
 * endpoint y mismo queryKey base que `useEstadoCargas` (que filtra a un
 * período con `select`); acá se necesita TODO el histórico para armar la
 * matriz, así que va sin `select` y con su propia entrada de caché en
 * TanStack Query (agrega `'todas'` a la key para no pisar el resultado ya
 * cacheado por `useEstadoCargas`).
 *
 * El backend NestJS atiende a nivel `carga` del claim `cert`, pero devuelve
 * datos recortados a sus contratos autorizados — `habilitado` (default
 * `true`) permite desactivar la query cuando el usuario no tiene el nivel
 * necesario, evitando una respuesta vacía. */
export function useEstadoCargasCompleto(habilitado = true) {
  return useQuery({
    queryKey: ['certificaciones', 'estado-cargas', 'todas'],
    queryFn: () => getCert<EstadoCargaContrato[]>('/certificaciones/analytics/estado-cargas'),
    enabled: habilitado,
  });
}

// ---- GET /certificaciones/resumen ----
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

// ---- GET /certificaciones/analytics/estado-cargas ----
// `filas_cargadas` y `estado` son `null` cuando el contrato no cargó ese
// período.
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
 * El endpoint atiende a nivel `carga` del claim `cert`, pero devuelve datos
 * recortados únicamente a los contratos autorizados del usuario; `habilitado`
 * (default `true`) permite desactivar la query cuando el usuario no tiene el
 * nivel necesario, evitando una respuesta vacía. */
export function useEstadoCargas(periodo: string, habilitado = true) {
  return useQuery({
    queryKey: ['certificaciones', 'estado-cargas'],
    queryFn: () => getCert<EstadoCargaContrato[]>('/certificaciones/analytics/estado-cargas'),
    select: (filas) => filas.filter((f) => f.periodo === periodo),
    enabled: periodo !== '' && habilitado,
  });
}

// ---- GET /certificaciones/analytics/presupuesto — lista, una fila por contrato;
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
    queryFn: () => getCert<PresupuestoContrato[]>('/certificaciones/analytics/presupuesto'),
    retry: false, // 403 no corresponde reintentar (nivel 'carga' sin el permiso)
  });
}

// ---- GET /certificaciones/incidencia-mo ----
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

// ---- GET /certificaciones/incidencia-mo/serie ----
// Serie de 12 meses (orden ascendente) para el gráfico de evolución de la
// incidencia de MO del Resumen — mismo criterio de acceso que
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

// ---- Accesos al módulo (Admin) ----
export type NivelAccesoCert = 'admin' | 'carga' | 'lectura';

export interface AccesoCert {
  cuil: string;
  nivel: NivelAccesoCert;
  verIncidencia: boolean;
  nombre: string;
  contratos: { id: number; codigo: string }[];
}

export function useAccesosCert() {
  return useQuery({
    queryKey: ['certificaciones', 'accesos'],
    queryFn: () => api.get<AccesoCert[]>('/certificaciones/accesos').then((r) => r.data),
  });
}

export function useGuardarAccesoCert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cuil, ...dto }: { cuil: string; nivel: NivelAccesoCert; verIncidencia: boolean; contratoIds: number[] }) =>
      api.put(`/certificaciones/accesos/${cuil}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificaciones', 'accesos'] }),
  });
}

export function useEliminarAccesoCert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cuil: string) => api.delete(`/certificaciones/accesos/${cuil}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificaciones', 'accesos'] }),
  });
}

// ---- Maestro de ítems (Admin) — GET/POST/PATCH/DELETE /certificaciones/items ----
export interface ItemCert {
  id_item: number;
  item_codigo: string;
  codigo_k: string;
  grupo: string | null;
  subgrupo: string | null;
  tarea: string;
  frecuencia: string | null;
  contratista: string | null;
  ptos_gasnor: number | null;
  unidad_medida: string | null;
  tipo: string | null;
  contrato_nombre: string | null;
}

/** `placeholderData` conserva la última lista mientras se tipea en el
 * buscador (debounced 300ms en la página) o se cambia el filtro de
 * contrato, para evitar el parpadeo de una grilla vacía entre requests. */
export function useItemsCert(filtros: { codigoK?: string; buscar?: string }, habilitado = true) {
  const params = new URLSearchParams();
  if (filtros.codigoK) params.append('codigo_k', filtros.codigoK);
  if (filtros.buscar) params.append('buscar', filtros.buscar);
  return useQuery({
    queryKey: ['certificaciones', 'items', filtros],
    queryFn: () => api.get<ItemCert[]>('/certificaciones/items', { params }).then((r) => r.data),
    enabled: habilitado,
    placeholderData: (prev) => prev,
  });
}

export interface CamposItemCert {
  grupo?: string | null;
  subgrupo?: string | null;
  frecuencia?: string | null;
  contratista?: string | null;
  ptos_gasnor?: number | null;
  unidad_medida?: string | null;
  tipo?: 'OPEX' | 'CAPEX' | null;
  contrato_nombre?: string | null;
}

export function useCrearItemCert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { item_codigo: string; codigo_k: string; tarea: string } & CamposItemCert) =>
      api.post('/certificaciones/items', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificaciones', 'items'] }),
  });
}

export function useEditarItemCert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idItem, ...dto }: { idItem: number; codigo_k?: string; tarea?: string } & CamposItemCert) =>
      api.patch(`/certificaciones/items/${idItem}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificaciones', 'items'] }),
  });
}

export function useEliminarItemCert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idItem: number) => api.delete(`/certificaciones/items/${idItem}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificaciones', 'items'] }),
  });
}
