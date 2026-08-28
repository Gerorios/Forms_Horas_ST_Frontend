'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PuntoHistorico } from '@/lib/api/panel-general';
import { COLOR_SERIE_1, COLOR_SERIE_2 } from './chart-colors';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

type FilaMes = { etiqueta: string; q1: number; q2: number };

function TooltipHoras({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 tabular-nums text-slate">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-ink">{p.value} hs</span>
        </p>
      ))}
    </div>
  );
}

/** Réplica del gráfico "Horas Por Quincena" del viejo tablero Looker:
 * barras agrupadas por mes (1ra vs 2da quincena), últimos 12 meses. */
export function HorasPorQuincenaChart({ datos }: { datos: PuntoHistorico[] }) {
  const max = Math.max(...datos.map((d) => d.horas), 0);
  if (datos.length === 0 || max === 0)
    return <p className="text-sm text-slate">Sin horas en el período.</p>;

  // Una fila por mes, preservando el orden cronológico que ya trae el back.
  const meses: FilaMes[] = [];
  const porClave = new Map<string, FilaMes>();
  for (const d of datos) {
    const clave = `${d.anio}-${d.mes}`;
    let fila = porClave.get(clave);
    if (!fila) {
      fila = {
        etiqueta: `${MESES[d.mes - 1]}${d.mes === 1 ? ` ${String(d.anio).slice(2)}` : ''}`,
        q1: 0,
        q2: 0,
      };
      porClave.set(clave, fila);
      meses.push(fila);
    }
    if (d.quincena === 1) fila.q1 = d.horas;
    else fila.q2 = d.horas;
  }

  // Solo meses con datos: se recortan los extremos vacíos (el sistema es
  // nuevo, la cola de meses en cero no aporta nada), pero un hueco ENTRE
  // meses con datos se conserva — ahí el cero sí es información.
  const primero = meses.findIndex((m) => m.q1 > 0 || m.q2 > 0);
  const ultimo = meses.length - 1 - [...meses].reverse().findIndex((m) => m.q1 > 0 || m.q2 > 0);
  const mesesConDatos = meses.slice(primero, ultimo + 1);

  return (
    <div className="h-72 w-full" role="img" aria-label="Horas por quincena, meses con datos">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={mesesConDatos} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis
            dataKey="etiqueta"
            tickLine={false}
            axisLine={{ stroke: 'var(--color-line)' }}
            tick={{ fill: 'var(--color-slate)', fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-slate)', fontSize: 11 }}
            tickFormatter={(v: number) => v.toLocaleString('es-AR')}
          />
          <Tooltip content={<TooltipHoras />} cursor={{ fill: 'var(--color-sand)' }} />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="square"
            iconSize={9}
            formatter={(value: string) => (
              <span className="text-xs text-slate">{value}</span>
            )}
          />
          <Bar dataKey="q1" name="1ra quincena" fill={COLOR_SERIE_1} radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Bar dataKey="q2" name="2da quincena" fill={COLOR_SERIE_2} radius={[3, 3, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
