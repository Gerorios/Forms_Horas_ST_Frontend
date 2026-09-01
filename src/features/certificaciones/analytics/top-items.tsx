'use client';

import type { TopItemPunto } from '@/lib/api/certificaciones';
import { fmtMoneda } from './colores';

/** Top ítems por monto certificado — 3 columnas: código en chip mono, tarea
 * con ellipsis + `title` (tooltip nativo, tarea suele ser larga) y monto a la
 * derecha en `tabular-nums`, con una barra proporcional (monto/máximo) de
 * fondo detrás de la tarea (patrón bar-in-row: la magnitud relativa se lee
 * sin un gráfico de barras aparte). Sin fila "Otros" (constraint del plan —
 * difiere del mockup a propósito). */
export function TopItems({ datos }: { datos: TopItemPunto[] }) {
  if (datos.length === 0) return <p className="text-sm text-slate">Sin ítems para el período filtrado.</p>;

  const max = Math.max(...datos.map((d) => d.monto_total), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Top ítems por monto certificado">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
            <th className="px-3 py-2.5 font-medium">Código</th>
            <th className="px-3 py-2.5 font-medium">Tarea</th>
            <th className="px-3 py-2.5 text-right font-medium">Monto</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d, i) => {
            const pct = max > 0 ? (d.monto_total / max) * 100 : 0;
            return (
              <tr key={`${d.item_codigo}-${d.contrato}-${i}`} className="border-b border-line text-ink last:border-0">
                <td className="px-3 py-2.5">
                  <span className="rounded bg-sand px-1.5 py-0.5 font-mono text-xs text-ink">{d.item_codigo}</span>
                </td>
                <td className="relative px-3 py-2.5">
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 rounded-sm"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, rgba(169,122,22,0.20), rgba(169,122,22,0.03))',
                    }}
                    aria-hidden
                  />
                  <span
                    className="relative block max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap text-slate"
                    title={d.tarea}
                  >
                    {d.tarea}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums">{fmtMoneda(d.monto_total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
