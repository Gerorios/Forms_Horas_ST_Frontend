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

export interface OperarioSinCarga {
  cuil: string;
  apellido_nombre: string;
  legajo: number;
  cargo: string;
  /** Fecha (YYYY-MM-DD) de su último registro histórico, en cualquier
   * contrato. null si nunca tuvo ninguno (ej. recién ingresado). */
  ultimaCarga: string | null;
}

export function useResumenOperarios(quincena: Quincena) {
  return useQuery({
    queryKey: ['resumen-operarios', quincena],
    queryFn: async () =>
      (
        await api.get<ResumenOperario[]>('/registros-horas/resumen-operarios', {
          params: { anio: quincena.anio, mes: quincena.mes, quincena: quincena.parte },
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
