'use client';

import { Cell, Pie, PieChart, Tooltip } from 'recharts';
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

/** % afuera del gajo, en tinta sobre el fondo de la card: dentro del anillo
 * los gajos angostos desbordaban el texto blanco hacia el fondo claro
 * (ilegible), y el label default de recharts hereda el color del gajo.
 * El chart tiene tamaño FIJO con margen reservado para estas etiquetas,
 * así nunca se recortan. Gajos < 3% no llevan etiqueta (tooltip/leyenda). */
function renderPctAfuera({
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
  if ((percent ?? 0) < 0.03) return null;
  const r = (outerRadius ?? 0) + 14;
  const cos = Math.cos(-(midAngle ?? 0) * RADIAN);
  const x = (cx ?? 0) + r * cos;
  const y = (cy ?? 0) + r * Math.sin(-(midAngle ?? 0) * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="var(--color-ink)"
      textAnchor={cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle'}
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
      {/* Tamaño FIJO (sin ResponsiveContainer): con flex-1 el contenedor se
          medía mal en el primer render y la dona quedaba corrida/recortada.
          300×280 con radios en px deja ~45px de margen reservado para las
          etiquetas de % afuera; el overlay del total centra exacto. */}
      <div className="relative mx-auto shrink-0" style={{ width: 300, height: 280 }}>
        <PieChart width={300} height={280}>
          <Pie
            data={conMonto}
            dataKey="monto_total"
            nameKey="provincia"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={2}
            isAnimationActive={false}
            labelLine={false}
            label={renderPctAfuera}
          >
            {conMonto.map((d, i) => (
              <Cell key={d.provincia} fill={colorContrato(i)} />
            ))}
          </Pie>
          <Tooltip content={<TooltipProvincia total={total} />} />
        </PieChart>
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
