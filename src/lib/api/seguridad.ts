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
  /** HyS, o un inspector habilitado: ve el tipo "Inspección de seguridad". */
  puedeInspeccionar: boolean;
}

/** De dónde salió el punto propio del reporte (ADR-027, revisión 2026-10-15). */
export type OrigenPunto = 'gps' | 'mapa';

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
  /** `gps`: tomado con "Tomar mi ubicación"; `mapa`: marcado a mano en el
   * mapa (sin error); `foto`: de la foto de cámara con menor error. */
  punto: { latitud: number; longitud: number; errorMetros: number | null; origen: OrigenPunto | 'foto' } | null;
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
  /** Punto propio del reporte (obligatorio en la paralización): GPS o
   * marcado en el mapa. El del mapa no lleva `errorMetros`. */
  latitud?: number;
  longitud?: number;
  errorMetros?: number;
  origenPunto?: OrigenPunto;
  descripcion: string;
  naturalezaId?: number;
  motivoParalizacionId?: number;
  controlRiesgo?: string;
  involucrados?: string[];
}

/** Rango de consulta de puntos, ranking y tableros ('YYYY-MM-DD', bordes
 * incluidos). Vacío = el año en curso (lo resuelve el backend). */
export interface RangoConsulta {
  desde?: string;
  hasta?: string;
}

export interface MisPuntos {
  desde: string;
  hasta: string;
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

export function useMisPuntos(rango: RangoConsulta) {
  return useQuery({
    queryKey: [...CLAVE, 'mis-puntos', rango],
    queryFn: async () => (await api.get<MisPuntos>('/seguridad/mis-puntos', { params: rango })).data,
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

// ---------------------------------------------------------------- HyS y Admin

export interface FiltrosPanel {
  estado?: EstadoReporte;
  tipo?: TipoReporte;
  desde?: string;
  hasta?: string;
}

export interface RangoRespuesta {
  desde: string;
  hasta: string;
}

export interface FilaRanking {
  cuil: string;
  nombre: string;
  legajo: number | null;
  mas: number;
  menos: number;
  total: number;
  puesto: number;
}

export interface Ranking extends RangoRespuesta {
  /** Reportes del rango que siguen pendientes: el ranking todavía puede cambiar. */
  pendientes: number;
  filas: FilaRanking[];
}

export interface Conteo {
  nombre: string;
  cantidad: number;
}

export interface Tableros extends RangoRespuesta {
  totales: { reportes: number; inspecciones: number; pendientes: number; aprobados: number; desaprobados: number };
  participacion: { personas: number; nominaActiva: number };
  respuestaHysDias: number | null;
  conPunto: number;
  porTipo: Conteo[];
  porContrato: Conteo[];
  porTarea: Conteo[];
  porProvincia: Conteo[];
  porMotivoParalizacion: Conteo[];
  porNaturaleza: { nombre: string; reportes: number; inspecciones: number }[];
  porMes: { mes: string; reportes: number; inspecciones: number }[];
  masInspeccionados: { cuil: string; nombre: string; cantidad: number; puntos: number }[];
  /** Quiénes más reportan (sin inspecciones), por cantidad de envíos. */
  masReportan: { cuil: string; nombre: string; enviados: number; aprobados: number; puntos: number }[];
  /** Inspecciones cargadas por HyS vs. por los inspectores habilitados. */
  inspeccionesPorOrigen: { hys: number; inspectores: number };
}

export interface CalificacionInput {
  decision: 'aprobar' | 'desaprobar';
  puntaje?: number;
  comentario?: string;
}

export type CatalogoSeguridad = 'naturalezas' | 'motivos';

export interface ItemCatalogoAdmin extends ItemCatalogo {
  activo: boolean;
}

function limpiar<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>;
}

export function usePanelReportes(filtros: FiltrosPanel, enabled = true) {
  return useQuery({
    queryKey: [...CLAVE, 'panel', filtros],
    enabled,
    queryFn: async () => (await api.get<ReporteSeguridad[]>('/seguridad/panel', { params: limpiar(filtros) })).data,
  });
}

export function useCalificarReporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: CalificacionInput }) =>
      (await api.patch<ReporteSeguridad>(`/seguridad/reportes/${id}/calificar`, input)).data,
    onSuccess: () => invalidar(qc),
  });
}

export function useReabrirReporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.patch<ReporteSeguridad>(`/seguridad/reportes/${id}/reabrir`)).data,
    onSuccess: () => invalidar(qc),
  });
}

export function useRanking(rango: RangoConsulta) {
  return useQuery({
    queryKey: [...CLAVE, 'ranking', rango],
    queryFn: async () => (await api.get<Ranking>('/seguridad/ranking', { params: limpiar(rango) })).data,
  });
}

export function useTableros(rango: RangoConsulta) {
  return useQuery({
    queryKey: [...CLAVE, 'tableros', rango],
    queryFn: async () => (await api.get<Tableros>('/seguridad/tableros', { params: limpiar(rango) })).data,
  });
}

export function useCatalogoAdmin(catalogo: CatalogoSeguridad) {
  return useQuery({
    queryKey: [...CLAVE, 'admin', catalogo],
    queryFn: async () => (await api.get<ItemCatalogoAdmin[]>(`/seguridad/admin/${catalogo}`)).data,
  });
}

export function useCrearEnCatalogo(catalogo: CatalogoSeguridad) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nombre: string) => (await api.post<ItemCatalogoAdmin>(`/seguridad/admin/${catalogo}`, { nombre })).data,
    onSuccess: () => invalidar(qc),
  });
}

export function useEditarEnCatalogo(catalogo: CatalogoSeguridad) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: number; cambios: { nombre?: string; activo?: boolean } }) =>
      (await api.patch<ItemCatalogoAdmin>(`/seguridad/admin/${catalogo}/${id}`, cambios)).data,
    onSuccess: () => invalidar(qc),
  });
}

/** HyS corrige un reporte ajeno, en cualquier estado salvo anulado; si estaba
 * aprobado, el backend recalcula los puntos (ADR-027, revisión 2026-10-08). */
export function useCorregirReporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: ReporteInput }) =>
      (await api.patch<ReporteSeguridad>(`/seguridad/reportes/${id}/corregir`, input)).data,
    onSuccess: () => invalidar(qc),
  });
}

// ------------------------------------------------------------- inspectores

export interface Inspector {
  cuil: string;
  nombre: string;
  rol: string;
  activo: boolean;
  habilitadoPor: string;
  habilitadoEn: string;
}

export function useInspectores() {
  return useQuery({
    queryKey: [...CLAVE, 'inspectores'],
    queryFn: async () => (await api.get<Inspector[]>('/seguridad/inspectores')).data,
  });
}

export function useHabilitarInspector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cuil: string) => (await api.post<Inspector[]>('/seguridad/inspectores', { cuil })).data,
    onSuccess: () => invalidar(qc),
  });
}

export function useDeshabilitarInspector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cuil: string) => (await api.delete<Inspector[]>(`/seguridad/inspectores/${cuil}`)).data,
    onSuccess: () => invalidar(qc),
  });
}
