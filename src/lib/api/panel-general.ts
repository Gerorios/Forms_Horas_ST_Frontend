import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { Quincena } from '@/lib/quincena';
import { filenameDeContentDisposition } from './liquidacion';

/** Período que consulta el panel (ADR-030): año y mes con quincena opcional
 * (null = mes completo), o un rango desde/hasta (YYYY-MM-DD) que manda sobre
 * el mes. El back lo valida (tope de 12 meses). */
export interface PeriodoPanel {
  anio: number;
  mes: number;
  parte: 1 | 2 | null;
  desde?: string;
  hasta?: string;
}

/** El período como query params: el rango solo si están las dos fechas. */
export function paramsPeriodo(p: PeriodoPanel) {
  if (p.desde && p.hasta) return { desde: p.desde, hasta: p.hasta };
  return { anio: p.anio, mes: p.mes, ...(p.parte ? { quincena: p.parte } : {}) };
}

export interface ResumenOperario {
  cuil: string;
  apellido_nombre: string;
  /** HORAS COMPLETAS (decisión 2026-09-03): todas las horas del operario en la
   * quincena, en cualquier contrato (míos y ajenos), pendientes + aprobadas.
   * Mis contratos deciden quién entra, no cuántas horas se cuentan — misma
   * regla que el Detalle diario. */
  totalHoras: number;
  /** Porción de `totalHoras` cargada en MIS contratos (todos, no solo los
   * filtrados). `totalHoras - horasMisContratos` = horas en otros contratos,
   * que se muestran de forma discreta junto al total. */
  horasMisContratos: number;
  pendiente: number;
  aprobado: number;
  desaprobado: number;
  /** Suma de horas de filas aprobadas (distinto de `aprobado`, que es la
   * cantidad de filas) — la base de la comparación contra la quincena anterior. */
  horasAprobadas: number;
  superaHorasExtra: boolean;
  /** Algún día de la quincena tuvo horas cruzando >1 lote o total ≥16hs, en
   * cualquier contrato (no solo los del jefe que consulta) — mismo criterio
   * que el badge de /aprobaciones. */
  tieneAlertaCruzada: boolean;
  /** Horas aprobadas (de mis contratos) en la quincena anterior — para
   * comparar contra `aprobado`/`totalHoras` de esta quincena. null si el
   * período no es una quincena (ADR-030). */
  horasAprobadasAnterior: number | null;
  /** horasAprobadas de esta quincena menos horasAprobadasAnterior. Positivo =
   * le estoy aprobando más que la vez pasada (revisar si es real). null si el
   * período no es una quincena. */
  deltaHorasAprobadas: number | null;
}

/** Filtros server-side del panel Control general (contrato y provincia del
 * registro). Ausentes o vacíos = sin filtro. */
export interface FiltrosPanel {
  contratoIds?: number[];
  provinciaIds?: number[];
  /** CUILs de operarios. Solo lo consumen histórico y detalle (server-side);
   * el resumen se filtra por operario en el cliente. */
  operarioCuils?: string[];
  /** Ids del catálogo de tareas: un registro pasa si tiene alguna. */
  tareaIds?: number[];
}

/** Una tarea del catálogo de mis contratos. El mismo nombre puede repetirse
 * en varios contratos con distinto id. */
export interface MiTarea {
  id: number;
  nombre: string;
  contratoId: number;
}

export interface MisContrato {
  id: number;
  codigo: string;
  nombre: string;
}

/** Un punto del histórico "Horas Por Quincena" (réplica del Looker):
 * horas pendientes + aprobadas de esa quincena calendario. */
export interface PuntoHistorico {
  anio: number;
  mes: number;
  quincena: 1 | 2;
  horas: number;
}

/** Una fila de la tabla "Detalle Diario": un registro de horas plano,
 * con contrato y nombre ya resueltos. */
/** Un registro dentro del día desplegado del Detalle diario. */
export interface FilaDetalleDiario {
  id: number;
  contratoId: number;
  contratoCodigo: string;
  horas: number;
  estado: 'pendiente' | 'aprobado' | 'desaprobado';
  /** Nombres de las tareas del maestro asociadas al registro (M:N). */
  tareas: string[];
  /** Texto libre de la línea de carga (compartido por los operarios de esa
   * carga en ese contrato, ver ADR-005). null si no se cargó ninguna. */
  observacion: string | null;
  /** false = registro de un contrato de OTRO jefe: aparece como contexto de
   * la jornada (el operario trabajó ahí ese día) pero no es accionable por
   * este usuario — decisión 2026-08-19, "jornada completa". */
  esMiContrato: boolean;
  /** Auditoría: quién cargó el registro y cuándo (created_at, no confundir
   * con `fecha`, que es el día trabajado) — 2026-08-21. */
  cargadoPorNombre: string;
  cargadoEn: string;
  /** null hasta que se resuelve (estado sigue en 'pendiente'). */
  aprobadoPorNombre: string | null;
  aprobadoEn: string | null;
}

/** Un renglón del Detalle diario: el día de una persona, desplegable, con
 * TODOS sus registros de esa jornada (decisión 2026-08-19: mismo formato que
 * la tabla de +13hs). Las desaprobadas figuran pero no suman al total. */
export interface DiaDetalleDiario {
  operarioCuil: string;
  operarioNombre: string;
  fecha: string;
  totalHoras: number;
  contratos: string[];
  /** Fecha de la baja confirmada si este día es posterior a ella (ADR-026). */
  posteriorABaja?: string | null;
  registros: FilaDetalleDiario[];
}

export interface OperarioSinCarga {
  cuil: string;
  apellido_nombre: string;
  legajo: number;
  cargo: string;
  /** Fecha (YYYY-MM-DD) de su último registro histórico, en cualquier
   * contrato. null si nunca tuvo ninguno (ej. recién ingresado). */
  ultimaCarga: string | null;
}

/** Convierte los filtros a query params comma-separated, solo con las
 * claves presentes y no vacías (ausente = sin filtro en el back). */
function paramsFiltros(f: FiltrosPanel = {}) {
  return {
    ...(f.contratoIds?.length ? { contratoIds: f.contratoIds.join(',') } : {}),
    ...(f.provinciaIds?.length ? { provinciaIds: f.provinciaIds.join(',') } : {}),
    ...(f.operarioCuils?.length ? { operarioCuils: f.operarioCuils.join(',') } : {}),
    ...(f.tareaIds?.length ? { tareaIds: f.tareaIds.join(',') } : {}),
  };
}

export function useResumenOperarios(periodo: PeriodoPanel, filtros: FiltrosPanel = {}, enabled = true) {
  return useQuery({
    queryKey: ['resumen-operarios', periodo, filtros],
    enabled,
    queryFn: async () =>
      (
        await api.get<ResumenOperario[]>('/registros-horas/resumen-operarios', {
          params: { ...paramsPeriodo(periodo), ...paramsFiltros(filtros) },
        })
      ).data,
  });
}

/** Una carga puntual dentro de un día que superó el umbral de control. */
export interface RegistroControlDiario {
  id: number;
  contratoCodigo: string;
  horas: number;
  estado: 'pendiente' | 'aprobado' | 'desaprobado';
  tareas: string[];
  observacion: string | null;
  /** Auditoría: quién cargó el registro y cuándo — mismo criterio que
   * FilaDetalleDiario (2026-08-21). */
  cargadoPorNombre: string;
  cargadoEn: string;
  aprobadoPorNombre: string | null;
  aprobadoEn: string | null;
}

/** Un operario-día con más de 13hs sumadas cruzando todos los contratos —
 * la "zona de revisión" del panel (convive con la alerta de ≥16hs, que es
 * otra cosa: esta tabla es auditoría fina, no alarma). */
export interface DiaControlDiario {
  operarioCuil: string;
  operarioNombre: string;
  fecha: string;
  totalHoras: number;
  contratos: string[];
  /** Fecha de la baja confirmada si este día es posterior a ella (ADR-026). */
  posteriorABaja?: string | null;
  registros: RegistroControlDiario[];
}

export function useControlDiario(periodo: PeriodoPanel, filtros: FiltrosPanel = {}) {
  return useQuery({
    queryKey: ['control-diario', periodo, filtros],
    queryFn: async () =>
      (
        await api.get<DiaControlDiario[]>('/registros-horas/control-diario', {
          params: { ...paramsPeriodo(periodo), ...paramsFiltros(filtros) },
        })
      ).data,
  });
}

/** Tareas de mis contratos (incluidas las inactivas) — opciones del filtro
 * por tarea del panel Control general. */
export function useMisTareas() {
  return useQuery({
    queryKey: ['mis-tareas'],
    queryFn: async () => (await api.get<MiTarea[]>('/registros-horas/mis-tareas')).data,
  });
}

/** Descarga el Excel del Detalle diario con el período y los filtros de la
 * pantalla. El back exporta solo las filas que cumplen los filtros, en mis
 * contratos (ADR-030). */
export async function descargarExcelDetalle(periodo: PeriodoPanel, filtros: FiltrosPanel): Promise<void> {
  const response = await api.get('/registros-horas/detalle-diario/excel', {
    params: { ...paramsPeriodo(periodo), ...paramsFiltros(filtros) },
    responseType: 'blob',
  });
  const filename = filenameDeContentDisposition(response.headers['content-disposition']) ?? 'detalle-diario.xlsx';
  const objectUrl = URL.createObjectURL(response.data as Blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Contratos donde soy jefe (Admin: todos los activos) — opciones del
 * filtro por contrato del panel Control general. */
export function useMisContratos() {
  return useQuery({
    queryKey: ['mis-contratos'],
    queryFn: async () => (await api.get<MisContrato[]>('/registros-horas/mis-contratos')).data,
  });
}

/** Histórico de 24 quincenas (12 meses) terminando en la seleccionada,
 * en orden cronológico ascendente. */
export function useHistoricoQuincenas(quincena: Quincena, filtros: FiltrosPanel = {}) {
  return useQuery({
    queryKey: ['historico-quincenas', quincena, filtros],
    queryFn: async () =>
      (
        await api.get<PuntoHistorico[]>('/registros-horas/historico-quincenas', {
          params: {
            anio: quincena.anio,
            mes: quincena.mes,
            quincena: quincena.parte,
            ...paramsFiltros(filtros),
          },
        })
      ).data,
  });
}

/** Detalle plano de la quincena: una fila por registro, orden fecha desc
 * + nombre asc (lo garantiza el back). */
export function useDetalleDiario(periodo: PeriodoPanel, filtros: FiltrosPanel = {}) {
  return useQuery({
    queryKey: ['detalle-diario', periodo, filtros],
    queryFn: async () =>
      (
        await api.get<DiaDetalleDiario[]>('/registros-horas/detalle-diario', {
          params: { ...paramsPeriodo(periodo), ...paramsFiltros(filtros) },
        })
      ).data,
  });
}

/** Solo por quincena: con un mes o un rango no se pide (`quincena` null). */
export function useSinCarga(quincena: Quincena | null, enabled = true) {
  return useQuery({
    queryKey: ['sin-carga', quincena],
    enabled: enabled && quincena !== null,
    queryFn: async () =>
      (
        await api.get<OperarioSinCarga[]>('/registros-horas/sin-carga', {
          params: { anio: quincena!.anio, mes: quincena!.mes, quincena: quincena!.parte },
        })
      ).data,
  });
}
