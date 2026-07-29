import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface CategoriaUocra {
  id: number;
  nombre: string;
  activo: boolean;
}

export type RegimenLiquidacion = 'jornalizado' | 'fijo' | 'mensualizado' | 'por_tantos' | 'administrativo';
export type ModalidadPago = 'en_b' | 'con_descuentos';
export type TipoBonoNoRemunerativo = 'monto_fijo' | 'porcentaje';

export interface PerfilLiquidacion {
  cuil: string;
  regimen: RegimenLiquidacion;
  categoriaUocraId: number | null;
  modalidadPago: ModalidadPago | null;
  empleado: { apellido_nombre: string; legajo: number; cargo: string };
  categoria: { id: number; nombre: string } | null;
}

// ---- Ronda mensual de tarifas (ver ADR-010 y ADR-011) ----
export interface EstadoTarifas {
  ultimoPeriodo: { anio: number; mes: number } | null;
  categorias: {
    id: number;
    nombre: string;
    importeHoraActual: string | null;
    bonoNoRemunerativoActual: { tipo: TipoBonoNoRemunerativo; valor: string } | null;
  }[];
  tiposNovedad: { id: number; nombre: string; montoPorDiaActual: string | null }[];
  rangosKm: { kmDesde: string; kmHasta: string | null; precioPorKmActual: string }[];
}

export interface CargarRondaTarifasInput {
  mes: number;
  anio: number;
  categorias: { categoriaUocraId: number; importeHora: number }[];
  tiposNovedad: { tipoNovedadId: number; montoPorDia: number }[];
  rangosKm: { kmDesde: number; kmHasta?: number; precioPorKm: number }[];
  bonosNoRemunerativos: { categoriaUocraId: number; tipo: TipoBonoNoRemunerativo; valor: number }[];
}

// ---- Datos variables por quincena ----
export interface MontoMensualizadoItem {
  cuil: string;
  apellidoNombre: string;
  monto: string | null;
}
export interface KmPorTantosItem {
  cuil: string;
  apellidoNombre: string;
  kmTotal: string | null;
}

export interface CalculoQuincenaItem {
  cuil: string;
  apellidoNombre: string;
  legajo: number;
  categoria: string | null;
  regimen: RegimenLiquidacion;
  provincia: string;
  precioBruto: number | null;
  horasTotal: number;
  horasCct: number;
  totalBruto: number;
  horasExtra: number;
  montoHorasExtra: number;
  tienePresentismo: boolean;
  montoPresentismo: number;
  plus: { tipoNovedadId: number; nombre: string; dias: number; monto: number }[];
  noRemunerativo: number;
  novedadesTexto: string;
  total: number;
  datoFaltante: string | null;
}

export interface AlertasQuincena {
  sinPerfil: { cuil: string; apellidoNombre: string; horasAprobadas: number; horasPendientes: number }[];
  perfilIncompleto: {
    cuil: string;
    apellidoNombre: string;
    regimen: RegimenLiquidacion;
    faltaCategoria: boolean;
    faltaModalidad: boolean;
  }[];
  sinHorasAprobadas: {
    cuil: string;
    apellidoNombre: string;
    motivo: 'pendientes' | 'sin_declarar';
    horasPendientes: number;
  }[];
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

// ---- Ronda mensual de tarifas ----
export function useEstadoTarifas() {
  return useQuery({ queryKey: ['liquidacion', 'tarifas-estado'], queryFn: () => get<EstadoTarifas>('/liquidacion/tarifas/estado') });
}
export function useCargarRondaTarifas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CargarRondaTarifasInput) =>
      api.post<{ mesesCompletados: { anio: number; mes: number }[] }>('/liquidacion/tarifas/ronda', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liquidacion', 'tarifas-estado'] }),
  });
}

// ---- Perfiles de liquidación (régimen + categoría por empleado) ----
export function usePerfilesLiquidacion() {
  return useQuery({ queryKey: ['liquidacion', 'perfiles'], queryFn: () => get<PerfilLiquidacion[]>('/liquidacion/perfiles') });
}
export function useUpsertPerfilesMasivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      cuils: string[];
      regimen: RegimenLiquidacion;
      categoriaUocraId?: number;
      modalidadPago?: ModalidadPago;
    }) => api.post<{ asignados: number; omitidos: string[] }>('/liquidacion/perfiles/masivo', dto).then((r) => r.data),
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

// ---- Datos variables por quincena (mensualizado / por tantos) ----
export function useMontosMensualizados(anio: number, mes: number, quincena: number) {
  return useQuery({
    queryKey: ['liquidacion', 'montos-mensualizados', anio, mes, quincena],
    queryFn: () => get<MontoMensualizadoItem[]>('/liquidacion/quincena/montos-mensualizados', { anio, mes, quincena }),
  });
}
export function useCargarMontosMensualizados() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { anio: number; mes: number; quincena: number; montos: { cuil: string; monto: number }[] }) =>
      api.post('/liquidacion/quincena/montos-mensualizados', dto).then((r) => r.data),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ['liquidacion', 'montos-mensualizados', vars.anio, vars.mes, vars.quincena] }),
  });
}

export function useKmPorTantos(anio: number, mes: number, quincena: number) {
  return useQuery({
    queryKey: ['liquidacion', 'km-por-tantos', anio, mes, quincena],
    queryFn: () => get<KmPorTantosItem[]>('/liquidacion/quincena/km-por-tantos', { anio, mes, quincena }),
  });
}
export function useCargarKmPorTantos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { anio: number; mes: number; quincena: number; kms: { cuil: string; kmTotal: number }[] }) =>
      api.post('/liquidacion/quincena/km-por-tantos', dto).then((r) => r.data),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ['liquidacion', 'km-por-tantos', vars.anio, vars.mes, vars.quincena] }),
  });
}

// ---- Cálculo de la quincena ----
export function useCalculoQuincena(anio: number, mes: number, quincena: number, enabled = true) {
  return useQuery({
    queryKey: ['liquidacion', 'calculo', anio, mes, quincena],
    queryFn: () => get<CalculoQuincenaItem[]>('/liquidacion/quincena/calculo', { anio, mes, quincena }),
    enabled,
  });
}

// ---- Alertas previas a liquidar ----
export function useAlertasQuincena(anio: number, mes: number, quincena: number) {
  return useQuery({
    queryKey: ['liquidacion', 'alertas', anio, mes, quincena],
    queryFn: () => get<AlertasQuincena>('/liquidacion/quincena/alertas', { anio, mes, quincena }),
  });
}
