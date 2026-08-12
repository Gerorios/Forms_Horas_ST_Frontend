'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalisisQuincena } from '@/lib/api/liquidacion';
import { COLOR_BASICO, fmtMoneda } from './colores';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

type PuntoHistorico = AnalisisQuincena['historico'][number];

function etiqueta(p: { mes: number; quincena: number }) {
  return `${p.quincena === 1 ? '1ª' : '2ª'} ${MESES[p.mes - 1]}`;
}

function TooltipHistorico({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{label}</p>
      <p className="tabular-nums text-slate">
        Total: <span className="font-medium text-ink">{fmtMoneda(Number(payload[0].value ?? 0))}</span>
      </p>
    </div>
  );
}

/** Total liquidado por quincena, últimas 8 (orden cronológico del backend).
 * La quincena seleccionada va a opacidad plena; el resto atenuado, para que
 * el contexto no compita con el período que se está analizando. */
export function HistoricoChart({
  historico,
  seleccionada,
}: {
  historico: PuntoHistorico[];
  seleccionada: { anio: number; mes: number; quincena: number };
}) {
  if (historico.length === 0 || historico.every((p) => p.total === 0))
    return <p className="text-sm text-slate">Sin histórico disponible.</p>;

  const datos = historico.map((p) => ({ ...p, etiqueta: etiqueta(p) }));
  const esSeleccionada = (p: PuntoHistorico) =>
    p.anio === seleccionada.anio && p.mes === seleccionada.mes && p.quincena === seleccionada.quincena;

  return (
    <div className="h-64 w-full" role="img" aria-label="Total liquidado en las últimas 8 quincenas">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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
            width={70}
            tick={{ fill: 'var(--color-slate)', fontSize: 11 }}
            tickFormatter={(v: number) => fmtMoneda(v)}
          />
          <Tooltip content={<TooltipHistorico />} cursor={{ fill: 'var(--color-sand)' }} />
          <Bar dataKey="total" fill={COLOR_BASICO} radius={[3, 3, 0, 0]} maxBarSize={28}>
            {datos.map((p) => (
              <Cell
                key={`${p.anio}-${p.mes}-${p.quincena}`}
                opacity={esSeleccionada(p) ? 1 : 0.55}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
