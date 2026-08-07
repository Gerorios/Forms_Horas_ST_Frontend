'use client';

import type { FilaDetalleEmpleado } from '@/lib/api/liquidacion';
import { formatMoney } from './fila-empleado';

const COLUMNAS = 12;

/**
 * Tabla propia para el régimen "por tantos" (relevadores) — separada de
 * jornalizado/fijo/mensualizado porque tiene un shape de datos distinto
 * (km, monto bruto) y una regla propia de extra (sin ×1.5, siempre en B,
 * sin modalidad de pago). Ver ADR-015.
 */
export function TablaPorTantos({
  filas,
  kmPorCuil,
}: {
  filas: FilaDetalleEmpleado[];
  kmPorCuil: Map<string, string | null>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[1000px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
            <th className="px-3 py-2.5 font-medium">Relevador</th>
            <th className="px-3 py-2.5 font-medium">Categoría</th>
            <th className="px-3 py-2.5 font-medium">Km</th>
            <th className="px-3 py-2.5 font-medium">Monto bruto</th>
            <th className="px-3 py-2.5 font-medium">Hs totales</th>
            <th className="px-3 py-2.5 font-medium">Hs CCT</th>
            <th className="px-3 py-2.5 font-medium">Básico</th>
            <th className="px-3 py-2.5 font-medium">Hs extra</th>
            <th className="px-3 py-2.5 font-medium">Extra (en B)</th>
            <th className="px-3 py-2.5 font-medium">Presentismo</th>
            <th className="px-3 py-2.5 font-medium">TOTAL</th>
            <th className="px-3 py-2.5 font-medium">Alertas</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.cuil} className="border-b border-line text-ink last:border-0">
              <td className="px-3 py-2.5">{f.nombre}</td>
              <td className="px-3 py-2.5">{f.categoria ?? '—'}</td>
              <td className="px-3 py-2.5 tabular-nums">{kmPorCuil.get(f.cuil) ?? '—'}</td>
              <td className="px-3 py-2.5 tabular-nums">
                {f.montoKmBruto != null ? formatMoney(f.montoKmBruto) : '—'}
              </td>
              <td className="px-3 py-2.5 tabular-nums">
                {f.horasTotal !== null ? Number(f.horasTotal).toFixed(2) : '—'}
              </td>
              <td className="px-3 py-2.5 tabular-nums">
                {f.horasCct !== null ? Number(f.horasCct).toFixed(2) : '—'}
              </td>
              <td className="px-3 py-2.5 tabular-nums">{formatMoney(f.basico)}</td>
              <td className="px-3 py-2.5 tabular-nums">
                {f.horasExtra !== null ? Number(f.horasExtra).toFixed(2) : '—'}
              </td>
              <td className="px-3 py-2.5 tabular-nums">{formatMoney(f.montoExtra)}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatMoney(f.presentismo)}</td>
              <td className="px-3 py-2.5 font-medium tabular-nums">{formatMoney(f.total)}</td>
              <td className="px-3 py-2.5">
                {f.datoFaltante && (
                  <span
                    className="rounded bg-danger/10 px-1 text-xs font-medium text-danger"
                    title={f.datoFaltante}
                  >
                    falta dato
                  </span>
                )}
              </td>
            </tr>
          ))}
          {filas.length === 0 && (
            <tr>
              <td colSpan={COLUMNAS} className="px-3 py-3 text-sm text-slate">
                Sin relevadores &quot;por tantos&quot; en esta quincena.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
