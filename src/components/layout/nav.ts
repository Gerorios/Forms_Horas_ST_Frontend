import type { Perfil, Rol } from '@/types/domain';

export interface NavItem {
  label: string;
  href: string;
  roles: Rol[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Reporte diario', href: '/reporte', roles: ['JefeCuadrilla', 'JefeContrato'] },
  { label: 'Mis registros', href: '/mis-registros', roles: ['Operario', 'JefeCuadrilla', 'JefeContrato'] },
  // TEMPORAL: solo Admin hasta afinar el módulo (spec 2026-08-03; originales: JefeCuadrilla, JefeContrato, Admin)
  { label: 'Combustible', href: '/combustible', roles: ['Admin'] },
  { label: 'Aprobaciones', href: '/aprobaciones', roles: ['JefeContrato'] },
  { label: 'Control general', href: '/control-general', roles: ['JefeContrato', 'Admin'] },
  { label: 'Novedades', href: '/novedades', roles: ['Supervisor', 'JefeCuadrilla'] },
  { label: 'Ausencias', href: '/ausencias', roles: ['HyS'] },
  { label: 'Admin', href: '/admin', roles: ['Admin'] },
  { label: 'Liquidación', href: '/liquidacion', roles: ['Liquidador', 'Admin'] },
];

export function navForRole(perfil: Pick<Perfil, 'rol' | 'tiposNovedadHabilitados'>): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(perfil.rol.nombre)) return false;
    // JefeCuadrilla sin ningún tipo de novedad habilitado no ve la opción
    // (ver ADR-007) — Supervisor sigue viéndola siempre, sin restricción.
    if (item.href === '/novedades' && perfil.rol.nombre === 'JefeCuadrilla') {
      return perfil.tiposNovedadHabilitados.length > 0;
    }
    return true;
  });
}
