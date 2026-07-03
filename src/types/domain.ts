export type Rol = 'Operario' | 'JefeContrato' | 'Supervisor' | 'HyS' | 'Admin';

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
