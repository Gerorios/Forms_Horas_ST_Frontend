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

// ---- Sueldos mensualizados (vigentes — ver ADR-016) ----
export interface SueldoMensualizadoItem {
  cuil: string;
  apellidoNombre: string;
  /** Nombre de la categoría UOCRA del perfil (define el bono no remunerativo,
   * no el sueldo fijo). null si el perfil no tiene categoría asignada. */
  categoria: string | null;
  monto: string | null;
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

// ---- Edición de una ronda ya cargada (ver contrato GET/PUT /tarifas/ronda/:anio/:mes) ----
export interface RondaTarifasPeriodo {
  categorias: {
    id: number;
    nombre: string;
    importeHora: string;
    bonoNoRemunerativo: { tipo: TipoBonoNoRemunerativo; valor: string } | null;
  }[];
  tiposNovedad: { id: number; nombre: string; montoPorDia: string }[];
  rangosKm: { kmDesde: string; kmHasta: string | null; precioPorKm: string }[];
}

function periodoHabilitado(anio: number, mes: number) {
  return Number.isInteger(anio) && anio > 0 && Number.isInteger(mes) && mes >= 1 && mes <= 12;
}

/** Shape crudo del backend (GET /liquidacion/tarifas/ronda/:anio/:mes). */
interface RondaTarifasPeriodoApi {
  anio: number;
  mes: number;
  categorias: { categoriaUocraId: number; nombre: string; importeHora: string | null }[];
  tiposNovedad: { tipoNovedadId: number; nombre: string; montoPorDia: string | null }[];
  rangosKm: { kmDesde: string; kmHasta: string | null; precioPorKm: string }[];
  bonosNoRemunerativos: { categoriaUocraId: number; bono: { tipo: TipoBonoNoRemunerativo; valor: string } | null }[];
}

function adaptarRondaPeriodo(api: RondaTarifasPeriodoApi): RondaTarifasPeriodo {
  const bonoPorCategoria = new Map(api.bonosNoRemunerativos.map((b) => [b.categoriaUocraId, b.bono]));
  return {
    categorias: api.categorias.map((c) => ({
      id: c.categoriaUocraId,
      nombre: c.nombre,
      importeHora: c.importeHora ?? '',
      bonoNoRemunerativo: bonoPorCategoria.get(c.categoriaUocraId) ?? null,
    })),
    tiposNovedad: api.tiposNovedad.map((t) => ({
      id: t.tipoNovedadId,
      nombre: t.nombre,
      montoPorDia: t.montoPorDia ?? '',
    })),
    rangosKm: api.rangosKm,
  };
}

export function useRondaPeriodo(anio: number, mes: number, enabled = true) {
  return useQuery({
    queryKey: ['liquidacion', 'tarifas-ronda', anio, mes],
    queryFn: async () => adaptarRondaPeriodo(await get<RondaTarifasPeriodoApi>(`/liquidacion/tarifas/ronda/${anio}/${mes}`)),
    enabled: enabled && periodoHabilitado(anio, mes),
    retry: false,
  });
}

export type ActualizarRondaTarifasInput = { anio: number; mes: number } & Omit<
  CargarRondaTarifasInput,
  'anio' | 'mes'
>;

export function useActualizarRondaTarifas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ anio, mes, ...dto }: ActualizarRondaTarifasInput) =>
      api.put(`/liquidacion/tarifas/ronda/${anio}/${mes}`, dto).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['liquidacion', 'tarifas-estado'] });
      qc.invalidateQueries({ queryKey: ['liquidacion', 'tarifas-ronda', vars.anio, vars.mes] });
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
      // Cargar/completar meses puede crear RondaTarifas nuevas (huecos) —
      // refresca "último período cargado" que muestra la pestaña de Precios.
      qc.invalidateQueries({ queryKey: ['liquidacion', 'tarifas-estado'] });
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
export function useAlertasQuincena(anio: number, mes: number, quincena: number) {
  return useQuery({
    queryKey: ['liquidacion', 'alertas', anio, mes, quincena],
    queryFn: () => get<AlertasQuincena>('/liquidacion/quincena/alertas', { anio, mes, quincena }),
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
  total: string;
  modalidadPago: ModalidadPago | null;
  etiquetaNovedades: string;
  datoFaltante: string | null;
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
