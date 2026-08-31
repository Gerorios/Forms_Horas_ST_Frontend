'use client';

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PorProvinciaPunto } from '@/lib/api/certificaciones';
import { COLOR_MONTO, fmtMoneda } from './colores';

function TooltipProvincia({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: PorProvinciaPunto }[];
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{p.provincia}</p>
      <p className="tabular-nums text-slate">
        {fmtMoneda(p.monto_total)} · {p.lineas} {p.lineas === 1 ? 'línea' : 'líneas'}
      </p>
    </div>
  );
}

/** Monto certificado por provincia — barras horizontales ordenadas de mayor
 * a menor (mismo patrón que `ContratosChart` de liquidación/análisis): más
 * fácil de leer que un mapa o torta cuando hay más de 4-5 categorías. */
export function PorProvinciaChart({ datos }: { datos: PorProvinciaPunto[] }) {
  const ordenados = [...datos].sort((a, b) => b.monto_total - a.monto_total);
  const max = Math.max(...ordenados.map((d) => d.monto_total), 0);
  if (ordenados.length === 0 || max === 0)
    return <p className="text-sm text-slate">Sin datos para el período filtrado.</p>;

  return (
    <div
      className="w-full"
      style={{ height: ordenados.length * 32 + 16 }}
      role="img"
      aria-label="Monto certificado por provincia"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={ordenados} layout="vertical" margin={{ top: 0, right: 96, bottom: 0, left: 0 }}>
          <XAxis type="number" hide domain={[0, max]} />
          <YAxis
            type="category"
            dataKey="provincia"
            width={110}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-ink)', fontSize: 11 }}
          />
          <Tooltip content={<TooltipProvincia />} cursor={{ fill: 'var(--color-sand)' }} />
          <Bar dataKey="monto_total" fill={COLOR_MONTO} radius={[0, 3, 3, 0]} maxBarSize={16}>
            <LabelList
              dataKey="monto_total"
              position="right"
              style={{ fill: 'var(--color-ink)', fontSize: 11 }}
              formatter={(v) => fmtMoneda(Number(v))}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
