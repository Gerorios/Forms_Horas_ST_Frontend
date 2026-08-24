'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { FiltroNumero, FiltroSelect } from '@/components/ui/barra-filtros';
import { OperariosSelect } from '@/features/reporte/operarios-select';
import { usePlusIndividual, useCargarPlusIndividual, useEliminarPlusIndividual, mensajeDeError } from '@/lib/api/liquidacion';
import type { EmpleadoBusqueda } from '@/types/domain';

const QUINCENA_OPCIONES = [
  { value: 1, label: '1ra (1 al 15)' },
  { value: 2, label: '2da (16 a fin de mes)' },
];

const MESES_OPCIONES = [
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

function quincenaActual(fecha: Date): 1 | 2 {
  return fecha.getDate() <= 15 ? 1 : 2;
}

/**
 * Monto extra puntual para uno o varios empleados en una quincena puntual,
 * con motivo — independiente de la categoría UOCRA y del bono no
 * remunerativo (ADR-018). No es un precio versionado por período (no tiene
 * "resuelto"/"sugerencia" como las otras secciones): es un dato puntual de
 * esa liquidación, cargado a mano, mismo patrón que Km por tantos.
 *
 * Varios empleados pueden compartir el mismo monto y motivo (pedido
 * explícito 2026-08-21) — se selecciona más de uno y se carga una fila por
 * cada uno.
 */
export function SeccionPlusIndividual({ titulo }: { titulo: ReactNode }) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [quincena, setQuincena] = useState<1 | 2>(quincenaActual(hoy));

  const { data, isLoading } = usePlusIndividual(anio, mes, quincena);
  const cargar = useCargarPlusIndividual();
  const eliminar = useEliminarPlusIndividual();

  const [operarios, setOperarios] = useState<EmpleadoBusqueda[]>([]);
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');

  const puedeCargar = operarios.length > 0 && monto !== '' && !Number.isNaN(Number(monto)) && motivo.trim() !== '';

  function cargarPlus() {
    if (!puedeCargar) return;
    const promesa = Promise.all(
      operarios.map((op) => cargar.mutateAsync({ cuil: op.cuil, anio, mes, quincena, monto: Number(monto), motivo: motivo.trim() })),
    );
    toast.promise(promesa, {
      loading: operarios.length > 1 ? `Guardando para ${operarios.length} empleados…` : 'Guardando…',
      success: operarios.length > 1 ? `Plus cargado para ${operarios.length} empleados` : 'Plus individual cargado',
      error: (e) => mensajeDeError(e, 'No se pudo cargar el plus'),
    });
    promesa
      .then(() => {
        setOperarios([]);
        setMonto('');
        setMotivo('');
      })
      .catch(() => {});
  }

  function eliminarPlus(id: number) {
    toast.promise(eliminar.mutateAsync(id), {
      loading: 'Eliminando…',
      success: 'Plus individual eliminado',
      error: (e) => mensajeDeError(e, 'No se pudo eliminar'),
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold text-ink">{titulo}</h2>
      </div>
      <p className="text-xs text-slate">
        Monto puntual para uno o varios empleados en una quincena — no es un precio del período,
        se carga a mano cada vez. Elegí varios empleados si comparten el mismo monto y motivo.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <FiltroSelect label="Mes" value={mes} onChange={(v) => setMes(Number(v))} opciones={MESES_OPCIONES} opcional={false} />
        <FiltroNumero label="Año" value={anio} onChange={(v) => setAnio(Number(v) || anio)} className="w-24" />
        <FiltroSelect label="Quincena" value={quincena} onChange={(v) => setQuincena(Number(v) as 1 | 2)} opciones={QUINCENA_OPCIONES} opcional={false} />
      </div>

      <div className="space-y-2 border-t border-line pt-3">
        <OperariosSelect value={operarios} onChange={setOperarios} />
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs text-slate">
            Monto
            <input
              aria-label="Monto del plus"
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-32 rounded-md border border-line bg-surface px-2 py-1.5 tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="flex flex-1 flex-col text-xs text-slate">
            Motivo
            <input
              aria-label="Motivo del plus"
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: manejo de máquina X"
              className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <button
            type="button"
            disabled={!puedeCargar || cargar.isPending}
            onClick={cargarPlus}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
          >
            {operarios.length > 1 ? `Cargar a ${operarios.length} empleados` : 'Cargar'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate">Cargando…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-slate">Sin plus individuales cargados en esta quincena.</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-accent/20 text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-3 py-2 font-medium">Empleado</th>
                <th className="px-3 py-2 font-medium">Monto</th>
                <th className="px-3 py-2 font-medium">Motivo</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 text-ink">{p.empleado.apellido_nombre}</td>
                  <td className="px-3 py-2 tabular-nums text-ink">${Number(p.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-slate">{p.motivo}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => eliminarPlus(p.id)}
                      className="rounded-md border border-danger px-2.5 py-1 text-xs font-medium text-danger transition hover:bg-danger/10"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
