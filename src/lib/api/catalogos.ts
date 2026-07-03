import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { Provincia, Movil, Tarea } from '@/types/domain';

export function useProvincias() {
  return useQuery({
    queryKey: ['provincias'],
    queryFn: async () => (await api.get<Provincia[]>('/catalogos/provincias')).data,
  });
}

export function useMoviles() {
  return useQuery({
    queryKey: ['moviles'],
    queryFn: async () => (await api.get<Movil[]>('/catalogos/moviles')).data,
  });
}

export function useTareas(contratoId: number | null) {
  return useQuery({
    queryKey: ['tareas', contratoId],
    enabled: contratoId != null,
    queryFn: async () =>
      (await api.get<Tarea[]>('/catalogos/tareas', { params: { contratoId } })).data,
  });
}
