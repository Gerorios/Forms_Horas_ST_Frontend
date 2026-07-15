'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useEditarTarea, type TareaAdmin, type ContratoAdmin } from '@/lib/api/admin';

const inputCls =
  'rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

export function TareaEditRow({
  tarea,
  contratos,
  pill,
}: {
  tarea: TareaAdmin;
  contratos: ContratoAdmin[];
  pill: ReactNode;
}) {
  const editar = useEditarTarea();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(tarea.nombre);
  const [contratoId, setContratoId] = useState(tarea.contratoId);

  const nombreValido = nombre.trim().length > 0;
  const huboCambios = nombre.trim() !== tarea.nombre || contratoId !== tarea.contratoId;
  const puedeGuardar = nombreValido && huboCambios && !editar.isPending;

  function cerrar() {
    setAbierto(false);
    setNombre(tarea.nombre);
    setContratoId(tarea.contratoId);
  }

  async function guardar() {
    if (!puedeGuardar) return;
    const payload: { id: number; nombre?: string; contratoId?: number } = { id: tarea.id };
    if (nombre.trim() !== tarea.nombre) payload.nombre = nombre.trim();
    if (contratoId !== tarea.contratoId) payload.contratoId = contratoId;

    const promesa = editar.mutateAsync(payload);
    toast.promise(promesa, {
      loading: 'Guardando…',
      success: 'Tarea actualizada',
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
        <span className="font-medium text-ink">{tarea.nombre}</span>
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
              Contrato
              <select
                aria-label="Contrato"
                value={contratoId}
                onChange={(e) => setContratoId(Number(e.target.value))}
                className={inputCls}
              >
                {contratos.map((c) => (
                  <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                ))}
              </select>
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
