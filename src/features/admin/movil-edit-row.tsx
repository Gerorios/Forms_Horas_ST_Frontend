'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useEditarMovil, type MovilAdmin } from '@/lib/api/admin';

const inputCls =
  'rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

export function MovilEditRow({ movil, pill }: { movil: MovilAdmin; pill: ReactNode }) {
  const editar = useEditarMovil();
  const [abierto, setAbierto] = useState(false);
  const [identificador, setIdentificador] = useState(movil.identificador);
  const [descripcion, setDescripcion] = useState(movil.descripcion ?? '');

  const identificadorValido = identificador.trim().length > 0;
  const huboCambios =
    identificador.trim() !== movil.identificador || descripcion.trim() !== (movil.descripcion ?? '');
  const puedeGuardar = identificadorValido && huboCambios && !editar.isPending;

  function cerrar() {
    setAbierto(false);
    setIdentificador(movil.identificador);
    setDescripcion(movil.descripcion ?? '');
  }

  async function guardar() {
    if (!puedeGuardar) return;
    const payload: { id: number; identificador?: string; descripcion?: string } = { id: movil.id };
    if (identificador.trim() !== movil.identificador) payload.identificador = identificador.trim();
    if (descripcion.trim() !== (movil.descripcion ?? '')) payload.descripcion = descripcion.trim() || undefined;

    const promesa = editar.mutateAsync(payload);
    toast.promise(promesa, {
      loading: 'Guardando…',
      success: 'Móvil actualizado',
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
        <span className="font-medium text-ink">{movil.identificador}</span>
        <span className="text-slate">{movil.descripcion ?? ''}</span>
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
              Identificador
              <input aria-label="Identificador" value={identificador} onChange={(e) => setIdentificador(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              Descripción
              <input aria-label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={inputCls} />
            </label>
          </div>
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
    </div>
  );
}
