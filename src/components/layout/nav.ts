import type { Rol } from '@/types/domain';

export interface NavItem {
  label: string;
  href: string;
  roles: Rol[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Reporte diario', href: '/reporte', roles: ['JefeCuadrilla', 'JefeContrato'] },
  { label: 'Mis registros', href: '/mis-registros', roles: ['Operario', 'JefeCuadrilla', 'JefeContrato'] },
  { label: 'Aprobaciones', href: '/aprobaciones', roles: ['JefeContrato'] },
  { label: 'Novedades', href: '/novedades', roles: ['Supervisor'] },
  { label: 'Ausencias', href: '/ausencias', roles: ['HyS'] },
  { label: 'Admin', href: '/admin', roles: ['Admin'] },
];

export function navForRole(rol: Rol): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(rol));
}
