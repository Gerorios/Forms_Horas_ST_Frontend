'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Sub-navegación en pestañas de un módulo (Admin, Liquidación,
 * Certificaciones), extraída de los tres layouts que la repetían igual.
 *
 * El ítem activo se resuelve por **igualdad exacta** de la ruta, como venían
 * haciendo los layouts: en una subruta (p. ej. `/liquidacion/quincena/detalle`)
 * no se marca ninguna pestaña.
 *
 * Los ítems llegan ya filtrados por quien la usa (certificaciones esconde
 * entradas según el nivel): `SubNav` no decide visibilidad ni permisos.
 */
export function SubNav({
  items,
  ariaLabel,
}: {
  items: { href: string; label: string }[];
  ariaLabel?: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap gap-1 border-b border-line">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              active ? 'border-brand font-medium text-ink' : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
