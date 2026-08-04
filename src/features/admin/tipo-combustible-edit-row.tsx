'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useActualizarTipoCombustible } from '@/lib/api/admin';
import type { TipoCombustible } from '@/types/domain';

const inputCls =
  'rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

export function TipoCombustibleEditRow({ tipo, pill }: { tipo: TipoCombustible; pill: ReactNode }) {
  const actualizar = useActualizarTipoCombustible();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(tipo.nombre);

  const nombreValido = nombre.trim().length > 0;
  const huboCambios = nombre.trim() !== tipo.nombre;
  const puedeGuardar = nombreValido && huboCambios && !actualizar.isPending;

  function cerrar() {
    setAbierto(false);
    setNombre(tipo.nombre);
  }

  async function guardar() {
    if (!puedeGuardar) return;
    const promesa = actualizar.mutateAsync({ id: tipo.id, nombre: nombre.trim() });
    toast.promise(promesa, {
      loading: 'Guardando…',
      success: 'Tipo de combustible actualizado',
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
        <span className="font-medium text-ink">{tipo.nombre}</span>
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
          <label className="flex flex-col gap-1 text-sm font-medium text-ink sm:w-1/2">
            Nombre
            <input aria-label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
          </label>
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
