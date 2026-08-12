'use client';

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalisisQuincena } from '@/lib/api/liquidacion';
import { COLOR_BASICO, fmtMoneda, fmtPct } from './colores';

type Cobrador = AnalisisQuincena['topCobradores'][number];

/** Acá subir es COSTO: la suba fuerte va en rojo, la suba normal en warn y
 * la baja queda neutra (slate). */
function claseDelta(deltaPct: number) {
  if (deltaPct > 25) return 'text-danger';
  if (deltaPct > 0) return 'text-warn';
  return 'text-slate';
}

function TooltipCobrador({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: Cobrador }[];
}) {
  const c = payload?.[0]?.payload;
  if (!active || !c) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{c.nombre}</p>
      <p className="tabular-nums text-slate">
        {fmtMoneda(c.total)} · {c.diasTrabajados} días trabajados
      </p>
      <p className="tabular-nums text-slate">
        Quincena anterior:{' '}
        <span className="font-medium text-ink">
          {c.totalAnterior === null ? 'sin liquidación' : fmtMoneda(c.totalAnterior)}
        </span>
      </p>
    </div>
  );
}

/** Top 10 cobradores de la quincena: barras horizontales (patrón visual del
 * ranking de control-general) con el total al final de la barra y un chip de
 * Δ% personal contra la quincena anterior; "(nuevo)" para los que no tienen
 * fila anterior. */
export function TopCobradores({ cobradores }: { cobradores: Cobrador[] }) {
  const max = Math.max(...cobradores.map((c) => c.total), 0);
  if (cobradores.length === 0 || max === 0)
    return <p className="text-sm text-slate">Sin cobradores en esta quincena.</p>;

  return (
    <div className="space-y-2">
      <div
        className="w-full"
        style={{ height: cobradores.length * 34 + 16 }}
        role="img"
        aria-label="Top 10 cobradores de la quincena"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cobradores} layout="vertical" margin={{ top: 0, right: 88, bottom: 0, left: 0 }}>
            <XAxis type="number" hide domain={[0, max]} />
            <YAxis
              type="category"
              dataKey="nombre"
              width={150}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--color-ink)', fontSize: 11 }}
            />
            <Tooltip content={<TooltipCobrador />} cursor={{ fill: 'var(--color-sand)' }} />
            <Bar dataKey="total" fill={COLOR_BASICO} radius={[0, 3, 3, 0]} maxBarSize={16}>
              <LabelList
                dataKey="total"
                position="right"
                style={{ fill: 'var(--color-ink)', fontSize: 11 }}
                formatter={(v) => fmtMoneda(Number(v))}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-2">
        {cobradores.map((c) => (
          <li key={c.cuil} className="flex items-center gap-1.5 tabular-nums">
            <span className="truncate text-slate">{c.nombre}</span>
            {c.deltaPct === null ? (
              <span className="ml-auto italic text-slate">(nuevo)</span>
            ) : (
              <span className={`ml-auto font-medium ${claseDelta(c.deltaPct)}`}>
                {c.deltaPct > 0 ? '▲ ' : c.deltaPct < 0 ? '▼ ' : ''}
                {fmtPct(c.deltaPct, true)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
