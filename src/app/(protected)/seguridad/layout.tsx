'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';

/** Lanzamiento (ADR-028): mientras Seguridad esté en prueba interna, quien no
 * está en el piloto no entra ni escribiendo la ruta. El backend también lo
 * bloquea (403); esto solo evita mostrar una pantalla rota. */
export default function SeguridadLayout({ children }: { children: ReactNode }) {
  const { perfil } = useSession();
  const router = useRouter();
  const habilitado = perfil ? perfil.modulos?.seguridad !== false : false;

  useEffect(() => {
    if (perfil && !habilitado) router.replace('/403');
  }, [perfil, habilitado, router]);

  if (!perfil || !habilitado) return null;
  return <>{children}</>;
}
