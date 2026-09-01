'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PorContratoMesPunto } from '@/lib/api/certificaciones';
import { COLOR_OTROS, colorContrato, etiquetaPeriodo, fmtMoneda } from './colores';

/** Con más de este número de contratos el apilado deja de contar algo claro
 * (demasiadas franjas finas, leyenda ilegible) — se muestran los N con mayor
 * monto total en el rango filtrado y el resto se agrupa en "Otros" (gris,
 * siempre al tope de la pila). */
const MAX_SERIES = 7;

interface FilaPivot {
  periodo: string;
  etiqueta: string;
  [contrato: string]: string | number;
}

function pivotar(datos: PorContratoMesPunto[]): { filas: FilaPivot[]; series: string[]; hayOtros: boolean } {
  const totalPorContrato = new Map<string, number>();
  for (const d of datos) {
    totalPorContrato.set(d.contrato, (totalPorContrato.get(d.contrato) ?? 0) + d.monto_total);
  }
  const ordenados = [...totalPorContrato.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const top = new Set(ordenados.slice(0, MAX_SERIES));
  const hayOtros = ordenados.length > MAX_SERIES;

  const porPeriodo = new Map<string, FilaPivot>();
  for (const d of datos) {
    const clave = top.has(d.contrato) ? d.contrato : 'Otros';
    if (!porPeriodo.has(d.periodo)) {
      porPeriodo.set(d.periodo, { periodo: d.periodo, etiqueta: etiquetaPeriodo(d.periodo) });
    }
    const fila = porPeriodo.get(d.periodo)!;
    fila[clave] = (Number(fila[clave]) || 0) + d.monto_total;
  }

  const filas = [...porPeriodo.values()].sort((a, b) => a.periodo.localeCompare(b.periodo));
  const series = [...ordenados.filter((c) => top.has(c)), ...(hayOtros ? ['Otros'] : [])];
  return { filas, series, hayOtros };
}

function TooltipPorContrato({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + Number(p.value ?? 0), 0);
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{label}</p>
      {[...payload].reverse().map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 tabular-nums text-slate">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-ink">{fmtMoneda(Number(p.value ?? 0))}</span>
        </p>
      ))}
      <p className="mt-1 border-t border-line pt-1 tabular-nums text-slate">
        Total: <span className="font-medium text-ink">{fmtMoneda(total)}</span>
      </p>
    </div>
  );
}

/** Monto certificado por contrato y mes, barras apiladas — muestra tanto la
 * evolución del total como la composición por K. Top {@link MAX_SERIES}
 * contratos por monto total en el rango; el resto se agrupa en "Otros". */
export function PorContratoChart({ datos }: { datos: PorContratoMesPunto[] }) {
  const { filas, series, hayOtros } = useMemo(() => pivotar(datos), [datos]);

  if (filas.length === 0) return <p className="text-sm text-slate">Sin datos para el período filtrado.</p>;

  return (
    <div className="space-y-2">
      <div className="h-72 w-full" role="img" aria-label="Monto certificado por contrato y mes">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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
            <Tooltip content={<TooltipPorContrato />} cursor={{ fill: 'var(--color-sand)' }} />
            {series.map((contrato, i) => (
              <Bar
                key={contrato}
                dataKey={contrato}
                name={contrato}
                stackId="contratos"
                fill={contrato === 'Otros' ? COLOR_OTROS : colorContrato(i)}
                maxBarSize={36}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {series.map((contrato, i) => (
          <li key={contrato} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: contrato === 'Otros' ? COLOR_OTROS : colorContrato(i) }}
            />
            <span className="text-slate">{contrato}</span>
          </li>
        ))}
      </ul>
      {hayOtros && (
        <p className="text-xs text-slate">
          &quot;Otros&quot; agrupa los contratos fuera del top {MAX_SERIES} por monto en el rango filtrado.
        </p>
      )}
    </div>
  );
}
