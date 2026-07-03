import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { RegistroPorAprobar } from '@/types/domain';

export function usePorAprobar() {
  return useQuery({
    queryKey: ['por-aprobar'],
    queryFn: async () =>
      (await api.get<RegistroPorAprobar[]>('/registros-horas/por-aprobar')).data,
  });
}

export function useResolverRegistro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: number;
      estado: 'aprobado' | 'desaprobado';
      motivoDesaprobacion?: string;
    }) =>
      (await api.patch(`/registros-horas/${input.id}/resolver`, {
        estado: input.estado,
        motivoDesaprobacion: input.motivoDesaprobacion,
      })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['por-aprobar'] }),
  });
}

export function useReabrirRegistro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.patch(`/registros-horas/${id}/reabrir`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['por-aprobar'] }),
  });
}
