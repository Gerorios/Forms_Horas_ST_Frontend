'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { InteranualResponse } from '@/lib/api/certificaciones';
import { COLOR_OTROS, COLOR_MONTO, NOMBRES_MES, fmtMoneda, fmtPct } from './colores';

function TooltipInteranual({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload?: InteranualResponse['meses'][number] }[];
  label?: string;
}) {
  const m = payload?.[0]?.payload;
  if (!active || !m) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{label}</p>
      {m.monto_actual !== null && (
        <p className="tabular-nums text-slate">
          Actual: <span className="font-medium text-ink">{fmtMoneda(m.monto_actual)}</span>
        </p>
      )}
      {m.monto_anterior !== null && (
        <p className="tabular-nums text-slate">
          Año anterior: <span className="font-medium text-ink">{fmtMoneda(m.monto_anterior)}</span>
        </p>
      )}
      {m.var_monto !== null && (
        <p className="tabular-nums text-slate">
          Variación: <span className="font-medium text-ink">{fmtPct(m.var_monto, true)}</span>
        </p>
      )}
    </div>
  );
}

/** Monto certificado mes a mes, año actual vs año anterior — barras agrupadas
 * (no apiladas: son dos años distintos, apilarlos sumaría cosas que no se
 * suman). Reemplaza al típico "% interanual" suelto del portal viejo: acá se
 * ve la magnitud de cada año lado a lado, no solo la variación relativa. */
export function InteranualChart({ datos }: { datos: InteranualResponse }) {
  if (datos.meses.length === 0 || datos.anio_actual === null)
    return <p className="text-sm text-slate">Sin datos interanuales disponibles.</p>;

  const puntos = datos.meses.map((m) => ({ ...m, etiqueta: NOMBRES_MES[m.mes - 1] ?? String(m.mes) }));
  const labelActual = String(datos.anio_actual);
  const labelAnterior = datos.anio_anterior !== null ? String(datos.anio_anterior) : 'Año anterior';

  return (
    <div className="space-y-2">
      <div
        className="h-64 w-full"
        role="img"
        aria-label={`Monto certificado mensual, ${labelActual} vs ${labelAnterior}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={puntos} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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
              width={80}
              tick={{ fill: 'var(--color-slate)', fontSize: 11 }}
              tickFormatter={(v: number) => fmtMoneda(v)}
            />
            <Tooltip content={<TooltipInteranual />} cursor={{ fill: 'var(--color-sand)' }} />
            <Bar dataKey="monto_anterior" name={labelAnterior} fill={COLOR_OTROS} radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar dataKey="monto_actual" name={labelActual} fill={COLOR_MONTO} radius={[3, 3, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COLOR_OTROS }} />
          <span className="text-slate">{labelAnterior}</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COLOR_MONTO }} />
          <span className="text-slate">{labelActual}</span>
        </li>
      </ul>
    </div>
  );
}
