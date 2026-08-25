'use client';

import { memo, useState } from 'react';
import type { FilaDetalleEmpleado, RegimenLiquidacion } from '@/lib/api/liquidacion';
import { DetalleEmpleado } from './detalle-empleado';

export const REGIMEN_LABEL: Record<RegimenLiquidacion, string> = {
  jornalizado: 'Jornalizado',
  fijo: 'Fijo',
  fijo_105: 'Fijo 105hs',
  mensualizado: 'Mensualizado',
  por_tantos: 'Por tantos',
  administrativo: 'Administrativo',
};

const COLUMNAS = 14;

export function formatMoney(v: string) {
  return Number(v).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
}

// Memoizado: con 100+ filas montadas, un re-render del padre (ej. tipear en
// un filtro) no debería repintar todas las filas si su `fila` no cambió.
export const FilaEmpleado = memo(function FilaEmpleado({
  fila,
  contratosDestacados,
}: {
  fila: FilaDetalleEmpleado;
  /** Códigos de contrato tildados en el filtro de contrato — se resaltan los
   * días correspondientes en el expand (los totales de la fila no cambian). */
  contratosDestacados?: string[];
}) {
  const [expandido, setExpandido] = useState(false);

  return (
    <>
      <tr
        className="cursor-pointer border-b border-line text-ink last:border-0 hover:bg-accent/30"
        onClick={() => setExpandido((v) => !v)}
      >
        <td className="px-3 py-2.5">{fila.nombre}</td>
        <td className="px-3 py-2.5">{REGIMEN_LABEL[fila.regimen] ?? fila.regimen}</td>
        <td className="px-3 py-2.5">{fila.categoria ?? '—'}</td>
        <td className="px-3 py-2.5 tabular-nums">
          {fila.horasTotal !== null ? Number(fila.horasTotal).toFixed(2) : '—'}
        </td>
        <td className="px-3 py-2.5 tabular-nums">
          {fila.horasCct !== null ? Number(fila.horasCct).toFixed(2) : '—'}
        </td>
        <td className="px-3 py-2.5 tabular-nums">
          {fila.horasExtra !== null ? Number(fila.horasExtra).toFixed(2) : '—'}
        </td>
        <td className="px-3 py-2.5 tabular-nums">{formatMoney(fila.basico)}</td>
        <td className="px-3 py-2.5 tabular-nums">{formatMoney(fila.montoExtra)}</td>
        <td className="px-3 py-2.5 tabular-nums">{formatMoney(fila.presentismo)}</td>
        <td className="px-3 py-2.5 tabular-nums">{formatMoney(fila.totalPlus)}</td>
        <td className="px-3 py-2.5 tabular-nums">{formatMoney(fila.noRemunerativo)}</td>
        <td className="px-3 py-2.5 font-medium tabular-nums">{formatMoney(fila.total)}</td>
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            {fila.pendientesAprobacion > 0 && (
              <span
                className="rounded bg-warn/10 px-1 text-xs font-medium text-warn"
                title="Registros pendientes de aprobar en este período"
              >
                {fila.pendientesAprobacion} pendiente{fila.pendientesAprobacion === 1 ? '' : 's'}
              </span>
            )}
            {fila.duplicadoCruzado && (
              <span
                className="rounded bg-danger/10 px-1 text-xs font-medium text-danger"
                title="Registro duplicado exacto: dos cargas idénticas (mismas horas, contrato, tareas y móviles) el mismo día"
              >
                ⚠ duplicado
              </span>
            )}
            {fila.datoFaltante && (
              <span
                className="rounded bg-danger/10 px-1 text-xs font-medium text-danger"
                title={fila.datoFaltante}
              >
                falta dato
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2.5 text-right text-xs text-slate">{expandido ? 'Cerrar ▴' : 'Ver detalle ▾'}</td>
      </tr>
      {expandido && (
        <tr className="border-b border-line last:border-0">
          <td colSpan={COLUMNAS} className="bg-sand/30 px-3 py-3">
            <DetalleEmpleado fila={fila} contratosDestacados={contratosDestacados} />
          </td>
        </tr>
      )}
    </>
  );
});
