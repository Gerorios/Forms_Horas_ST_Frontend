import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { CargaCombustible, EstacionServicio, ExtraccionTicket, TipoCombustible } from '@/types/domain';

export interface FiltroCargas { desde?: string; hasta?: string; movilId?: number; estado?: 'activa' | 'anulada' }

export function useEstacionesServicio() {
  return useQuery({ queryKey: ['estaciones-servicio'], queryFn: async () => (await api.get<EstacionServicio[]>('/catalogos/estaciones-servicio')).data });
}
export function useTiposCombustible() {
  return useQuery({ queryKey: ['tipos-combustible'], queryFn: async () => (await api.get<TipoCombustible[]>('/catalogos/tipos-combustible')).data });
}
export function useCargasCombustible(filtro: FiltroCargas) {
  return useQuery({ queryKey: ['cargas-combustible', filtro], queryFn: async () => (await api.get<CargaCombustible[]>('/cargas-combustible', { params: filtro })).data });
}
export function useCargaCombustible(id: number | null) {
  return useQuery({ queryKey: ['cargas-combustible', 'detalle', id], enabled: id !== null,
    queryFn: async () => (await api.get<CargaCombustible>(`/cargas-combustible/${id}`)).data });
}
export function useUltimoKm(movilId: number | null) {
  return useQuery({ queryKey: ['cargas-combustible', 'ultimo-km', movilId], enabled: movilId !== null,
    queryFn: async () => (await api.get<{ km: number | null; fechaCarga: string | null }>('/cargas-combustible/ultimo-km', { params: { movilId } })).data });
}
export function useCrearCargaCombustible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => api.post<CargaCombustible>('/cargas-combustible', form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cargas-combustible'] }),
  });
}
export function useEditarCargaCombustible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: number; form: FormData }) => api.patch<CargaCombustible>(`/cargas-combustible/${id}`, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cargas-combustible'] }),
  });
}
export function useAnularCargaCombustible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => api.patch(`/cargas-combustible/${id}/anular`, { motivo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cargas-combustible'] }),
  });
}
export function useExtraerTicket() {
  return useMutation({
    mutationFn: async (foto: Blob) => {
      const form = new FormData();
      form.append('foto', foto, 'ticket.jpg');
      return (await api.post<ExtraccionTicket>('/cargas-combustible/extraer-ticket', form)).data;
    },
  });
}
export function urlTicket(id: number) { return `/cargas-combustible/${id}/ticket`; } // usar con api.get(..., { responseType: 'blob' })
