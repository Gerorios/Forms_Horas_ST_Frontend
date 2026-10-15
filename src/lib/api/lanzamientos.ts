import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Rol } from '@/types/domain';

/** Lanzamiento de módulos (ADR-028): interno (Admin + piloto) o para todos. Solo Admin. */
export type EstadoLanzamiento = 'interno' | 'todos';

export interface Lanzamiento {
  modulo: string;
  nombre: string;
  estado: EstadoLanzamiento;
  actualizadoEn: string;
  roles: Rol[];
  usuarios: { cuil: string; nombre: string; rol: Rol }[];
}

export interface CambiosLanzamiento {
  estado?: EstadoLanzamiento;
  roles?: Rol[];
  usuarios?: string[];
}

export function useLanzamientos() {
  return useQuery({
    queryKey: ['lanzamientos'],
    queryFn: async () => (await api.get<Lanzamiento[]>('/admin/lanzamientos')).data,
  });
}

export function useActualizarLanzamiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ modulo, cambios }: { modulo: string; cambios: CambiosLanzamiento }) =>
      (await api.patch<Lanzamiento[]>(`/admin/lanzamientos/${modulo}`, cambios)).data,
    onSuccess: (data) => qc.setQueryData(['lanzamientos'], data),
  });
}
