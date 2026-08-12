'use client';

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalisisQuincena } from '@/lib/api/liquidacion';
import { COLOR_EXTRAS, fmtMoneda, fmtPct } from './colores';

type ContratoAnalisis = AnalisisQuincena['contratos'][number];

/** Gris neutro para el bucket "Sin contrato asignable" (mensualizados puros,
 * por tantos sin registros) — es un resto, no un contrato más. */
const COLOR_SIN_CONTRATO = '#9a9ea3';

function TooltipContrato({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: ContratoAnalisis }[];
}) {
  const c = payload?.[0]?.payload;
  if (!active || !c) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{c.contratoId === null ? c.codigo : `${c.codigo} — ${c.nombre}`}</p>
      <p className="tabular-nums text-slate">
        {fmtMoneda(c.monto)} · {fmtPct(c.pctDelTotal)} del total · {c.horas} hs aprobadas
      </p>
    </div>
  );
}

/** $ por contrato (prorrateo por horas aprobadas): barras horizontales por
 * monto + mini tabla al pie con código, nombre, $, horas y % del total. El
 * bucket "Sin contrato asignable" (contratoId null) viene último del backend
 * y se pinta en gris. */
export function ContratosChart({ contratos }: { contratos: ContratoAnalisis[] }) {
  const max = Math.max(...contratos.map((c) => c.monto), 0);
  if (contratos.length === 0 || max === 0)
    return <p className="text-sm text-slate">Sin montos por contrato.</p>;

  return (
    <div className="space-y-3">
      <div
        className="w-full"
        style={{ height: contratos.length * 34 + 16 }}
        role="img"
        aria-label="Monto liquidado por contrato, prorrateado por horas"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={contratos} layout="vertical" margin={{ top: 0, right: 88, bottom: 0, left: 0 }}>
            <XAxis type="number" hide domain={[0, max]} />
            <YAxis
              type="category"
              dataKey="codigo"
              width={150}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--color-ink)', fontSize: 11 }}
            />
            <Tooltip content={<TooltipContrato />} cursor={{ fill: 'var(--color-sand)' }} />
            <Bar dataKey="monto" radius={[0, 3, 3, 0]} maxBarSize={16}>
              {contratos.map((c) => (
                <Cell
                  key={c.contratoId ?? 'sin-contrato'}
                  fill={c.contratoId === null ? COLOR_SIN_CONTRATO : COLOR_EXTRAS}
                />
              ))}
              <LabelList
                dataKey="monto"
                position="right"
                style={{ fill: 'var(--color-ink)', fontSize: 11 }}
                formatter={(v) => fmtMoneda(Number(v))}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-line text-left uppercase tracking-wide text-slate">
            <th className="py-1.5 pr-2 font-medium">Código</th>
            <th className="py-1.5 pr-2 font-medium">Nombre</th>
            <th className="py-1.5 pr-2 text-right font-medium">Monto</th>
            <th className="py-1.5 pr-2 text-right font-medium">Horas</th>
            <th className="py-1.5 text-right font-medium">% del total</th>
          </tr>
        </thead>
        <tbody>
          {contratos.map((c) => (
            <tr
              key={c.contratoId ?? 'sin-contrato'}
              className={`border-b border-line last:border-0 ${c.contratoId === null ? 'text-slate' : 'text-ink'}`}
            >
              <td className="py-1.5 pr-2 font-medium">{c.codigo}</td>
              <td className="py-1.5 pr-2">{c.contratoId === null ? '—' : c.nombre}</td>
              <td className="tabular-nums py-1.5 pr-2 text-right">{fmtMoneda(c.monto)}</td>
              <td className="tabular-nums py-1.5 pr-2 text-right">{c.horas}</td>
              <td className="tabular-nums py-1.5 text-right">{fmtPct(c.pctDelTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
