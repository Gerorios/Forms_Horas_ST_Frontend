'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';
import { CERTIFICACIONES_NAV } from '@/features/certificaciones/certificaciones-nav';

/** Sub-nav Resumen/Analytics/Cargar/Ítems del módulo Certificaciones — mismo
 * patrón que `liquidacion/layout.tsx`. Sin guard de rol propio para el
 * módulo en sí: el acceso ya lo filtra `nav.ts` (visible solo con
 * `perfil.cert != null`) y cada endpoint valida sus propios permisos (403 si
 * corresponde); acá solo se ocultan las entradas `soloAdmin` (p. ej.
 * "Ítems") para niveles `carga`/`lectura`, y las `nivelesPermitidos` (p. ej.
 * "Cargar": admin y carga, no lectura) — la página de destino re-gatea por
 * su cuenta en ambos casos. */
export default function CertificacionesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { perfil } = useSession();
  const nivel = perfil?.cert?.nivel ?? null;
  const esAdmin = nivel === 'admin';
  const nav = CERTIFICACIONES_NAV.filter((item) => {
    if (item.soloAdmin && !esAdmin) return false;
    if (item.nivelesPermitidos && (nivel === null || !item.nivelesPermitidos.includes(nivel))) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-1 border-b border-line">
        {nav.map((item) => {
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
