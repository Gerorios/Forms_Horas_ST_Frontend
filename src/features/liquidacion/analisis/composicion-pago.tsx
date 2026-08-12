'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalisisQuincena } from '@/lib/api/liquidacion';
import {
  COLOR_BASICO,
  COLOR_BONO,
  COLOR_EXTRAS,
  COLOR_PLUS,
  COLOR_PRESENTISMO,
  fmtMoneda,
  fmtPct,
} from './colores';

const SERIES = [
  { clave: 'basico', nombre: 'Básico', color: COLOR_BASICO },
  { clave: 'extras', nombre: 'Horas extra', color: COLOR_EXTRAS },
  { clave: 'presentismo', nombre: 'Presentismo', color: COLOR_PRESENTISMO },
  { clave: 'plus', nombre: 'Plus', color: COLOR_PLUS },
  { clave: 'bono', nombre: 'Bono', color: COLOR_BONO },
] as const;

function TooltipComposicion({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 tabular-nums text-slate">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-ink">{fmtMoneda(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

/** Composición del pago de la quincena: UNA barra horizontal apilada con los
 * 5 componentes (básico, extras, presentismo, plus, bono) y una leyenda con
 * el $ y % de cada uno. Los segmentos llevan borde blanco de 2px — el gap
 * que exige dataviz entre segmentos apilados adyacentes. */
export function ComposicionPago({
  composicion,
}: {
  composicion: AnalisisQuincena['composicion'];
}) {
  const total = SERIES.reduce((s, serie) => s + composicion[serie.clave], 0);
  if (total <= 0) return <p className="text-sm text-slate">Sin montos en la quincena.</p>;

  const dato = { nombre: 'Composición', ...composicion };

  return (
    <div className="space-y-3">
      <div className="h-16 w-full" role="img" aria-label="Composición del pago de la quincena">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[dato]} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis type="number" hide domain={[0, total]} />
            <YAxis type="category" dataKey="nombre" hide />
            <Tooltip content={<TooltipComposicion />} cursor={{ fill: 'transparent' }} />
            {SERIES.map((s) => (
              <Bar
                key={s.clave}
                dataKey={s.clave}
                name={s.nombre}
                stackId="composicion"
                fill={s.color}
                stroke="#fff"
                strokeWidth={2}
                maxBarSize={36}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {SERIES.map((s) => (
          <li key={s.clave} className="flex items-center gap-1.5 tabular-nums">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="text-slate">{s.nombre}</span>
            <span className="ml-auto font-medium text-ink">{fmtMoneda(composicion[s.clave])}</span>
            <span className="w-14 text-right text-slate">
              {fmtPct((composicion[s.clave] / total) * 100)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
