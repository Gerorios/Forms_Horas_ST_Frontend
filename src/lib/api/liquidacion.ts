import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface CategoriaUocra {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface TarifaCategoria {
  id: number;
  categoriaUocraId: number;
  vigenteDesde: string;
  importeHora: string;
  categoria: { nombre: string };
}

export interface MontoNovedadPlus {
  id: number;
  tipoNovedadId: number;
  vigenteDesde: string;
  montoPorDia: string;
  tipoNovedad: { nombre: string };
}

export interface RangoKm {
  id: number;
  vigenteDesde: string;
  kmDesde: string;
  kmHasta: string | null;
  precioPorKm: string;
}

export type RegimenLiquidacion = 'jornalizado' | 'fijo' | 'por_tantos';
export type ModalidadHoraExtra = 'en_b' | 'con_descuentos';

export interface PerfilLiquidacion {
  cuil: string;
  regimen: RegimenLiquidacion;
  categoriaUocraId: number | null;
  modalidadHoraExtra: ModalidadHoraExtra | null;
  empleado: { apellido_nombre: string; legajo: number; cargo: string };
  categoria: { id: number; nombre: string } | null;
}

const get = async <T>(url: string, params?: Record<string, unknown>) =>
  (await api.get<T>(url, params ? { params } : undefined)).data;

// ---- Categorías UOCRA ----
export function useCategoriasUocra() {
  return useQuery({ queryKey: ['liquidacion', 'categorias'], queryFn: () => get<CategoriaUocra[]>('/liquidacion/categorias-uocra') });
}
export function useCrearCategoriaUocra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { nombre: string }) => api.post('/liquidacion/categorias-uocra', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liquidacion', 'categorias'] }),
  });
}
export function useToggleCategoriaUocra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.post(`/liquidacion/categorias-uocra/${id}/activo`, { activo }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liquidacion', 'categorias'] }),
  });
}

// ---- Tarifas por categoría ----
export function useTarifasCategoria() {
  return useQuery({ queryKey: ['liquidacion', 'tarifas'], queryFn: () => get<TarifaCategoria[]>('/liquidacion/tarifas-categoria') });
}
export function useCrearTarifaCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { categoriaUocraId: number; vigenteDesde: string; importeHora: number }) =>
      api.post('/liquidacion/tarifas-categoria', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liquidacion', 'tarifas'] }),
  });
}

// ---- Monto por novedad con plus ----
export function useMontosNovedadPlus() {
  return useQuery({ queryKey: ['liquidacion', 'montos-plus'], queryFn: () => get<MontoNovedadPlus[]>('/liquidacion/montos-novedad-plus') });
}
export function useCrearMontoNovedadPlus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { tipoNovedadId: number; vigenteDesde: string; montoPorDia: number }) =>
      api.post('/liquidacion/montos-novedad-plus', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liquidacion', 'montos-plus'] }),
  });
}

// ---- Rangos de km (por tantos) ----
export function useRangosKm() {
  return useQuery({ queryKey: ['liquidacion', 'rangos-km'], queryFn: () => get<RangoKm[]>('/liquidacion/rangos-km') });
}
export function useCrearRangoKm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { vigenteDesde: string; kmDesde: number; kmHasta?: number; precioPorKm: number }) =>
      api.post('/liquidacion/rangos-km', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liquidacion', 'rangos-km'] }),
  });
}

// ---- Perfiles de liquidación (régimen + categoría por empleado) ----
export function usePerfilesLiquidacion() {
  return useQuery({ queryKey: ['liquidacion', 'perfiles'], queryFn: () => get<PerfilLiquidacion[]>('/liquidacion/perfiles') });
}
export function useUpsertPerfilLiquidacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      cuil,
      ...dto
    }: {
      cuil: string;
      regimen: RegimenLiquidacion;
      categoriaUocraId?: number;
      modalidadHoraExtra?: ModalidadHoraExtra;
    }) => api.post(`/liquidacion/perfiles/${cuil}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liquidacion', 'perfiles'] }),
  });
}
export function useEliminarPerfilLiquidacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cuil: string) => api.delete(`/liquidacion/perfiles/${cuil}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liquidacion', 'perfiles'] }),
  });
}
