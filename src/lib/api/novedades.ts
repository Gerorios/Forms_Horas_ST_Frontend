import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Novedad, TipoNovedad, CrearNovedadInput, EstadoHys } from '@/types/domain';

export function useTiposNovedad() {
  return useQuery({
    queryKey: ['tipos-novedad'],
    queryFn: async () => (await api.get<TipoNovedad[]>('/catalogos/tipos-novedad')).data,
  });
}

export function useNovedades() {
  return useQuery({
    queryKey: ['novedades'],
    queryFn: async () => (await api.get<Novedad[]>('/novedades')).data,
  });
}

export function useNovedadesPorEstado(estadoHys: EstadoHys) {
  return useQuery({
    queryKey: ['novedades', estadoHys],
    queryFn: async () =>
      (await api.get<Novedad[]>('/novedades', { params: { estadoHys } })).data,
  });
}

export function useCrearNovedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CrearNovedadInput) =>
      (await api.post<Novedad>('/novedades', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['novedades'] }),
  });
}

export function useResolverHys() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number; estadoHys: 'aprobada' | 'desaprobada' }) =>
      (await api.patch(`/novedades/${input.id}/resolver-hys`, {
        estadoHys: input.estadoHys,
      })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['novedades'] }),
  });
}
