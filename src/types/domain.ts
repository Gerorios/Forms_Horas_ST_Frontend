export type Rol =
  | 'Operario'
  | 'JefeCuadrilla'
  | 'JefeContrato'
  | 'Supervisor'
  | 'HyS'
  | 'Admin'
  | 'Liquidador';

export interface ContratoResumen {
  id: number;
  codigo: string;
  nombre: string;
}

export interface EmpleadoResumen {
  apellido_nombre: string;
  /** null para usuarios fuera de nómina (sin fila en snuempleados, ver ADR-008). */
  legajo: number | null;
  /** null para usuarios fuera de nómina (sin fila en snuempleados, ver ADR-008). */
  cargo: string | null;
}

export interface Perfil {
  cuil: string;
  email: string;
  activo: boolean;
  rol: { nombre: Rol };
  empleado: EmpleadoResumen;
  contratosHabilitados: { contrato: ContratoResumen }[];
  /** Tipos de novedad que puede cargar (solo aplica a JefeCuadrilla; ver ADR-007). */
  tiposNovedadHabilitados: { tipoNovedad: { id: number; nombre: string } }[];
}

export interface LoginResponse {
  access_token: string;
}

export interface Provincia {
  id: number;
  nombre: string;
}

export interface Movil {
  id: number;
  identificador: string;
  descripcion?: string | null;
}

export interface Tarea {
  id: number;
  nombre: string;
}

export interface EmpleadoBusqueda {
  cuil: string;
  apellido_nombre: string;
  legajo: number;
  cargo: string;
}

export interface LineaReporte {
  contratoId: number;
  horas: number;
  tareaIds: number[];
  observacion?: string;
}

export interface ReporteBatch {
  fecha: string;
  provinciaId: number;
  gpsLat?: number;
  gpsLng?: number;
  movilIds?: number[];
  operarioCuils: string[];
  lineas: LineaReporte[];
}

export type EstadoRegistro = 'pendiente' | 'aprobado' | 'desaprobado';

export interface RegistroHoras {
  id: number;
  loteId: string;
  fecha: string;
  horas: string; // Decimal serializado como string por Prisma
  estado: EstadoRegistro;
  alertaHoras: boolean;
  motivoDesaprobacion: string | null;
  observacion: string | null;
  /** Si esta fila viene de una corrección de horas, el loteId rechazado que reemplaza. Ver ADR-006. */
  loteIdOrigen: string | null;
  operario: { cuil: string; apellido_nombre: string };
  contrato: { id: number; codigo: string; nombre: string };
  tareas: { tarea: { id: number; nombre: string } }[];
  provincia: { id: number; nombre: string };
  moviles: { movil: { id: number; identificador: string } }[];
}

export type RegistroPorAprobar = RegistroHoras & {
  accionable: boolean;
  /** Quién hizo el envío (siempre el mismo para todas las filas de un mismo loteId). */
  cargadoPor: { cuil: string; nombre: string };
  /** Quién resolvió (aprobó/rechazó) esta fila puntual, y cuándo. null si sigue pendiente. */
  aprobadoPor: { cuil: string; nombre: string } | null;
  aprobadoEn: string | null;
  /** Total real de horas de este operario ese día, cruzando TODOS los contratos y
   * lotes (no solo los de este jefe) — no confundir con `horas`, que es solo esta línea.
   * null cuando el origen de datos no computa el cruce (ej. "Mis registros", que sale
   * de findAll) — en ese caso no hay que renderizar la alerta de horas totales. */
  totalHorasDia: number | null;
  /** true si este operario tiene filas en más de un loteId distinto ese mismo día
   * (posible duplicación entre cuadrillas/contratos que no se ven entre sí). */
  duplicadoCruzado: boolean;
};

export type EstadoHys = 'pendiente' | 'aprobada' | 'desaprobada' | 'no_aplica';

export interface TipoNovedad {
  id: number;
  nombre: string;
  requiereAprobacionHys: boolean;
}

export interface Novedad {
  id: number;
  operarioCuil: string;
  tipoNovedadId: number;
  fechaInicio: string;
  fechaFin: string | null;
  justificacionTexto: string | null;
  estadoHys: EstadoHys;
  operario: { cuil: string; apellido_nombre: string };
  tipoNovedad: { id: number; nombre: string; requiereAprobacionHys: boolean };
  cargadoPor: { cuil: string; email: string };
}

export interface CrearNovedadInput {
  operarioCuil: string;
  tipoNovedadId: number;
  fechaInicio: string;
  fechaFin?: string;
  justificacionTexto?: string;
}

export type MedioPagoCombustible = 'cuenta_corriente' | 'caja';
export type EstadoCargaCombustible = 'activa' | 'anulada';

export interface EstacionServicio {
  id: number;
  nombre: string;
  localidad: string | null;
  activo?: boolean;
}

export interface TipoCombustible {
  id: number;
  nombre: string;
  activo?: boolean;
}

export interface CargaCombustible {
  id: number;
  fechaCarga: string;
  cargadoPorCuil: string;
  movil: { id: number; identificador: string };
  litros: string;
  monto: string;
  km: number; // Decimals de Prisma llegan como string
  medioPago: MedioPagoCombustible;
  nroComprobante: string;
  estacion: { id: number; nombre: string };
  tipoCombustible: { id: number; nombre: string };
  provincia: { id: number; nombre: string };
  observaciones: string | null;
  estado: EstadoCargaCombustible;
  motivoAnulacion: string | null;
  anuladaPorCuil: string | null;
  anuladaEn: string | null;
  tareas: { tarea: { id: number; nombre: string; contrato: { id: number; codigo: string } } }[];
}

export type TipoComprobanteTicket =
  | 'REMITO'
  | 'FACTURA_A'
  | 'FACTURA_B'
  | 'FACTURA_C'
  | 'TIQUE'
  | 'OTRO';

export interface ExtraccionTicket {
  legible: boolean;
  sugerencias: null | {
    litros: number | null;
    monto: number | null;
    fechaCarga: string | null;
    nroComprobante: string | null;
    tipoCombustibleId: number | null;
    estacionId: number | null;
    tipoComprobante: TipoComprobanteTicket | null;
    medioPagoSugerido: MedioPagoCombustible | null;
    confianzaNumero: 'alta' | 'media' | 'baja' | null;
    lineaOrigenNumero: string | null;
    precioLitro: number | null;
    advertenciaCoherencia: string | null;
    patente: string | null;
    km: number | null;
    movilId: number | null;
  };
}
