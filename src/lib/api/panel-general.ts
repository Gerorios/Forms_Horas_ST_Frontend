import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { Quincena } from '@/lib/quincena';

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
   * comparar contra `aprobado`/`totalHoras` de esta quincena. */
  horasAprobadasAnterior: number;
  /** horasAprobadas de esta quincena menos horasAprobadasAnterior. Positivo =
   * le estoy aprobando más que la vez pasada (revisar si es real). */
  deltaHorasAprobadas: number;
}

/** Filtros server-side del panel Control general (contrato y provincia del
 * registro). Ausentes o vacíos = sin filtro. */
export interface FiltrosPanel {
  contratoIds?: number[];
  provinciaIds?: number[];
  /** CUILs de operarios. Solo lo consumen histórico y detalle (server-side);
   * el resumen se filtra por operario en el cliente. */
  operarioCuils?: string[];
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
  };
}

export function useResumenOperarios(quincena: Quincena, filtros: FiltrosPanel = {}, enabled = true) {
  return useQuery({
    queryKey: ['resumen-operarios', quincena, filtros],
    enabled,
    queryFn: async () =>
      (
        await api.get<ResumenOperario[]>('/registros-horas/resumen-operarios', {
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
  registros: RegistroControlDiario[];
}

export function useControlDiario(quincena: Quincena, filtros: FiltrosPanel = {}) {
  return useQuery({
    queryKey: ['control-diario', quincena, filtros],
    queryFn: async () =>
      (
        await api.get<DiaControlDiario[]>('/registros-horas/control-diario', {
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
export function useDetalleDiario(quincena: Quincena, filtros: FiltrosPanel = {}) {
  return useQuery({
    queryKey: ['detalle-diario', quincena, filtros],
    queryFn: async () =>
      (
        await api.get<DiaDetalleDiario[]>('/registros-horas/detalle-diario', {
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

export function useSinCarga(quincena: Quincena, enabled = true) {
  return useQuery({
    queryKey: ['sin-carga', quincena],
    enabled,
    queryFn: async () =>
      (
        await api.get<OperarioSinCarga[]>('/registros-horas/sin-carga', {
          params: { anio: quincena.anio, mes: quincena.mes, quincena: quincena.parte },
        })
      ).data,
  });
}
