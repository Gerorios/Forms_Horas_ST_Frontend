import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { ReporteBatch, RegistroHoras } from '@/types/domain';

export function useCrearReporteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ReporteBatch) =>
      (await api.post<{ creados: number; registros: RegistroHoras[] }>(
        '/registros-horas/batch',
        payload,
      )).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-registros'] });
      qc.invalidateQueries({ queryKey: ['cargas-que-hice'] });
    },
  });
}

/** Rango server-side (fix de crecimiento 2026-08-18): se pide solo la quincena
 * visible en vez de la vida entera del usuario. */
export function useMisRegistros(operarioCuil: string, rango?: { desde: string; hasta: string }, enabled = true) {
  return useQuery({
    queryKey: ['mis-registros', operarioCuil, rango?.desde, rango?.hasta],
    enabled: !!operarioCuil && enabled,
    queryFn: async () =>
      (
        await api.get<RegistroHoras[]>('/registros-horas', {
          params: { operarioCuil, ...(rango ?? {}) },
        })
      ).data,
  });
}

/** Registros que este usuario cargó (para la vista "Cargas que hice" del JdC). */
export function useCargasQueHice(cargadoPorCuil: string, rango?: { desde: string; hasta: string }) {
  return useQuery({
    queryKey: ['cargas-que-hice', cargadoPorCuil, rango?.desde, rango?.hasta],
    enabled: !!cargadoPorCuil,
    queryFn: async () =>
      (
        await api.get<RegistroHoras[]>('/registros-horas', {
          params: { cargadoPorCuil, ...(rango ?? {}) },
        })
      ).data,
  });
}
