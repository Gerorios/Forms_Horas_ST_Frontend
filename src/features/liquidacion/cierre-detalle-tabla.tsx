'use client';

import { useState } from 'react';
import type { CierreDetalleFila, RegimenLiquidacion } from '@/lib/api/liquidacion';
import { REGIMEN_LABEL } from '@/features/liquidacion/fila-empleado';
import { formatMoney } from '@/features/liquidacion/formato';

const COLUMNAS = 13;

function formatHoras(v: number | string | null) {
  if (v == null) return '—';
  return Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function etiquetaRegimen(regimen: string) {
  return REGIMEN_LABEL[regimen as RegimenLiquidacion] ?? regimen;
}

function etiquetaZona(zona: 'norte' | 'sur' | null) {
  if (zona === 'norte') return 'Norte';
  if (zona === 'sur') return 'Sur';
  return null;
}

/** Par etiqueta/valor del expand de una fila congelada. */
function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}

/** Fila congelada de un cierre: columnas principales visibles (mismas que el
 * detalle vivo de quincena) y el resto de los datos del snapshot en un expand
 * por empleado — reemplaza a la tabla plana de 19 columnas del viejo dialog,
 * que no entraba en pantalla (feedback QA 2026-08-31). */
function FilaCierre({ fila }: { fila: CierreDetalleFila }) {
  const [expandido, setExpandido] = useState(false);
  const esPorTantos = fila.regimen === 'por_tantos';

  return (
    <>
      <tr
        className="cursor-pointer border-b border-line text-ink last:border-0 hover:bg-accent/30"
        onClick={() => setExpandido((v) => !v)}
      >
        <td className="px-3 py-2.5">{fila.apellidoNombre}</td>
        <td className="px-3 py-2.5">{etiquetaRegimen(fila.regimen)}</td>
        <td className="px-3 py-2.5">{fila.categoria ?? '—'}</td>
        <td className="px-3 py-2.5">
          {etiquetaZona(fila.zona) ?? (
            <span
              className="rounded bg-danger/10 px-1 text-xs font-medium text-danger"
              title="Provincia no mapeada a una zona (norte: Salta/Jujuy, sur: Tucumán)"
            >
              sin zona
            </span>
          )}
        </td>
        <td className="px-3 py-2.5 tabular-nums">{formatHoras(fila.horasTotal)}</td>
        <td className="px-3 py-2.5 tabular-nums">{formatHoras(fila.horasCct)}</td>
        <td className="px-3 py-2.5 tabular-nums">{formatHoras(fila.horasExtra)}</td>
        <td className="px-3 py-2.5 tabular-nums">{formatMoney(fila.totalBruto)}</td>
        <td className="px-3 py-2.5 tabular-nums">{formatMoney(fila.montoHorasExtra)}</td>
        <td className="px-3 py-2.5 tabular-nums">{formatMoney(fila.montoPresentismo)}</td>
        <td className="px-3 py-2.5 tabular-nums">{formatMoney(fila.noRemunerativo)}</td>
        <td className="px-3 py-2.5 font-medium tabular-nums">{formatMoney(fila.total)}</td>
        <td className="px-3 py-2.5 text-right text-xs text-slate">{expandido ? 'Cerrar ▴' : 'Más ▾'}</td>
      </tr>
      {expandido && (
        <tr className="border-b border-line last:border-0">
          <td colSpan={COLUMNAS} className="bg-sand/30 px-3 py-3">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
              <Dato label="Legajo">{fila.legajo ?? '—'}</Dato>
              <Dato label="CUIL">{fila.cuil}</Dato>
              <Dato label="Localidad">{fila.localidad ?? '—'}</Dato>
              <Dato label="Provincia">{fila.provincia ?? '—'}</Dato>
              <Dato label="Precio bruto">{formatMoney(fila.precioBruto)}</Dato>
              <Dato label="Presentismo">{fila.tienePresentismo ? 'Sí' : 'No'}</Dato>
              <Dato label="Productividad">{formatMoney(fila.montoProductividad)}</Dato>
              <Dato label="Guardias">{formatMoney(fila.montoGuardias)}</Dato>
              <Dato label="Plus individual">{formatMoney(fila.plusIndividual)}</Dato>
              {esPorTantos && (
                <>
                  <Dato label="KM">{formatHoras(fila.kmTotal)}</Dato>
                  <Dato label="Monto KM">{formatMoney(fila.montoKmBruto)}</Dato>
                  <Dato label="Monto A">{formatMoney(fila.montoA)}</Dato>
                  <Dato label="Monto B">{formatMoney(fila.montoB)}</Dato>
                </>
              )}
              {fila.novedadesTexto && <Dato label="Novedades">{fila.novedadesTexto}</Dato>}
              {fila.salvedad && <Dato label="Salvedad">{fila.salvedad}</Dato>}
            </dl>
          </td>
        </tr>
      )}
    </>
  );
}

export function CierreDetalleTabla({ filas }: { filas: CierreDetalleFila[] }) {
  const ordenadas = [...filas].sort((a, b) => a.apellidoNombre.localeCompare(b.apellidoNombre, 'es'));
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[1100px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
            <th className="px-3 py-2.5 font-medium">Empleado</th>
            <th className="px-3 py-2.5 font-medium">Régimen</th>
            <th className="px-3 py-2.5 font-medium">Categoría</th>
            <th className="px-3 py-2.5 font-medium">Zona</th>
            <th className="px-3 py-2.5 font-medium">Hs totales</th>
            <th className="px-3 py-2.5 font-medium">Hs CCT</th>
            <th className="px-3 py-2.5 font-medium">Hs extra</th>
            <th className="px-3 py-2.5 font-medium">Total bruto</th>
            <th className="px-3 py-2.5 font-medium">$$ Hs extras</th>
            <th className="px-3 py-2.5 font-medium">$ Presentismo</th>
            <th className="px-3 py-2.5 font-medium">No remunerativo</th>
            <th className="px-3 py-2.5 font-medium">TOTAL</th>
            <th className="px-3 py-2.5 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((f) => (
            <FilaCierre key={f.cuil} fila={f} />
          ))}
          {ordenadas.length === 0 && (
            <tr>
              <td colSpan={COLUMNAS} className="px-3 py-3 text-slate">
                Sin empleados en este cierre.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
