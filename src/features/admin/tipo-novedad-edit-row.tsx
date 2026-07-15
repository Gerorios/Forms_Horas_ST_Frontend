'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useEditarTipoNovedad, type TipoNovedadAdmin } from '@/lib/api/admin';

const inputCls =
  'rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

export function TipoNovedadEditRow({ tipo, pill }: { tipo: TipoNovedadAdmin; pill: ReactNode }) {
  const editar = useEditarTipoNovedad();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(tipo.nombre);
  const [requiereHys, setRequiereHys] = useState(tipo.requiereAprobacionHys);
  const [generaPlus, setGeneraPlus] = useState(tipo.generaPlus);

  const nombreValido = nombre.trim().length > 0;
  const huboCambios =
    nombre.trim() !== tipo.nombre ||
    requiereHys !== tipo.requiereAprobacionHys ||
    generaPlus !== tipo.generaPlus;
  const puedeGuardar = nombreValido && huboCambios && !editar.isPending;

  function cerrar() {
    setAbierto(false);
    setNombre(tipo.nombre);
    setRequiereHys(tipo.requiereAprobacionHys);
    setGeneraPlus(tipo.generaPlus);
  }

  async function guardar() {
    if (!puedeGuardar) return;
    const payload: { id: number; nombre?: string; requiereAprobacionHys?: boolean; generaPlus?: boolean } = { id: tipo.id };
    if (nombre.trim() !== tipo.nombre) payload.nombre = nombre.trim();
    if (requiereHys !== tipo.requiereAprobacionHys) payload.requiereAprobacionHys = requiereHys;
    if (generaPlus !== tipo.generaPlus) payload.generaPlus = generaPlus;

    const promesa = editar.mutateAsync(payload);
    toast.promise(promesa, {
      loading: 'Guardando…',
      success: 'Tipo actualizado',
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
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
        <span className="font-medium text-ink">{tipo.nombre}</span>
        {tipo.requiereAprobacionHys && <span className="rounded bg-accent px-1.5 py-0.5 text-xs text-brand-deep">HyS</span>}
        {tipo.generaPlus && <span className="rounded bg-accent px-1.5 py-0.5 text-xs text-brand-deep">plus</span>}
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
          <label className="flex max-w-xs flex-col gap-1 text-sm font-medium text-ink">
            Nombre
            <input aria-label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
          </label>
          <div className="flex flex-wrap gap-4 text-sm text-ink">
            <label className="flex items-center gap-2">
              <input
                aria-label="Requiere aprobación de HyS"
                type="checkbox"
                checked={requiereHys}
                onChange={(e) => setRequiereHys(e.target.checked)}
              />
              Requiere aprobación de HyS
            </label>
            <label className="flex items-center gap-2">
              <input
                aria-label="Genera plus"
                type="checkbox"
                checked={generaPlus}
                onChange={(e) => setGeneraPlus(e.target.checked)}
              />
              Genera plus
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
