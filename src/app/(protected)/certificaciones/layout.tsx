'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { CERTIFICACIONES_NAV } from '@/features/certificaciones/certificaciones-nav';

/** Sub-nav Resumen/Analytics del módulo Certificaciones — mismo patrón que
 * `liquidacion/layout.tsx`. Sin guard de rol propio: el acceso al módulo ya
 * lo filtra `nav.ts` (visible solo con `perfil.cert != null`) y cada
 * endpoint FastAPI valida sus propios permisos (403 si corresponde). */
export default function CertificacionesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-1 border-b border-line">
        {CERTIFICACIONES_NAV.map((item) => {
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
