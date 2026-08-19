import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Novedad, TipoNovedad, EstadoHys, EstadoNovedad, ResumenAusenciaOperario } from '@/types/domain';
import type { Quincena } from '@/lib/quincena';

export function useTiposNovedad() {
  return useQuery({
    queryKey: ['tipos-novedad'],
    queryFn: async () => (await api.get<TipoNovedad[]>('/catalogos/tipos-novedad')).data,
  });
}

/** Sin `periodo`: todas las novedades (sin acotar por fecha). Con `periodo`:
 * las que se superponen con esa quincena (mismo criterio que el motor de
 * liquidación), calculado por el backend. `estado` es opcional y, sin
 * pasarlo, el backend devuelve activas y anuladas mezcladas (sin default
 * server-side) — quien llama decide si filtra server-side o, como hace
 * /novedades hoy con tipo/operario/estadoHys, se queda con todo y filtra en
 * cliente. */
export function useNovedades(periodo?: Quincena, estado?: EstadoNovedad) {
  return useQuery({
    queryKey: ['novedades', periodo, estado],
    queryFn: async () =>
      (
        await api.get<Novedad[]>('/novedades', {
          params: {
            ...(periodo ? { anio: periodo.anio, mes: periodo.mes, quincena: periodo.parte } : {}),
            ...(estado ? { estado } : {}),
          },
        })
      ).data,
  });
}

export function useNovedadesPorEstado(estadoHys: EstadoHys) {
  return useQuery({
    queryKey: ['novedades', estadoHys],
    queryFn: async () =>
      (await api.get<Novedad[]>('/novedades', { params: { estadoHys } })).data,
  });
}

/** POST /novedades es multipart/form-data (permite adjuntar un certificado) —
 * el FormData lo arma quien llama (mismo patrón que cargas-combustible). */
export function useCrearNovedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: FormData) => (await api.post<Novedad>('/novedades', form)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['novedades'] }),
  });
}

/** PATCH /novedades/:id, Admin only. Subset parcial de campos + adjunto opcional
 * (reemplaza el existente) — mismo patrón multipart que useEditarCargaCombustible. */
export function useActualizarNovedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, form }: { id: number; form: FormData }) =>
      (await api.patch<Novedad>(`/novedades/${id}`, form)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['novedades'] }),
  });
}

export function useResolverHys() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number; estadoHys: 'aprobada' | 'desaprobada'; descargoHys?: string }) =>
      (
        await api.patch(`/novedades/${input.id}/resolver-hys`, {
          estadoHys: input.estadoHys,
          descargoHys: input.descargoHys,
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['novedades'] }),
  });
}

/** Vuelve una novedad ya resuelta a estadoHys 'pendiente' — mismo patrón que
 * useReabrirRegistro (lib/api/aprobaciones.ts). */
export function useReabrirNovedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.patch<Novedad>(`/novedades/${id}/reabrir`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['novedades'] }),
  });
}

/** PATCH /novedades/:id/anular — mismo alcance de roles/tipo que editar
 * completo (HyS solo en Ausencia, Admin en cualquier tipo). Mismo patrón que
 * useAnularCargaCombustible (lib/api/combustible.ts): motivo obligatorio,
 * sin FormData (no hay adjunto acá). */
export function useAnularNovedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) =>
      (await api.patch<Novedad>(`/novedades/${id}/anular`, { motivo })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['novedades'] }),
  });
}

/** GET /novedades/resumen-ausencias?anio&mes&quincena — HyS/Admin only. Base
 * del export CSV de Ausencias. */
export function useResumenAusencias(periodo: Quincena) {
  return useQuery({
    queryKey: ['novedades', 'resumen-ausencias', periodo],
    queryFn: async () =>
      (
        await api.get<ResumenAusenciaOperario[]>('/novedades/resumen-ausencias', {
          params: { anio: periodo.anio, mes: periodo.mes, quincena: periodo.parte },
        })
      ).data,
  });
}

/** Trae el adjunto (imagen o PDF) como blob y lo abre en una pestaña nueva —
 * mismo patrón de FotoTicketView (api + responseType: 'blob' + createObjectURL),
 * pero como acción puntual (no un componente que lo muestra montado). */
export async function abrirAdjuntoNovedad(id: number): Promise<void> {
  const { data } = await api.get(`/novedades/${id}/adjunto`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  window.open(url, '_blank');
  // Revocamos con demora: la pestaña nueva necesita tiempo para terminar de
  // cargar el blob antes de que la URL deje de ser válida.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
