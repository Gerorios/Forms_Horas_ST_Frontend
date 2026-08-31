import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface CategoriaUocra {
  id: number;
  nombre: string;
  activo: boolean;
}

export type RegimenLiquidacion = 'jornalizado' | 'fijo' | 'fijo_105' | 'mensualizado' | 'por_tantos' | 'administrativo';
export type ModalidadPago = 'en_b' | 'con_descuentos';
export type TipoBonoNoRemunerativo = 'monto_fijo' | 'porcentaje';

export interface PerfilLiquidacion {
  cuil: string;
  regimen: RegimenLiquidacion;
  categoriaUocraId: number | null;
  modalidadPago: ModalidadPago | null;
  /** Contratos de imputación para el corte por contrato del Análisis: solo
   * aplica a mensualizado/fijo/por_tantos; el costo se reparte en partes
   * iguales entre estos contratos (plan 2026-08-12, addendum). */
  contratosImputacionIds: number[];
  /** Solo tiene sentido con regimen='fijo': además del básico fijo, cobra horas extra sobre lo declarado (ver ADR-017). */
  permiteHorasExtra: boolean;
  empleado: { apellido_nombre: string; legajo: number; cargo: string };
  categoria: { id: number; nombre: string } | null;
}

/** Contrato visible para el Liquidador (GET /liquidacion/contratos — el
 * Liquidador no puede usar /admin/contratos). */
export interface ContratoLiquidacion {
  id: number;
  codigo: string;
  nombre: string;
}

// ---- Precios por período (ver ADR-018, reemplaza la ronda mensual de
// ADR-010): cada sección se lee/guarda de forma independiente, por período
// exacto — sin relleno de huecos ni bloqueo entre meses. ----

export interface Sugerencia {
  valor: string;
  periodo: { anio: number; mes: number };
}

export interface CategoriaPeriodoItem {
  id: number;
  nombre: string;
  resuelto: boolean;
  importeHora: string | null;
  sugerencia: Sugerencia | null;
}

export interface BonoPeriodoItem {
  categoriaUocraId: number;
  nombre: string;
  resuelto: boolean;
  bono: { tipo: TipoBonoNoRemunerativo; valor: string } | null;
  sugerencia: (Omit<Sugerencia, 'valor'> & { tipo: TipoBonoNoRemunerativo; valor: string }) | null;
}

export interface NovedadPlusPeriodoItem {
  tipoNovedadId: number;
  nombre: string;
  resuelto: boolean;
  montoPorDia: string | null;
  sugerencia: Sugerencia | null;
}

export interface RangoKmItem {
  kmDesde: string;
  kmHasta: string | null;
  precioPorKm: string;
}

export interface RangosKmPeriodo {
  resuelto: boolean;
  rangosKm: RangoKmItem[];
  sugerencia: { rangosKm: RangoKmItem[]; periodo: { anio: number; mes: number } } | null;
}

// ---- Sueldos mensualizados (por período — ver ADR-018, reemplaza ADR-016) ----
export interface SueldoMensualizadoItem {
  cuil: string;
  apellidoNombre: string;
  /** Nombre de la categoría UOCRA del perfil (define el bono no remunerativo,
   * no el sueldo fijo). null si el perfil no tiene categoría asignada. */
  categoria: string | null;
  resuelto: boolean;
  monto: string | null;
  sugerencia: Sugerencia | null;
}

// ---- Datos variables por quincena ----
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
  plusIndividual: number | null;
  plusIndividualMotivo: string | null;
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

/**
 * Extrae un mensaje de error legible de una respuesta de la API (Nest suele
 * mandar `message` como string o, con class-validator, como array de
 * strings). Si no hay nada útil, cae al mensaje genérico que le pasa el
 * caller.
 */
export function mensajeDeError(e: unknown, fallback = 'Ocurrió un error inesperado'): string {
  const data = (e as { response?: { data?: { message?: string | string[] } } } | undefined)?.response?.data;
  const message = data?.message;
  if (Array.isArray(message)) {
    const texto = message.filter((m) => typeof m === 'string' && m.trim() !== '').join(', ');
    return texto !== '' ? texto : fallback;
  }
  if (typeof message === 'string' && message.trim() !== '') return message;
  return fallback;
}

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

function periodoHabilitado(anio: number, mes: number) {
  return Number.isInteger(anio) && anio > 0 && Number.isInteger(mes) && mes >= 1 && mes <= 12;
}

// ---- Sección: tarifa por hora por categoría UOCRA (obligatorio) ----
export function useCategoriasPeriodo(anio: number, mes: number) {
  return useQuery({
    queryKey: ['liquidacion', 'tarifas-categorias', anio, mes],
    queryFn: () => get<CategoriaPeriodoItem[]>(`/liquidacion/tarifas/categorias/${anio}/${mes}`),
    enabled: periodoHabilitado(anio, mes),
  });
}
export function useGuardarCategoriasPeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ anio, mes, categorias }: { anio: number; mes: number; categorias: { categoriaUocraId: number; importeHora: number }[] }) =>
      api.put<CategoriaPeriodoItem[]>(`/liquidacion/tarifas/categorias/${anio}/${mes}`, { categorias }).then((r) => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['liquidacion', 'tarifas-categorias', vars.anio, vars.mes] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincena-detalle'] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincenas'] });
    },
  });
}

// ---- Sección: bono no remunerativo por categoría (único campo opcional; la
// tarifa gana quincena, ver plan cierre-liquidacion-export) ----
export function useBonosPeriodo(anio: number, mes: number, quincena: number) {
  return useQuery({
    queryKey: ['liquidacion', 'tarifas-bonos', anio, mes, quincena],
    queryFn: () => get<BonoPeriodoItem[]>(`/liquidacion/tarifas/bonos/${anio}/${mes}/${quincena}`),
    enabled: periodoHabilitado(anio, mes),
  });
}
export function useGuardarBonosPeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      anio,
      mes,
      quincena,
      bonos,
    }: {
      anio: number;
      mes: number;
      quincena: number;
      bonos: { categoriaUocraId: number; tipo: TipoBonoNoRemunerativo; valor: number }[];
    }) => api.put<BonoPeriodoItem[]>(`/liquidacion/tarifas/bonos/${anio}/${mes}/${quincena}`, { bonos }).then((r) => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['liquidacion', 'tarifas-bonos', vars.anio, vars.mes, vars.quincena] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincena-detalle'] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincenas'] });
    },
  });
}

// ---- Sección: monto por novedad con plus — Guardia Pasiva, Viáticos, etc. (obligatorio) ----
export function useNovedadesPlusPeriodo(anio: number, mes: number) {
  return useQuery({
    queryKey: ['liquidacion', 'tarifas-novedades-plus', anio, mes],
    queryFn: () => get<NovedadPlusPeriodoItem[]>(`/liquidacion/tarifas/novedades-plus/${anio}/${mes}`),
    enabled: periodoHabilitado(anio, mes),
  });
}
export function useGuardarNovedadesPlusPeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ anio, mes, tiposNovedad }: { anio: number; mes: number; tiposNovedad: { tipoNovedadId: number; montoPorDia: number }[] }) =>
      api.put<NovedadPlusPeriodoItem[]>(`/liquidacion/tarifas/novedades-plus/${anio}/${mes}`, { tiposNovedad }).then((r) => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['liquidacion', 'tarifas-novedades-plus', vars.anio, vars.mes] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincena-detalle'] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincenas'] });
    },
  });
}

// ---- Sección: rangos de km "por tantos" (obligatorio, reemplazo completo del período) ----
export function useRangosKmPeriodo(anio: number, mes: number) {
  return useQuery({
    queryKey: ['liquidacion', 'tarifas-rangos-km', anio, mes],
    queryFn: () => get<RangosKmPeriodo>(`/liquidacion/tarifas/rangos-km/${anio}/${mes}`),
    enabled: periodoHabilitado(anio, mes),
  });
}
export function useGuardarRangosKmPeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ anio, mes, rangosKm }: { anio: number; mes: number; rangosKm: { kmDesde: number; kmHasta?: number; precioPorKm: number }[] }) =>
      api.put<RangosKmPeriodo>(`/liquidacion/tarifas/rangos-km/${anio}/${mes}`, { rangosKm }).then((r) => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['liquidacion', 'tarifas-rangos-km', vars.anio, vars.mes] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincena-detalle'] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincenas'] });
    },
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
      permiteHorasExtra?: boolean;
    }) => api.post<{ asignados: number; omitidos: string[] }>('/liquidacion/perfiles/masivo', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liquidacion', 'perfiles'] }),
  });
}
export function useContratosLiquidacion() {
  return useQuery({
    queryKey: ['liquidacion', 'contratos'],
    queryFn: () => get<ContratoLiquidacion[]>('/liquidacion/contratos'),
  });
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
      modalidadPago?: ModalidadPago;
      /** Reemplaza el set completo; ausente = no tocar. */
      contratosImputacionIds?: number[];
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

export function useSueldosMensualizados(anio: number, mes: number) {
  return useQuery({
    queryKey: ['liquidacion', 'sueldos-mensualizados', anio, mes],
    queryFn: () => get<SueldoMensualizadoItem[]>('/liquidacion/tarifas/sueldos-mensualizados', { anio, mes }),
  });
}
export function useGuardarSueldosMensualizados() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { anio: number; mes: number; sueldos: { cuil: string; monto: number }[] }) =>
      api.put<SueldoMensualizadoItem[]>('/liquidacion/tarifas/sueldos-mensualizados', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['liquidacion', 'sueldos-mensualizados'] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincena-detalle'] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincenas'] });
    },
  });
}

// ---- Plus individual (ver ADR-018): monto puntual por empleado/quincena,
// con motivo — independiente de categoría, no versionado por período. ----
export interface PlusIndividualItem {
  id: number;
  cuil: string;
  anio: number;
  mes: number;
  quincena: number;
  monto: string;
  motivo: string;
  cargadoPorCuil: string;
  createdAt: string;
  empleado: { apellido_nombre: string };
}

export function usePlusIndividual(anio: number, mes: number, quincena: number) {
  return useQuery({
    queryKey: ['liquidacion', 'plus-individual', anio, mes, quincena],
    queryFn: () => get<PlusIndividualItem[]>('/liquidacion/plus-individual', { anio, mes, quincena }),
  });
}
export function useCargarPlusIndividual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { cuil: string; anio: number; mes: number; quincena: number; monto: number; motivo: string }) =>
      api.post<PlusIndividualItem>('/liquidacion/plus-individual', dto).then((r) => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['liquidacion', 'plus-individual', vars.anio, vars.mes, vars.quincena] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincena-detalle'] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincenas'] });
    },
  });
}
export function useEliminarPlusIndividual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/liquidacion/plus-individual/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['liquidacion', 'plus-individual'] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincena-detalle'] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincenas'] });
    },
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
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['liquidacion', 'km-por-tantos', vars.anio, vars.mes, vars.quincena] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincena-detalle'] });
    },
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
export function useAlertasQuincena(anio: number, mes: number, quincena: number, enabled = true) {
  return useQuery({
    queryKey: ['liquidacion', 'alertas', anio, mes, quincena],
    queryFn: () => get<AlertasQuincena>('/liquidacion/quincena/alertas', { anio, mes, quincena }),
    enabled,
  });
}

// ---- Panel de quincenas (estado derivado) ----
export type EstadoQuincena = 'con_pendientes' | 'con_alertas' | 'lista';

export interface QuincenaResumen {
  anio: number;
  mes: number;
  quincena: 1 | 2;
  estado: EstadoQuincena;
  pendientes: number;
  alertas: number;
}

export function useQuincenas() {
  return useQuery({
    queryKey: ['liquidacion', 'quincenas'],
    queryFn: () => get<QuincenaResumen[]>('/liquidacion/quincenas'),
  });
}

// ---- Detalle de quincena (drill-down por empleado) ----
export interface DiaAprobado {
  fecha: string;
  contratoCodigo: string;
  tareas: string[];
  horas: string;
  cargadoPor: string;
  /** horas × tarifa vigente de su categoría; null si no hay categoría/tarifa. */
  importeEstimado: string | null;
}

export interface NovedadDetalle {
  tipo: string;
  desde: string;
  hasta: string;
  efecto: string;
}

export interface FilaDetalleEmpleado {
  cuil: string;
  nombre: string;
  regimen: RegimenLiquidacion;
  categoria: string | null;
  /** Solo "por tantos": km × precio del rango, antes de convertir a horas. Null para el resto. Ver ADR-015. */
  montoKmBruto: string | null;
  horasTotal: string | null;
  horasCct: string | null;
  horasExtra: string | null;
  basico: string;
  montoExtra: string;
  presentismo: string;
  totalPlus: string;
  noRemunerativo: string;
  plusIndividual: string | null;
  plusIndividualMotivo: string | null;
  total: string;
  modalidadPago: ModalidadPago | null;
  etiquetaNovedades: string;
  datoFaltante: string | null;
  /** spec §6.4: provincia no mapeada (ver zonaDeProvincia en el backend) → null. */
  zona: 'norte' | 'sur' | null;
  pendientesAprobacion: number;
  duplicadoCruzado: boolean;
  dias: DiaAprobado[];
  novedades: NovedadDetalle[];
}

export interface EmpleadoSinPerfil {
  cuil: string;
  nombre: string;
  horasAprobadas: string;
  motivo: 'sin_perfil' | 'perfil_incompleto';
}

export interface DetalleQuincena {
  filas: FilaDetalleEmpleado[];
  sinPerfil: EmpleadoSinPerfil[];
}

export function useDetalleQuincena(anio: number, mes: number, quincena: number, enabled = true) {
  return useQuery({
    queryKey: ['liquidacion', 'quincena-detalle', anio, mes, quincena],
    queryFn: () => get<DetalleQuincena>('/liquidacion/quincena/detalle', { anio, mes, quincena }),
    enabled,
  });
}

// ---- Análisis de la quincena (KPIs, composición, prorrateo por contrato) ----
// Contrato de datos compartido con el backend (plan 2026-08-12-analisis-quincena).
export interface AnalisisQuincena {
  periodo: { anio: number; mes: number; quincena: number };
  totales: {
    total: number;            // suma de fila.total de la quincena
    empleados: number;
    empleadosNuevos: number;  // sin fila en la quincena anterior
    horasCct: number;
    horasExtra: number;
    costoPromedio: number;    // total / empleados (0 si no hay empleados)
  };
  anterior: { total: number; empleados: number; costoPromedio: number } | null; // null si el motor devuelve 0 filas para la anterior
  composicion: { basico: number; extras: number; presentismo: number; plus: number; bono: number };
  topCobradores: {            // top 10 por total desc
    cuil: string; nombre: string; total: number;
    totalAnterior: number | null; deltaPct: number | null; // null = nuevo
    diasTrabajados: number;
  }[];
  contratos: {                // orden: monto desc; el bucket sin contrato va último
    contratoId: number | null;         // null = "Sin contrato asignable"
    codigo: string;                    // 'Sin contrato asignable' para el bucket
    nombre: string;
    monto: number;                     // prorrateo por horas del total de cada empleado
    horas: number;                     // horas aprobadas del contrato en la quincena (0 en el bucket)
    pctDelTotal: number;               // monto / totales.total * 100, 1 decimal
  }[];
  historico: { anio: number; mes: number; quincena: number; total: number }[]; // 8 quincenas asc, incluida la actual
  variaciones: {              // TODOS los empleados; orden |deltaPct| desc, los nuevos (delta null) al final
    cuil: string; nombre: string; regimen: string;
    total: number; totalAnterior: number | null;
    deltaMonto: number | null; deltaPct: number | null;
    diasTrabajados: number;
  }[];
}

export function useAnalisisQuincena(anio: number, mes: number, quincena: number) {
  return useQuery({
    queryKey: ['liquidacion', 'analisis', anio, mes, quincena],
    queryFn: () => get<AnalisisQuincena>('/liquidacion/analisis', { anio, mes, quincena }),
  });
}

// ---- Cierres de liquidación (ver plan 2026-08-30-cierre-liquidacion-export).
// Los Decimal de Prisma llegan serializados por JSON como string (mismo
// criterio que el resto del archivo, p.ej. BonoPeriodoItem.bono.valor); por
// eso los montos de CierreDetalleFila se tipan `number | string` — el
// backend los emite `number` en el cálculo en memoria y `string` en los
// pocos casos donde el detalle persistido devuelve el Decimal crudo. ----
export interface CierreResumen {
  id: number;
  anio: number;
  mes: number;
  quincena: number;
  version: number;
  cerradoPor: { cuil: string; nombre: string };
  nota: string | null;
  /** El backend deserializa el JSON guardado; siempre llega como array. */
  salvedades: string[];
  createdAt: string;
  totales: { total: number; norte: number; sur: number; sinZona: number; empleados: number };
}

export interface CierreDetalleFila {
  cuil: string;
  apellidoNombre: string;
  legajo: number | null;
  provincia: string | null;
  localidad: string | null;
  zona: 'norte' | 'sur' | null;
  regimen: string;
  categoria: string | null;
  modalidadPago: string | null;
  tienePresentismo: boolean;
  precioBruto: number | string | null;
  horasTotal: number | string | null;
  horasCct: number | string | null;
  horasExtra: number | string | null;
  totalBruto: number | string;
  montoHorasExtra: number | string;
  montoPresentismo: number | string;
  noRemunerativo: number | string;
  montoGuardias: number | string;
  montoProductividad: number | string;
  plusIndividual: number | string;
  kmTotal: number | string | null;
  montoKmBruto: number | string | null;
  montoA: number | string | null;
  montoB: number | string | null;
  novedadesTexto: string | null;
  salvedad: string | null;
  total: number | string;
}

export interface CierreDetalle extends CierreResumen {
  detalle: CierreDetalleFila[];
}

export function useCierres() {
  return useQuery({
    queryKey: ['liquidacion', 'cierres'],
    queryFn: () => get<CierreResumen[]>('/liquidacion/cierres'),
  });
}

export function useCierre(id: number | null | undefined) {
  return useQuery({
    queryKey: ['liquidacion', 'cierres', id],
    queryFn: () => get<CierreDetalle>(`/liquidacion/cierres/${id}`),
    enabled: id != null,
  });
}

export function useCrearCierre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { anio: number; mes: number; quincena: number; nota?: string }) =>
      api.post<CierreResumen>('/liquidacion/cierres', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['liquidacion', 'cierres'] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'quincenas'] });
    },
  });
}

/**
 * Extrae el filename de un header `content-disposition` tipo
 * `attachment; filename="cierre.xlsx"` (con o sin comillas). Si no hay
 * match usable, devuelve null para que el caller aplique su fallback.
 */
function filenameDeContentDisposition(header: string | undefined): string | null {
  if (!header) return null;
  const conComillas = /filename="([^"]+)"/i.exec(header);
  if (conComillas?.[1]) return conComillas[1];
  const sinComillas = /filename=([^;]+)/i.exec(header);
  if (sinComillas?.[1]) return sinComillas[1].trim();
  return null;
}

/**
 * Descarga el Excel de un cierre ya generado y dispara el guardado en el
 * navegador. `porTantos` elige entre el Excel general y el de "por tantos".
 */
export async function descargarExcelCierre(id: number, porTantos: boolean): Promise<void> {
  const url = porTantos ? `/liquidacion/cierres/${id}/excel-por-tantos` : `/liquidacion/cierres/${id}/excel`;
  const response = await api.get(url, { responseType: 'blob' });
  const filename = filenameDeContentDisposition(response.headers['content-disposition']) ?? `cierre-${id}.xlsx`;
  const objectUrl = URL.createObjectURL(response.data as Blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
