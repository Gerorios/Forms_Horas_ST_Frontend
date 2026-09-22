import type { ReactNode } from 'react';
import { AREAS, type AreaId } from '@/components/layout/nav';

/**
 * Encabezado de página con el "pico" dorado (barra izquierda) como firma.
 *
 * Central Sertec (ADR-025): la línea de arriba nombra el área a la que
 * pertenece el módulo. Si además hay un `eyebrow` con un dato distinto del
 * área (p. ej. "Las que cargaste vos"), se muestran juntos: "Área · dato".
 */
export function PageHeader({
  area,
  eyebrow,
  title,
  action,
}: {
  area?: AreaId;
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  const rotuloArea = AREAS.find((a) => a.id === area)?.label;
  const linea = [rotuloArea, eyebrow].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="border-l-[3px] border-brand pl-3">
        {linea && (
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate">{linea}</p>
        )}
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
      </div>
      {action}
    </div>
  );
}
