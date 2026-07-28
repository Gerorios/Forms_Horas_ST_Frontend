'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';
import { LIQUIDACION_NAV } from '@/features/liquidacion/liquidacion-nav';

export default function LiquidacionLayout({ children }: { children: ReactNode }) {
  const { perfil } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const puede = perfil?.rol?.nombre === 'Liquidador' || perfil?.rol?.nombre === 'Admin';

  useEffect(() => {
    if (perfil && !puede) router.replace('/403');
  }, [perfil, puede, router]);

  if (!perfil || !puede) return null;

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-1 border-b border-line">
        {LIQUIDACION_NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                active ? 'border-brand font-medium text-ink' : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
