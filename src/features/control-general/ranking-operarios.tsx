import Link from 'next/link';
import type { ResumenOperario } from '@/lib/api/panel-general';

/** Réplica del "Ranking | Operarios con mayor cantidad de horas" del Looker:
 * top 10 por total de horas de la quincena (pendientes + aprobadas), barras
 * horizontales para que los nombres largos se lean completos. */
export function RankingOperarios({ resumen }: { resumen: ResumenOperario[] }) {
  const top = [...resumen].sort((a, b) => b.totalHoras - a.totalHoras).slice(0, 10);
  const max = Math.max(...top.map((r) => r.totalHoras), 0);
  if (top.length === 0 || max === 0)
    return <p className="text-sm text-slate">Sin horas en esta quincena.</p>;

  return (
    <ol className="space-y-1.5">
      {top.map((r) => (
        <li key={r.cuil} className="grid grid-cols-[minmax(0,11rem)_1fr] items-center gap-2 text-sm">
          <Link
            href={`/aprobaciones?operarioCuil=${r.cuil}`}
            className="truncate text-ink underline decoration-line hover:text-brand-deep hover:decoration-brand-deep"
            title={r.apellido_nombre}
          >
            {r.apellido_nombre}
          </Link>
          <div className="flex items-center gap-2">
            <div
              className="h-4 rounded-r"
              role="img"
              aria-label={`${r.apellido_nombre}: ${r.totalHoras} hs`}
              title={`${r.apellido_nombre}: ${r.totalHoras} hs`}
              style={{ width: `${(r.totalHoras / max) * 100}%`, background: 'var(--color-chart-1)', minWidth: 2 }}
            />
            <span className="tabular-nums text-xs text-ink">{r.totalHoras}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
