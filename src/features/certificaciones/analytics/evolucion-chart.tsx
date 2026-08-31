'use client';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EvolucionMensualPunto } from '@/lib/api/certificaciones';
import { COLOR_MONTO, COLOR_PGN, etiquetaPeriodo, fmtMoneda, fmtPgn } from './colores';

function TooltipEvolucion({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number; dataKey?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const monto = payload.find((p) => p.dataKey === 'monto_total')?.value;
  const pgn = payload.find((p) => p.dataKey === 'pgn_total')?.value;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{label}</p>
      {monto !== undefined && (
        <p className="flex items-center gap-1.5 tabular-nums text-slate">
          <span className="h-2 w-2 rounded-sm" style={{ background: COLOR_MONTO }} />
          Monto: <span className="font-medium text-ink">{fmtMoneda(monto)}</span>
        </p>
      )}
      {pgn !== undefined && (
        <p className="flex items-center gap-1.5 tabular-nums text-slate">
          <span className="h-2 w-2 rounded-sm" style={{ background: COLOR_PGN }} />
          PGN: <span className="font-medium text-ink">{fmtPgn(pgn)}</span>
        </p>
      )}
    </div>
  );
}

/** Evolución mensual: monto certificado (área, eje izquierdo) + Puntos Gasnor
 * (línea, eje derecho) — eje dual porque son dos unidades sin relación de
 * escala directa (superponerlas en un mismo eje aplastaría una de las dos
 * series). Es la sección "Tendencia" del período elegido en los filtros. */
export function EvolucionChart({ datos }: { datos: EvolucionMensualPunto[] }) {
  if (datos.length === 0) return <p className="text-sm text-slate">Sin datos para el período filtrado.</p>;

  const puntos = datos.map((d) => ({ ...d, etiqueta: etiquetaPeriodo(d.periodo) }));

  return (
    <div className="h-72 w-full" role="img" aria-label="Evolución mensual de monto certificado y Puntos Gasnor">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={puntos} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis
            dataKey="etiqueta"
            tickLine={false}
            axisLine={{ stroke: 'var(--color-line)' }}
            tick={{ fill: 'var(--color-slate)', fontSize: 11 }}
          />
          <YAxis
            yAxisId="monto"
            tickLine={false}
            axisLine={false}
            width={80}
            tick={{ fill: 'var(--color-slate)', fontSize: 11 }}
            tickFormatter={(v: number) => fmtMoneda(v)}
          />
          <YAxis
            yAxisId="pgn"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={60}
            tick={{ fill: 'var(--color-slate)', fontSize: 11 }}
            tickFormatter={(v: number) => fmtPgn(v)}
          />
          <Tooltip content={<TooltipEvolucion />} cursor={{ stroke: 'var(--color-slate)', strokeDasharray: '3 3' }} />
          <Area
            yAxisId="monto"
            type="monotone"
            dataKey="monto_total"
            name="Monto"
            stroke={COLOR_MONTO}
            fill={COLOR_MONTO}
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Line
            yAxisId="pgn"
            type="monotone"
            dataKey="pgn_total"
            name="PGN"
            stroke={COLOR_PGN}
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
