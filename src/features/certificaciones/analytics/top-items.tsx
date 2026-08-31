'use client';

import type { TopItemPunto } from '@/lib/api/certificaciones';
import { COLOR_MONTO, fmtMoneda, fmtPgn } from './colores';

/** Top ítems por monto certificado — tabla con una mini-barra proporcional al
 * máximo de la lista detrás del monto (patrón bar-in-cell: cuenta la magnitud
 * relativa sin cargar un gráfico de barras aparte para una lista que ya es
 * una tabla). No usa Recharts a propósito. */
export function TopItems({ datos }: { datos: TopItemPunto[] }) {
  if (datos.length === 0) return <p className="text-sm text-slate">Sin ítems para el período filtrado.</p>;

  const max = Math.max(...datos.map((d) => d.monto_total), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Top ítems por monto certificado">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
            <th className="px-3 py-2.5 font-medium">Ítem</th>
            <th className="px-3 py-2.5 font-medium">Tarea</th>
            <th className="px-3 py-2.5 font-medium">Contrato</th>
            <th className="px-3 py-2.5 text-right font-medium">PGN</th>
            <th className="px-3 py-2.5 text-right font-medium">Monto</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d, i) => (
            <tr key={`${d.item_codigo}-${d.contrato}-${i}`} className="border-b border-line text-ink last:border-0">
              <td className="px-3 py-2.5 font-medium">{d.item_codigo}</td>
              <td className="px-3 py-2.5 text-slate">{d.tarea}</td>
              <td className="px-3 py-2.5">{d.contrato}</td>
              <td className="tabular-nums px-3 py-2.5 text-right text-slate">{fmtPgn(d.pgn_total)}</td>
              <td className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="tabular-nums font-medium">{fmtMoneda(d.monto_total)}</span>
                  <span
                    className="h-2 rounded-sm"
                    style={{
                      width: `${max > 0 ? Math.max((d.monto_total / max) * 56, 2) : 0}px`,
                      background: COLOR_MONTO,
                    }}
                    aria-hidden
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
