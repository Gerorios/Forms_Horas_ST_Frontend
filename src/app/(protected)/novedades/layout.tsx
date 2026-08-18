'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';
import { canAccess } from '@/lib/auth/guards';

export default function NovedadesLayout({ children }: { children: ReactNode }) {
  const { perfil } = useSession();
  const router = useRouter();
  const permitido = perfil ? canAccess(perfil.rol.nombre, '/novedades') : false;

  useEffect(() => {
    if (perfil && !permitido) router.replace('/403');
  }, [perfil, permitido, router]);

  if (!perfil || !permitido) return null;

  return <>{children}</>;
}
