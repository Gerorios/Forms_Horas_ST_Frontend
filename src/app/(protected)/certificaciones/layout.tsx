'use client';

import type { ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';
import { CERTIFICACIONES_NAV } from '@/features/certificaciones/certificaciones-nav';
import { SubNav } from '@/components/sub-nav';

/** Sub-nav Resumen/Analytics/Cargar/Ítems del módulo Certificaciones — mismo
 * patrón que `liquidacion/layout.tsx`. Sin guard de rol propio para el
 * módulo en sí: el acceso ya lo filtra `nav.ts` (visible solo con
 * `perfil.cert != null`) y cada endpoint valida sus propios permisos (403 si
 * corresponde); acá solo se ocultan las entradas `soloAdmin` (p. ej.
 * "Ítems") para niveles `carga`/`lectura`, y las `nivelesPermitidos` (p. ej.
 * "Cargar": admin y carga, no lectura) — la página de destino re-gatea por
 * su cuenta en ambos casos. */
export default function CertificacionesLayout({ children }: { children: ReactNode }) {
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
      <SubNav items={nav} ariaLabel="Secciones de certificaciones" />
      {children}
    </div>
  );
}
