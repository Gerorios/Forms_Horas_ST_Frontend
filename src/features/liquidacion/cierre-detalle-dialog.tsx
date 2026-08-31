'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useCierre, type CierreDetalleFila, type RegimenLiquidacion } from '@/lib/api/liquidacion';
import { REGIMEN_LABEL } from '@/features/liquidacion/fila-empleado';
import { formatMoney, nombreQuincena } from '@/features/liquidacion/formato';

function formatHoras(v: number | string | null) {
  if (v == null) return '—';
  return Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function etiquetaRegimen(regimen: string) {
  return REGIMEN_LABEL[regimen as RegimenLiquidacion] ?? regimen;
}

/**
 * Tabla congelada (solo lectura) de un cierre ya emitido — mismas columnas
 * que el Excel (ver plan 2026-08-30-cierre-liquidacion-export, §6.2). Scroll
 * horizontal propio: la página que la abre nunca scrollea horizontal.
 */
export function CierreDetalleDialog({ cierreId, onClose }: { cierreId: number; onClose: () => void }) {
  const { data, isLoading } = useCierre(cierreId);

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            Detalle del cierre {data ? `v${data.version}` : ''}
          </DialogTitle>
          <DialogDescription>
            {data ? nombreQuincena(data.quincena, data.mes, data.anio) : 'Cargando…'} — tabla congelada, solo lectura
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <p className="text-slate">Cargando…</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[1900px] text-sm">
              <thead>
                <tr className="border-b border-line bg-sand/40 text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-3 py-2 font-medium">Legajo</th>
                  <th className="px-3 py-2 font-medium">Nombre</th>
                  <th className="px-3 py-2 font-medium">Localidad</th>
                  <th className="px-3 py-2 font-medium">Categoría</th>
                  <th className="px-3 py-2 font-medium">Régimen</th>
                  <th className="px-3 py-2 font-medium">Zona</th>
                  <th className="px-3 py-2 font-medium">Hs Total</th>
                  <th className="px-3 py-2 font-medium">Hs CCT</th>
                  <th className="px-3 py-2 font-medium">Presentismo</th>
                  <th className="px-3 py-2 font-medium">Precio bruto</th>
                  <th className="px-3 py-2 font-medium">No remunerativo</th>
                  <th className="px-3 py-2 font-medium">Total bruto</th>
                  <th className="px-3 py-2 font-medium">Productividad</th>
                  <th className="px-3 py-2 font-medium">Guardias</th>
                  <th className="px-3 py-2 font-medium">Hs extra</th>
                  <th className="px-3 py-2 font-medium">$$ Hs extras</th>
                  <th className="px-3 py-2 font-medium">$ Presentismo</th>
                  <th className="px-3 py-2 font-medium">Novedades</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.detalle.map((fila: CierreDetalleFila) => (
                  <tr key={fila.cuil} className="border-b border-line text-ink last:border-0">
                    <td className="px-3 py-2 tabular-nums">{fila.legajo ?? '—'}</td>
                    <td className="px-3 py-2">{fila.apellidoNombre}</td>
                    <td className="px-3 py-2">{fila.localidad ?? '—'}</td>
                    <td className="px-3 py-2">{fila.categoria ?? '—'}</td>
                    <td className="px-3 py-2">{etiquetaRegimen(fila.regimen)}</td>
                    <td className="px-3 py-2">{fila.zona ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{formatHoras(fila.horasTotal)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatHoras(fila.horasCct)}</td>
                    <td className="px-3 py-2">{fila.tienePresentismo ? 'Sí' : 'No'}</td>
                    <td className="px-3 py-2 tabular-nums">{formatMoney(fila.precioBruto)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatMoney(fila.noRemunerativo)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatMoney(fila.totalBruto)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatMoney(fila.montoProductividad)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatMoney(fila.montoGuardias)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatHoras(fila.horasExtra)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatMoney(fila.montoHorasExtra)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatMoney(fila.montoPresentismo)}</td>
                    <td className="px-3 py-2">{fila.novedadesTexto ?? '—'}</td>
                    <td className="px-3 py-2 font-medium tabular-nums">{formatMoney(fila.total)}</td>
                  </tr>
                ))}
                {data.detalle.length === 0 && (
                  <tr>
                    <td colSpan={19} className="px-3 py-3 text-slate">
                      Sin empleados en este cierre.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
