import type { ReactNode } from 'react';

/** Encabezado de página con el "pico" dorado (barra izquierda) como firma. */
export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="border-l-[3px] border-brand pl-3">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate">{eyebrow}</p>
        )}
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
      </div>
      {action}
    </div>
  );
}
