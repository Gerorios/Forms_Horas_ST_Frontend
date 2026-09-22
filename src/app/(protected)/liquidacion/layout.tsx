'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';
import { LIQUIDACION_NAV } from '@/features/liquidacion/liquidacion-nav';
import { SubNav } from '@/components/sub-nav';

export default function LiquidacionLayout({ children }: { children: ReactNode }) {
  const { perfil } = useSession();
  const router = useRouter();
  const puede = perfil?.rol?.nombre === 'Liquidador' || perfil?.rol?.nombre === 'Admin';

  useEffect(() => {
    if (perfil && !puede) router.replace('/403');
  }, [perfil, puede, router]);

  if (!perfil || !puede) return null;

  return (
    <div className="space-y-5">
      <SubNav items={LIQUIDACION_NAV} ariaLabel="Secciones de liquidación" />
      {children}
    </div>
  );
}
