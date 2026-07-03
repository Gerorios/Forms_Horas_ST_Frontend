export type Rol =
  | 'Operario'
  | 'JefeCuadrilla'
  | 'JefeContrato'
  | 'Supervisor'
  | 'HyS'
  | 'Admin';

export interface ContratoResumen {
  id: number;
  codigo: string;
  nombre: string;
}

export interface EmpleadoResumen {
  apellido_nombre: string;
  legajo: number;
  cargo: string;
}

export interface Perfil {
  cuil: string;
  email: string;
  activo: boolean;
  rol: { nombre: Rol };
  empleado: EmpleadoResumen;
  contratosHabilitados: { contrato: ContratoResumen }[];
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
  tareaId: number;
  horas: number;
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
  fecha: string;
  horas: string; // Decimal serializado como string por Prisma
  estado: EstadoRegistro;
  alertaHoras: boolean;
  motivoDesaprobacion: string | null;
  operario: { cuil: string; apellido_nombre: string };
  contrato: { id: number; codigo: string; nombre: string };
  tarea: { id: number; nombre: string };
  provincia: { id: number; nombre: string };
  moviles: { movil: { id: number; identificador: string } }[];
}
