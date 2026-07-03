import type { Rol } from '@/types/domain';
import { NAV_ITEMS } from '@/components/layout/nav';

export function canAccess(rol: Rol, href: string): boolean {
  const item = NAV_ITEMS.find((i) => i.href === href);
  if (!item) return true; // rutas sin restricción explícita (home, etc.)
  return item.roles.includes(rol);
}
