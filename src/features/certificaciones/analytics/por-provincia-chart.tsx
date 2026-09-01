'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
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

const RADIAN = Math.PI / 180;

/** % dibujado DENTRO del anillo (blanco sobre el color del gajo): las
 * etiquetas exteriores de recharts se recortaban contra el borde del
 * contenedor y heredaban el color del gajo (poco contraste). Gajos < 5%
 * no llevan etiqueta — el tooltip y la leyenda los cubren. */
function renderPctEnAnillo({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) {
  if ((percent ?? 0) < 0.05) return null;
  const r = ((innerRadius ?? 0) + (outerRadius ?? 0)) / 2;
  const x = (cx ?? 0) + r * Math.cos(-(midAngle ?? 0) * RADIAN);
  const y = (cy ?? 0) + r * Math.sin(-(midAngle ?? 0) * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {fmtPct((percent ?? 0) * 100)}
    </text>
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
      className="flex w-full items-center gap-4"
      role="img"
      aria-label="Distribución del certificado por provincia"
    >
      {/* La dona vive sola en su contenedor: así el overlay del total queda
          centrado de verdad (la leyenda de recharts le robaba ancho al área
          del chart y el centro visual quedaba corrido). */}
      <div className="relative min-w-0 flex-1" style={{ height: 280 }}>
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
              label={renderPctEnAnillo}
            >
              {conMonto.map((d, i) => (
                <Cell key={d.provincia} fill={colorContrato(i)} />
              ))}
            </Pie>
            <Tooltip content={<TooltipProvincia total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs text-slate">Total</p>
          <p className="text-sm font-semibold tabular-nums text-ink">{fmtMoneda(total)}</p>
        </div>
      </div>
      <ul className="flex shrink-0 flex-col gap-2 pr-1 text-xs text-slate">
        {conMonto.map((d, i) => (
          <li key={d.provincia} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: colorContrato(i) }}
            />
            {d.provincia}
          </li>
        ))}
      </ul>
    </div>
  );
}
