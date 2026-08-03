'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useActualizarEstacionServicio } from '@/lib/api/admin';
import type { EstacionServicio } from '@/types/domain';

const inputCls =
  'rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

export function EstacionEditRow({ estacion, pill }: { estacion: EstacionServicio; pill: ReactNode }) {
  const actualizar = useActualizarEstacionServicio();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(estacion.nombre);
  const [localidad, setLocalidad] = useState(estacion.localidad ?? '');

  const nombreValido = nombre.trim().length > 0;
  const huboCambios =
    nombre.trim() !== estacion.nombre || localidad.trim() !== (estacion.localidad ?? '');
  const puedeGuardar = nombreValido && huboCambios && !actualizar.isPending;

  function cerrar() {
    setAbierto(false);
    setNombre(estacion.nombre);
    setLocalidad(estacion.localidad ?? '');
  }

  async function guardar() {
    if (!puedeGuardar) return;
    const payload: { id: number; nombre?: string; localidad?: string } = { id: estacion.id };
    if (nombre.trim() !== estacion.nombre) payload.nombre = nombre.trim();
    if (localidad.trim() !== (estacion.localidad ?? '')) payload.localidad = localidad.trim() || undefined;

    const promesa = actualizar.mutateAsync(payload);
    toast.promise(promesa, {
      loading: 'Guardando…',
      success: 'Estación actualizada',
      error: 'No se pudo actualizar',
    });
    try {
      await promesa;
      setAbierto(false);
    } catch {
      // toast.promise ya avisó
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
        <span className="font-medium text-ink">{estacion.nombre}</span>
        <span className="text-slate">{estacion.localidad ?? ''}</span>
        <span className="ml-auto flex items-center gap-2">
          {pill}
          <button
            type="button"
            onClick={() => (abierto ? cerrar() : setAbierto(true))}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-slate transition hover:bg-accent/60"
          >
            {abierto ? 'Cerrar' : 'Editar ▾'}
          </button>
        </span>
      </div>
      {abierto && (
        <div className="space-y-3 bg-accent/20 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              Nombre
              <input aria-label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              Localidad
              <input aria-label="Localidad" value={localidad} onChange={(e) => setLocalidad(e.target.value)} className={inputCls} />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!puedeGuardar}
              onClick={guardar}
              className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
            >
              {actualizar.isPending ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={cerrar}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-slate transition hover:bg-accent/60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
