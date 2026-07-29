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
  const [jefesCuils, setJefesCuils] = useState<string[]>(contrato.jefesCuils);

  const origJefesCuils = contrato.jefesCuils;

  const nombreValido = nombre.trim().length > 0;
  const jefesCambio =
    jefesCuils.length !== origJefesCuils.length ||
    jefesCuils.some((cuil) => !origJefesCuils.includes(cuil));
  const huboCambios = nombre.trim() !== contrato.nombre || jefesCambio;
  const puedeGuardar = nombreValido && huboCambios && !editar.isPending;

  function toggleJefe(cuil: string) {
    setJefesCuils((prev) => (prev.includes(cuil) ? prev.filter((c) => c !== cuil) : [...prev, cuil]));
  }

  function cerrar() {
    setAbierto(false);
    setNombre(contrato.nombre);
    setJefesCuils(origJefesCuils);
  }

  async function guardar() {
    if (!puedeGuardar) return;
    const payload: { id: number; nombre?: string; jefesCuils?: string[] } = { id: contrato.id };
    if (nombre.trim() !== contrato.nombre) payload.nombre = nombre.trim();
    if (jefesCambio) payload.jefesCuils = jefesCuils;

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

  const nombresJefesActuales = jefes
    .filter((j) => contrato.jefesCuils.includes(j.cuil))
    .map((j) => j.empleado.apellido_nombre);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
        <span className="font-medium text-ink">{contrato.codigo}</span>
        <span className="text-slate">{contrato.nombre}</span>
        <span className="text-xs text-slate">
          {nombresJefesActuales.length > 0 ? `jefes: ${nombresJefesActuales.join(', ')}` : 'sin jefes'}
        </span>
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
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Jefes de Contrato</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {jefes.map((j) => {
                const on = jefesCuils.includes(j.cuil);
                return (
                  <button
                    key={j.cuil}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleJefe(j.cuil)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      on ? 'border-brand bg-accent font-medium text-ink' : 'border-line text-slate hover:border-brand/50'
                    }`}
                  >
                    {j.empleado.apellido_nombre}
                  </button>
                );
              })}
              {jefes.length === 0 && <span className="text-xs text-slate">No hay usuarios con rol Jefe de Contrato.</span>}
            </div>
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
