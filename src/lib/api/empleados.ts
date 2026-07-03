import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { EmpleadoBusqueda } from '@/types/domain';

export function useBuscarEmpleados(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: ['empleados', term],
    enabled: term.length >= 3,
    queryFn: async () =>
      (await api.get<EmpleadoBusqueda[]>('/empleados', { params: { q: term } })).data,
  });
}
