'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ordenarCodigosK, type PuntoSerie } from './serie-incidencia';
import { colorContrato } from '@/features/certificaciones/analytics/colores';
import { UMBRAL_INCIDENCIA_PCT } from '@/features/certificaciones/config';

/** Excedido = umbral × 1.5, mismo criterio que `semaforo()` — la banda ámbar
 * marca visualmente el rango "alerta" (entre ok y excedido). */
const UMBRAL_EXCEDIDO_PCT = UMBRAL_INCIDENCIA_PCT * 1.5;

function fmtPctEje(v: number): string {
  return `${v} %`;
}

function TooltipIncidencia({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | null; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{label}</p>
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => (
          <p key={p.name} className="flex items-center gap-1.5 tabular-nums text-slate">
            <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
            {p.name}: <span className="font-medium text-ink">{Number(p.value).toLocaleString('es-AR', { maximumFractionDigits: 1 })} %</span>
          </p>
        ))}
    </div>
  );
}

/** Evolución de la incidencia de MO (12 meses) — una línea por K en colores
 * fijos de la paleta de contratos, más la línea global destacada (tinta,
 * más gruesa). Banda ámbar 30-45% marca la zona de alerta (mismo criterio
 * que `semaforo()`). Un solo eje Y en %, ya que todas las series son
 * porcentajes directamente comparables (no hace falta eje dual). */
export function EvolucionIncidencia({ puntos }: { puntos: PuntoSerie[] }) {
  if (puntos.length === 0) return <p className="text-sm text-slate">Sin datos de incidencia para este período.</p>;

  const codigosK = ordenarCodigosK([...new Set(puntos.flatMap((p) => Object.keys(p.porK)))]);
  const filas = puntos.map((p) => ({ etiqueta: p.etiqueta, global: p.global, ...p.porK }));

  return (
    <div className="h-72 w-full" role="img" aria-label="Evolución mensual de la incidencia de MO">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={filas} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis
            dataKey="etiqueta"
            tickLine={false}
            axisLine={{ stroke: 'var(--color-line)' }}
            tick={{ fill: 'var(--color-slate)', fontSize: 11 }}
          />
          <YAxis
            domain={[0, 'auto']}
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: 'var(--color-slate)', fontSize: 11 }}
            tickFormatter={fmtPctEje}
          />
          <ReferenceArea
            y1={UMBRAL_INCIDENCIA_PCT}
            y2={UMBRAL_EXCEDIDO_PCT}
            fill="var(--color-warn)"
            fillOpacity={0.06}
            ifOverflow="visible"
          />
          <Tooltip content={<TooltipIncidencia />} cursor={{ stroke: 'var(--color-slate)', strokeDasharray: '3 3' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="global"
            name="Global"
            stroke="var(--color-ink)"
            strokeWidth={3}
            dot={false}
            connectNulls
          />
          {codigosK.map((codigo, i) => (
            <Line
              key={codigo}
              type="monotone"
              dataKey={codigo}
              name={codigo}
              stroke={colorContrato(i)}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
