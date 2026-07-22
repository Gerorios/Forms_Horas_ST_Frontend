import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { EstadoRegistro, RegistroPorAprobar } from '@/types/domain';

export function usePorAprobar(estado: EstadoRegistro = 'pendiente') {
  return useQuery({
    queryKey: ['por-aprobar', estado],
    queryFn: async () =>
      (
        await api.get<RegistroPorAprobar[]>('/registros-horas/por-aprobar', {
          params: { estado },
        })
      ).data,
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

export function useResolverLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      loteId: string;
      estado: 'aprobado' | 'desaprobado';
      ids?: number[];
      motivoDesaprobacion?: string;
    }) =>
      (await api.patch(`/registros-horas/lote/${input.loteId}/resolver`, {
        estado: input.estado,
        ids: input.ids,
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
