import type { Perfil, Rol } from '@/types/domain';

// Central Sertec (ADR-025): los módulos se agrupan en cuatro áreas para que la
// barra y el inicio cuenten el mismo relato. El área es solo presentación: los
// roles siguen decidiendo qué se ve (ver `navForRole`).
export type AreaId = 'operacion' | 'personas' | 'resultados' | 'administracion';

export interface Area {
  id: AreaId;
  label: string;
}

// El orden de esta lista es el orden en que se muestran las áreas.
export const AREAS: Area[] = [
  { id: 'operacion', label: 'Operación' },
  { id: 'personas', label: 'Personas' },
  { id: 'resultados', label: 'Resultados operativos' },
  { id: 'administracion', label: 'Administración' },
];

export interface NavItem {
  label: string;
  href: string;
  roles: Rol[];
  area: AreaId;
}

// Ordenados por área y, dentro de cada área, en el orden del ADR-025
// (en Operación, Combustible va al final por ser el módulo más lateral).
export const NAV_ITEMS: NavItem[] = [
  { label: 'Reporte diario', href: '/reporte', roles: ['JefeCuadrilla', 'JefeContrato'], area: 'operacion' },
  {
    label: 'Mis registros',
    href: '/mis-registros',
    roles: ['Operario', 'JefeCuadrilla', 'JefeContrato'],
    area: 'operacion',
  },
  { label: 'Aprobaciones', href: '/aprobaciones', roles: ['JefeContrato'], area: 'operacion' },
  { label: 'Control general', href: '/control-general', roles: ['JefeContrato', 'Admin'], area: 'operacion' },
  { label: 'Km por tantos', href: '/km-por-tantos', roles: ['JefeContrato', 'Admin'], area: 'operacion' },
  // TEMPORAL: solo Admin hasta afinar el módulo (spec 2026-08-03; originales: JefeCuadrilla, JefeContrato, Admin)
  { label: 'Combustible', href: '/combustible', roles: ['Admin'], area: 'operacion' },
  {
    label: 'Novedades',
    href: '/novedades',
    roles: ['HyS', 'JefeContrato', 'Supervisor', 'Liquidador', 'Admin', 'JefeCuadrilla'],
    area: 'personas',
  },
  { label: 'Ausencias', href: '/ausencias', roles: ['HyS', 'Admin'], area: 'personas' },
  // Perfiles no es un ítem propio: sigue siendo pestaña de Liquidación
  // (decisión del usuario, ADR-025).
  { label: 'Liquidación', href: '/liquidacion', roles: ['Liquidador', 'Admin'], area: 'resultados' },
  { label: 'Certificaciones', href: '/certificaciones', roles: ['Admin'], area: 'resultados' },
  { label: 'Admin', href: '/admin', roles: ['Admin'], area: 'administracion' },
];

export function navForRole(
  perfil: Pick<Perfil, 'rol' | 'tiposNovedadHabilitados' | 'puedeCargarKmPorTantos' | 'cert'>,
): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    // Certificaciones no depende del rol de Horas: cualquier usuario con
    // claim `cert` (portal FastAPI, ver Task 3) la ve, sea o no Admin.
    if (item.href === '/certificaciones') return perfil.cert != null;
    if (!item.roles.includes(perfil.rol.nombre)) return false;
    // JefeCuadrilla sin ningún tipo de novedad habilitado no ve la opción
    // (ver ADR-007) — Supervisor sigue viéndola siempre, sin restricción.
    if (item.href === '/novedades' && perfil.rol.nombre === 'JefeCuadrilla') {
      return perfil.tiposNovedadHabilitados.length > 0;
    }
    // JefeContrato sin el permiso puntual no ve "Km por tantos" (ver ADR-014)
    // — Admin siempre la ve.
    if (item.href === '/km-por-tantos' && perfil.rol.nombre === 'JefeContrato') {
      return perfil.puedeCargarKmPorTantos;
    }
    return true;
  });
}

/**
 * Los ítems visibles del perfil, agrupados por área en el orden de `AREAS`
 * (ADR-025). Un área sin ítems visibles no se devuelve: la barra y el inicio
 * no muestran títulos vacíos.
 */
export function navPorArea(
  perfil: Pick<Perfil, 'rol' | 'tiposNovedadHabilitados' | 'puedeCargarKmPorTantos' | 'cert'>,
): { area: Area; items: NavItem[] }[] {
  const visibles = navForRole(perfil);
  return AREAS.map((area) => ({ area, items: visibles.filter((item) => item.area === area.id) })).filter(
    (grupo) => grupo.items.length > 0,
  );
}
