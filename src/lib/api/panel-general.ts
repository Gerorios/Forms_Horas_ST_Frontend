import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { Quincena } from '@/lib/quincena';

export interface ResumenOperario {
  cuil: string;
  apellido_nombre: string;
  totalHoras: number;
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
export interface FilaDetalleDiario {
  id: number;
  fecha: string;
  contratoId: number;
  contratoCodigo: string;
  operarioCuil: string;
  operarioNombre: string;
  horas: number;
  estado: 'pendiente' | 'aprobado' | 'desaprobado';
  /** Nombres de las tareas del maestro asociadas al registro (M:N). */
  tareas: string[];
  /** Texto libre de la línea de carga (compartido por los operarios de esa
   * carga en ese contrato, ver ADR-005). null si no se cargó ninguna. */
  observacion: string | null;
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

export function useResumenOperarios(quincena: Quincena, filtros: FiltrosPanel = {}) {
  return useQuery({
    queryKey: ['resumen-operarios', quincena, filtros],
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
        await api.get<FilaDetalleDiario[]>('/registros-horas/detalle-diario', {
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

export function useSinCarga(quincena: Quincena) {
  return useQuery({
    queryKey: ['sin-carga', quincena],
    queryFn: async () =>
      (
        await api.get<OperarioSinCarga[]>('/registros-horas/sin-carga', {
          params: { anio: quincena.anio, mes: quincena.mes, quincena: quincena.parte },
        })
      ).data,
  });
}
