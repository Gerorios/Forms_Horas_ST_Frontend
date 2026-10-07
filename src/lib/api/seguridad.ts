import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { ContratoResumen } from '@/types/domain';

// Autogestión de la Seguridad (ADR-027). Vocabulario: CONTEXT.md del backend,
// sección "Autogestión de la Seguridad".

export type TipoReporte = 'aviso_riesgo' | 'incidente' | 'paralizacion' | 'propuesta_mejora' | 'inspeccion';
export type EstadoReporte = 'pendiente' | 'aprobado' | 'desaprobado' | 'anulado';
export type GrupoFoto = 'riesgo' | 'control';
export type OrigenFoto = 'camara' | 'galeria';

export interface ItemCatalogo {
  id: number;
  nombre: string;
}

export interface CatalogosSeguridad {
  naturalezas: ItemCatalogo[];
  motivosParalizacion: ItemCatalogo[];
  /** TODOS los contratos activos, no los habilitados: reportar no es imputar horas. */
  contratos: ContratoResumen[];
}

export interface FotoReporte {
  id: number;
  grupo: GrupoFoto;
  origen: OrigenFoto;
  subidoEn: string;
  conUbicacion: boolean;
}

export interface ReporteSeguridad {
  id: number;
  tipo: TipoReporte;
  estado: EstadoReporte;
  /** Día en que se vio la situación, 'YYYY-MM-DD'. */
  fechaReporte: string;
  /** Fecha y hora de envío (la pone el sistema). */
  enviadoEn: string;
  autor: { cuil: string; nombre: string };
  provincia: ItemCatalogo;
  contrato: ContratoResumen;
  tarea: ItemCatalogo;
  ubicacion: string | null;
  descripcion: string;
  naturaleza: ItemCatalogo | null;
  motivoParalizacion: ItemCatalogo | null;
  controlRiesgo: string | null;
  involucrados: { cuil: string; nombre: string }[];
  fotos: FotoReporte[];
  punto: { latitud: number; longitud: number; errorMetros: number | null } | null;
  puntaje: number | null;
  comentarioHys: string | null;
  /** Solo para HyS y Admin; el autor no ve quién lo calificó. */
  calificadoPor: { cuil: string; nombre: string } | null;
  calificadoEn: string | null;
  motivoAnulacion: string | null;
  alarma: boolean;
}

export interface ReporteInput {
  tipo: TipoReporte;
  fechaReporte: string;
  provinciaId: number;
  contratoId: number;
  tareaId: number;
  ubicacion?: string;
  descripcion: string;
  naturalezaId?: number;
  motivoParalizacionId?: number;
  controlRiesgo?: string;
  involucrados?: string[];
}

export interface Periodo {
  id: number;
  nombre: string;
  desde: string;
  hasta: string;
}

export interface MisPuntos {
  periodo: Periodo | null;
  puntos: { total: number; mas: number; menos: number };
  /** null: no compite (HyS, fuera de nómina) o todavía no tiene movimientos. */
  posicion: { puesto: number; de: number } | null;
  /** Quienes van delante, sin nombres. */
  delante: { puesto: number; total: number }[];
  inspecciones: { fecha: string; naturaleza: string | null; contrato: string; descripcion: string; puntos: number }[];
  movimientos: { fecha: string; tipo: TipoReporte; reporteId: number | null; puntos: number }[];
}

/** Una foto tal como se sube: ya achicada, con su origen y, si es de cámara,
 * la ubicación del momento en que se sacó. */
export interface FotoParaSubir {
  grupo: GrupoFoto;
  origen: OrigenFoto;
  blob: Blob;
  ubicacion: { latitud: number; longitud: number; errorMetros: number } | null;
}

const CLAVE = ['seguridad'] as const;

export function useCatalogosSeguridad() {
  return useQuery({
    queryKey: [...CLAVE, 'catalogos'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => (await api.get<CatalogosSeguridad>('/seguridad/catalogos')).data,
  });
}

export function useMisReportes() {
  return useQuery({
    queryKey: [...CLAVE, 'mios'],
    queryFn: async () => (await api.get<ReporteSeguridad[]>('/seguridad/reportes/mios')).data,
  });
}

export function useReporte(id: number | null) {
  return useQuery({
    queryKey: [...CLAVE, 'reporte', id],
    enabled: id != null,
    queryFn: async () => (await api.get<ReporteSeguridad>(`/seguridad/reportes/${id}`)).data,
  });
}

export function useMisPuntos(periodoId?: number) {
  return useQuery({
    queryKey: [...CLAVE, 'mis-puntos', periodoId ?? null],
    queryFn: async () =>
      (await api.get<MisPuntos>('/seguridad/mis-puntos', { params: periodoId ? { periodoId } : {} })).data,
  });
}

export function usePeriodos() {
  return useQuery({
    queryKey: [...CLAVE, 'periodos'],
    queryFn: async () => (await api.get<(Periodo & { actual: boolean })[]>('/seguridad/periodos')).data,
  });
}

function invalidar(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: CLAVE });
}

export function useCrearReporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReporteInput) => (await api.post<ReporteSeguridad>('/seguridad/reportes', input)).data,
    onSuccess: () => invalidar(qc),
  });
}

export function useEditarReporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: ReporteInput }) =>
      (await api.patch<ReporteSeguridad>(`/seguridad/reportes/${id}`, input)).data,
    onSuccess: () => invalidar(qc),
  });
}

export function useAnularReporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) =>
      (await api.patch<ReporteSeguridad>(`/seguridad/reportes/${id}/anular`, { motivo })).data,
    onSuccess: () => invalidar(qc),
  });
}

/** Sube una foto a un reporte ya creado (multipart). Sin invalidar: quien
 * sube varias seguidas invalida una sola vez al final. */
export async function subirFoto(reporteId: number, foto: FotoParaSubir) {
  const form = new FormData();
  form.append('foto', foto.blob, `foto-${foto.grupo}.jpg`);
  form.append('grupo', foto.grupo);
  form.append('origen', foto.origen);
  if (foto.ubicacion) {
    form.append('latitud', String(foto.ubicacion.latitud));
    form.append('longitud', String(foto.ubicacion.longitud));
    form.append('errorMetros', String(Math.round(foto.ubicacion.errorMetros)));
  }
  return (await api.post<ReporteSeguridad>(`/seguridad/reportes/${reporteId}/fotos`, form)).data;
}

export function useQuitarFoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reporteId, fotoId }: { reporteId: number; fotoId: number }) =>
      (await api.delete<ReporteSeguridad>(`/seguridad/reportes/${reporteId}/fotos/${fotoId}`)).data,
    onSuccess: () => invalidar(qc),
  });
}

export function useInvalidarSeguridad() {
  const qc = useQueryClient();
  return () => invalidar(qc);
}

export const urlFoto = (reporteId: number, fotoId: number) => `/seguridad/reportes/${reporteId}/fotos/${fotoId}`;
