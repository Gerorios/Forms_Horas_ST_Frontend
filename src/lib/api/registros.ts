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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mis-registros'] }),
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
