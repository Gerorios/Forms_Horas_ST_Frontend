'use client';

import { useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ResumenOperario } from '@/lib/api/panel-general';
import { COLOR_SERIE_1 } from './chart-colors';

function TooltipRanking({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{label}</p>
      <p className="tabular-nums text-slate">
        <span className="font-medium text-ink">{payload[0].value} hs</span> · clic para ver en
        Aprobaciones
      </p>
    </div>
  );
}

/** Réplica del "Ranking | Operarios con mayor cantidad de horas" del Looker:
 * top 10 por total de horas de la quincena (pendientes + aprobadas), barras
 * horizontales para que los nombres largos se lean completos. Clic en una
 * barra lleva a los registros de ese operario en /aprobaciones. */
export function RankingOperarios({ resumen }: { resumen: ResumenOperario[] }) {
  const router = useRouter();
  const top = [...resumen]
    .sort((a, b) => b.totalHoras - a.totalHoras)
    .slice(0, 10)
    .map((r) => ({ cuil: r.cuil, nombre: r.apellido_nombre, horas: r.totalHoras }));
  const max = Math.max(...top.map((r) => r.horas), 0);
  if (top.length === 0 || max === 0)
    return <p className="text-sm text-slate">Sin horas en esta quincena.</p>;

  return (
    <div
      className="w-full"
      style={{ height: top.length * 34 + 16 }}
      role="img"
      aria-label="Ranking de operarios con mayor cantidad de horas en la quincena"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={top}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
        >
          <XAxis type="number" hide domain={[0, max]} />
          <YAxis
            type="category"
            dataKey="nombre"
            width={150}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-ink)', fontSize: 11 }}
          />
          <Tooltip content={<TooltipRanking />} cursor={{ fill: 'var(--color-sand)' }} />
          <Bar
            dataKey="horas"
            fill={COLOR_SERIE_1}
            radius={[0, 3, 3, 0]}
            maxBarSize={16}
            className="cursor-pointer"
            onClick={(dato) => {
              const cuil = (dato as unknown as { payload?: { cuil?: string } }).payload?.cuil;
              if (cuil) router.push(`/aprobaciones?operarioCuil=${cuil}`);
            }}
          >
            <LabelList
              dataKey="horas"
              position="right"
              style={{ fill: 'var(--color-ink)', fontSize: 11 }}
              formatter={(v) => `${v}`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
