'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { PorProvinciaPunto } from '@/lib/api/certificaciones';
import { colorContrato, fmtMoneda, fmtPct } from './colores';

function TooltipProvincia({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: { payload?: PorProvinciaPunto }[];
  total: number;
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  const pct = total > 0 ? (p.monto_total / total) * 100 : 0;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{p.provincia}</p>
      <p className="tabular-nums text-slate">
        {fmtMoneda(p.monto_total)} · {fmtPct(pct)}
      </p>
    </div>
  );
}

/** Distribución del monto certificado por provincia — torta tipo donut: con
 * hasta 4 categorías (el máximo esperado en este análisis) el % directo por
 * gajo se lee más rápido que barras horizontales. Colores fijos por orden
 * alfabético de provincia (mismo mecanismo `colorContrato` que el resto de
 * Analytics — apilado por contrato, etc.); provincias con monto 0 se omiten;
 * el total del período va en el centro de la dona. */
export function PorProvinciaChart({ datos }: { datos: PorProvinciaPunto[] }) {
  const conMonto = [...datos]
    .filter((d) => d.monto_total > 0)
    .sort((a, b) => a.provincia.localeCompare(b.provincia, 'es'));
  const total = conMonto.reduce((s, d) => s + d.monto_total, 0);

  if (conMonto.length === 0 || total === 0)
    return <p className="text-sm text-slate">Sin datos para el período filtrado.</p>;

  return (
    <div
      className="relative w-full"
      style={{ height: 280 }}
      role="img"
      aria-label="Distribución del certificado por provincia"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={conMonto}
            dataKey="monto_total"
            nameKey="provincia"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            isAnimationActive={false}
            labelLine={false}
            label={({ percent }: { percent?: number }) => fmtPct((percent ?? 0) * 100)}
          >
            {conMonto.map((d, i) => (
              <Cell key={d.provincia} fill={colorContrato(i)} />
            ))}
          </Pie>
          <Tooltip content={<TooltipProvincia total={total} />} />
          <Legend
            verticalAlign="middle"
            align="right"
            layout="vertical"
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xs text-slate">Total</p>
        <p className="text-sm font-semibold tabular-nums text-ink">{fmtMoneda(total)}</p>
      </div>
    </div>
  );
}
