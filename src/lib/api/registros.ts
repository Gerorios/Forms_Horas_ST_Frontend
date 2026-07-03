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

export function useMisRegistros(operarioCuil: string) {
  return useQuery({
    queryKey: ['mis-registros', operarioCuil],
    enabled: !!operarioCuil,
    queryFn: async () =>
      (await api.get<RegistroHoras[]>('/registros-horas', { params: { operarioCuil } })).data,
  });
}

/** Registros que este usuario cargó (para la vista "Cargas que hice" del JdC). */
export function useCargasQueHice(cargadoPorCuil: string) {
  return useQuery({
    queryKey: ['cargas-que-hice', cargadoPorCuil],
    enabled: !!cargadoPorCuil,
    queryFn: async () =>
      (await api.get<RegistroHoras[]>('/registros-horas', { params: { cargadoPorCuil } })).data,
  });
}
