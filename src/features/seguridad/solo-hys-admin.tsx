'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';
import { canAccess } from '@/lib/auth/guards';

/** Guard de las pantallas de HyS y Admin del módulo (panel, ranking,
 * períodos). Mismo patrón que el layout de /novedades: el rol decide con
 * `canAccess` contra NAV_ITEMS. El backend vuelve a validarlo. */
export function SoloHysAdmin({ href, children }: { href: string; children: ReactNode }) {
  const { perfil } = useSession();
  const router = useRouter();
  const permitido = perfil ? canAccess(perfil.rol.nombre, href) : false;

  useEffect(() => {
    if (perfil && !permitido) router.replace('/403');
  }, [perfil, permitido, router]);

  if (!perfil || !permitido) return null;
  return <>{children}</>;
}
