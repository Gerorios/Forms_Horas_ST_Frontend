import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface Rol { id: number; nombre: string }
export interface ContratoAdmin { id: number; codigo: string; nombre: string; activo: boolean; jefeContratoCuil: string | null; jefeContrato: { cuil: string; email: string } | null }
export interface TareaAdmin { id: number; nombre: string; contratoId: number; activo: boolean }
export interface MovilAdmin { id: number; identificador: string; descripcion: string | null; activo: boolean }
export interface ProvinciaAdmin { id: number; nombre: string }
export interface TipoNovedadAdmin { id: number; nombre: string; requiereAprobacionHys: boolean; generaPlus: boolean; activo: boolean }
export interface UsuarioAdmin {
  cuil: string; email: string; activo: boolean;
  rolId: number;
  rol: { nombre: string };
  empleado: { apellido_nombre: string };
  contratosHabilitados: { contratoId: number; contrato: { codigo: string } }[];
  /** Contratos de los que este usuario es Jefe de Contrato (aprueba/desaprueba). */
  contratosComoJefe: { id: number; codigo: string }[];
}
export interface AltaMasivaResp {
  creados: { cuil: string; apellido_nombre: string; email: string; password: string }[];
  omitidos: { cuil: string; motivo: string }[];
}

const get = async <T>(url: string, params?: Record<string, unknown>) =>
  (await api.get<T>(url, params ? { params } : undefined)).data;

export function useRoles() {
  return useQuery({ queryKey: ['admin', 'roles'], queryFn: () => get<Rol[]>('/admin/roles') });
}

export function useContratosAdmin() {
  return useQuery({ queryKey: ['admin', 'contratos'], queryFn: () => get<ContratoAdmin[]>('/admin/contratos') });
}
export function useCrearContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { codigo: string; nombre: string; jefeContratoCuil?: string }) =>
      api.post('/admin/contratos', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'contratos'] }),
  });
}
export function useEditarContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: number; nombre?: string; jefeContratoCuil?: string | null; activo?: boolean }) =>
      api.patch(`/admin/contratos/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'contratos'] }),
  });
}

export function useTareasAdmin(contratoId: number | null) {
  return useQuery({
    queryKey: ['admin', 'tareas', contratoId],
    enabled: contratoId != null,
    queryFn: () => get<TareaAdmin[]>('/admin/tareas', { contratoId }),
  });
}
export function useCrearTarea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { contratoId: number; nombre: string }) => api.post('/admin/tareas', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tareas'] }),
  });
}
export function useToggleTarea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.patch(`/admin/tareas/${id}/activo`, { activo }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tareas'] }),
  });
}
export function useEditarTarea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: number; contratoId?: number; nombre?: string }) =>
      api.patch(`/admin/tareas/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tareas'] }),
  });
}

export function useMovilesAdmin() {
  return useQuery({ queryKey: ['admin', 'moviles'], queryFn: () => get<MovilAdmin[]>('/admin/moviles') });
}
export function useCrearMovil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { identificador: string; descripcion?: string }) => api.post('/admin/moviles', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'moviles'] }),
  });
}
export function useToggleMovil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.patch(`/admin/moviles/${id}/activo`, { activo }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'moviles'] }),
  });
}
export function useEditarMovil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: number; identificador?: string; descripcion?: string }) =>
      api.patch(`/admin/moviles/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'moviles'] }),
  });
}

export function useProvinciasAdmin() {
  return useQuery({ queryKey: ['admin', 'provincias'], queryFn: () => get<ProvinciaAdmin[]>('/admin/provincias') });
}
export function useCrearProvincia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { nombre: string }) => api.post('/admin/provincias', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'provincias'] }),
  });
}
export function useEditarProvincia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: number; nombre?: string }) =>
      api.patch(`/admin/provincias/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'provincias'] }),
  });
}

export function useTiposNovedadAdmin() {
  return useQuery({ queryKey: ['admin', 'tipos-novedad'], queryFn: () => get<TipoNovedadAdmin[]>('/admin/tipos-novedad') });
}
export function useCrearTipoNovedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { nombre: string; requiereAprobacionHys?: boolean; generaPlus?: boolean }) =>
      api.post('/admin/tipos-novedad', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tipos-novedad'] }),
  });
}
export function useToggleTipoNovedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.patch(`/admin/tipos-novedad/${id}/activo`, { activo }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tipos-novedad'] }),
  });
}
export function useEditarTipoNovedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: number; nombre?: string; requiereAprobacionHys?: boolean; generaPlus?: boolean }) =>
      api.patch(`/admin/tipos-novedad/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tipos-novedad'] }),
  });
}

export function useUsuariosAdmin() {
  return useQuery({ queryKey: ['admin', 'usuarios'], queryFn: () => get<UsuarioAdmin[]>('/admin/usuarios') });
}
export function useCrearUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      cuil: string; email: string; password: string; rolId: number;
      contratosIds?: number[]; contratosJefeIds?: number[];
    }) => api.post('/admin/usuarios', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'usuarios'] }),
  });
}
export function useEditarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cuil, ...dto }: {
      cuil: string; email?: string; password?: string; rolId?: number; activo?: boolean;
      contratosIds?: number[]; contratosJefeIds?: number[];
    }) => api.patch(`/admin/usuarios/${cuil}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'usuarios'] });
      qc.invalidateQueries({ queryKey: ['admin', 'contratos'] });
    },
  });
}
export function useCrearUsuariosMasivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cuils: string[]) =>
      api.post<AltaMasivaResp>('/admin/usuarios/masivo', { cuils }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'usuarios'] }),
  });
}
export function useResetearPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cuil: string) =>
      api.post(`/admin/usuarios/${cuil}/resetear-password`, {}).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'usuarios'] }),
  });
}
