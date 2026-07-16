'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useEditarContrato, type ContratoAdmin, type UsuarioAdmin } from '@/lib/api/admin';

const inputCls =
  'rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

export function ContratoEditRow({
  contrato,
  jefes,
  pill,
}: {
  contrato: ContratoAdmin;
  jefes: UsuarioAdmin[];
  pill: ReactNode;
}) {
  const editar = useEditarContrato();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(contrato.nombre);
  const [jefeCuil, setJefeCuil] = useState(contrato.jefeContratoCuil ?? '');

  const nombreValido = nombre.trim().length > 0;
  const huboCambios =
    nombre.trim() !== contrato.nombre || jefeCuil !== (contrato.jefeContratoCuil ?? '');
  const puedeGuardar = nombreValido && huboCambios && !editar.isPending;

  function cerrar() {
    setAbierto(false);
    setNombre(contrato.nombre);
    setJefeCuil(contrato.jefeContratoCuil ?? '');
  }

  async function guardar() {
    if (!puedeGuardar) return;
    const payload: { id: number; nombre?: string; jefeContratoCuil?: string | null } = { id: contrato.id };
    if (nombre.trim() !== contrato.nombre) payload.nombre = nombre.trim();
    if (jefeCuil !== (contrato.jefeContratoCuil ?? '')) {
      payload.jefeContratoCuil = jefeCuil === '' ? null : jefeCuil;
    }

    const promesa = editar.mutateAsync(payload);
    toast.promise(promesa, {
      loading: 'Guardando…',
      success: 'Contrato actualizado',
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
        <span className="font-medium text-ink">{contrato.codigo}</span>
        <span className="text-slate">{contrato.nombre}</span>
        {contrato.jefeContrato && (
          <span className="text-xs text-slate">jefe: {contrato.jefeContrato.email}</span>
        )}
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
              Jefe de Contrato
              <select
                aria-label="Jefe de Contrato"
                value={jefeCuil}
                onChange={(e) => setJefeCuil(e.target.value)}
                className={inputCls}
              >
                <option value="">Sin jefe asignado</option>
                {jefes.map((j) => (
                  <option key={j.cuil} value={j.cuil}>{j.empleado.apellido_nombre} — {j.email}</option>
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
