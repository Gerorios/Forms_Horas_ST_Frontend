import type { PuntoHistorico } from '@/lib/api/panel-general';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Réplica del gráfico "Horas Por Quincena" del viejo tablero Looker:
 * barras agrupadas por mes (1ra vs 2da quincena), últimos 12 meses.
 * Sin librería de charts: flexbox + tokens de la app. */
export function HorasPorQuincenaChart({ datos }: { datos: PuntoHistorico[] }) {
  const max = Math.max(...datos.map((d) => d.horas), 0);
  if (datos.length === 0 || max === 0)
    return <p className="text-sm text-slate">Sin horas en el período.</p>;

  // agrupar por mes preservando el orden cronológico que ya trae el back
  const meses: { anio: number; mes: number; q1?: PuntoHistorico; q2?: PuntoHistorico }[] = [];
  for (const d of datos) {
    let g = meses.find((m) => m.anio === d.anio && m.mes === d.mes);
    if (!g) {
      g = { anio: d.anio, mes: d.mes };
      meses.push(g);
    }
    if (d.quincena === 1) g.q1 = d;
    else g.q2 = d;
  }

  const etiqueta = (d: PuntoHistorico) =>
    `${d.quincena === 1 ? '1ra' : '2da'} quincena ${MESES[d.mes - 1]} ${d.anio}: ${d.horas} hs`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-4 text-xs text-slate">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--color-chart-1)' }} />
          1ra quincena
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--color-chart-2)' }} />
          2da quincena
        </span>
      </div>
      <div className="relative h-44">
        {/* grilla: 0%, 50%, 100% del máximo */}
        {[0, 0.5, 1].map((f) => (
          <div
            key={f}
            className="absolute inset-x-0 border-t border-line/70"
            style={{ bottom: `${f * 100}%` }}
          >
            <span className="absolute -top-2 right-0 bg-surface pl-1 text-[10px] tabular-nums text-slate">
              {Math.round(max * f)}
            </span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-2 pr-8">
          {meses.map((m) => (
            <div key={`${m.anio}-${m.mes}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex h-40 w-full items-end justify-center gap-0.5">
                {[m.q1, m.q2].map(
                  (d, i) =>
                    d && (
                      <div
                        key={i}
                        role="img"
                        aria-label={etiqueta(d)}
                        title={etiqueta(d)}
                        className="w-full max-w-4 rounded-t"
                        style={{
                          height: `${(d.horas / max) * 100}%`,
                          background: `var(--color-chart-${i + 1})`,
                          minHeight: d.horas > 0 ? 2 : 0,
                        }}
                      />
                    ),
                )}
              </div>
              <span className="truncate text-[10px] text-slate">
                {MESES[m.mes - 1]}
                {m.mes === 1 ? ` ${String(m.anio).slice(2)}` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
