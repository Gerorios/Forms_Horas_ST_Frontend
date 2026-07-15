'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useEditarProvincia, type ProvinciaAdmin } from '@/lib/api/admin';

const inputCls =
  'rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

export function ProvinciaEditRow({ provincia }: { provincia: ProvinciaAdmin }) {
  const editar = useEditarProvincia();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(provincia.nombre);

  const nombreValido = nombre.trim().length > 0;
  const huboCambios = nombre.trim() !== provincia.nombre;
  const puedeGuardar = nombreValido && huboCambios && !editar.isPending;

  function cerrar() {
    setAbierto(false);
    setNombre(provincia.nombre);
  }

  async function guardar() {
    if (!puedeGuardar) return;
    const promesa = editar.mutateAsync({ id: provincia.id, nombre: nombre.trim() });
    toast.promise(promesa, {
      loading: 'Guardando…',
      success: 'Provincia actualizada',
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
    <li className="text-sm text-ink">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span>{provincia.nombre}</span>
        <button
          type="button"
          onClick={() => (abierto ? cerrar() : setAbierto(true))}
          className="ml-auto rounded-md border border-line px-3 py-1.5 text-sm font-medium text-slate transition hover:bg-accent/60"
        >
          {abierto ? 'Cerrar' : 'Editar ▾'}
        </button>
      </div>
      {abierto && (
        <div className="space-y-3 bg-accent/20 px-4 py-4">
          <label className="flex max-w-xs flex-col gap-1 text-sm font-medium text-ink">
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
              {editar.isPending ? 'Guardando…' : 'Guardar'}
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
    </li>
  );
}
