'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/button';
import { mensajeDeError } from '@/lib/api/liquidacion';
import { useBorrarPeriodo, useCrearPeriodo, useEditarPeriodo, usePeriodos, type Periodo, type PeriodoInput } from '@/lib/api/seguridad';
import { fechaCorta } from '@/features/seguridad/tipos';
import { PeriodoForm } from '@/features/seguridad/periodo-form';

function FilaPeriodo({ periodo }: { periodo: Periodo & { actual: boolean } }) {
  const editar = useEditarPeriodo();
  const borrar = useBorrarPeriodo();
  const [editando, setEditando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

  function guardar(input: PeriodoInput) {
    const promesa = editar.mutateAsync({ id: periodo.id, input });
    toast.promise(promesa, {
      loading: 'Guardando…',
      success: 'Período actualizado',
      error: (e) => mensajeDeError(e, 'No se pudo actualizar el período'),
    });
    promesa.then(() => setEditando(false)).catch(() => undefined);
  }

  function confirmarBorrado() {
    toast.promise(borrar.mutateAsync(periodo.id), {
      loading: 'Borrando…',
      success: 'Período borrado',
      error: (e) => mensajeDeError(e, 'No se pudo borrar el período'),
    });
    setConfirmandoBorrado(false);
  }

  return (
    <li className="space-y-3 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium text-ink">{periodo.nombre}</span>
        {periodo.actual && (
          <span className="rounded-full bg-approved/10 px-2 py-0.5 text-xs font-medium text-approved ring-1 ring-inset ring-approved/25">Actual</span>
        )}
        <span className="text-slate">
          {fechaCorta(periodo.desde)} al {fechaCorta(periodo.hasta)}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditando((v) => !v)}>
            {editando ? 'Cerrar' : 'Editar'}
          </Button>
          {confirmandoBorrado ? (
            <>
              <Button variant="danger-solid" size="sm" disabled={borrar.isPending} onClick={confirmarBorrado}>
                Sí, borrar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmandoBorrado(false)}>
                No
              </Button>
            </>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setConfirmandoBorrado(true)}>
              Borrar
            </Button>
          )}
        </div>
      </div>
      {confirmandoBorrado && (
        <p className="text-xs text-slate">Borrar el período no toca ningún punto: solo deja de existir ese ranking.</p>
      )}
      {editando && (
        <PeriodoForm
          inicial={{ nombre: periodo.nombre, desde: periodo.desde, hasta: periodo.hasta }}
          enviando={editar.isPending}
          onGuardar={guardar}
          onCancelar={() => setEditando(false)}
          textoBoton="Guardar"
        />
      )}
    </li>
  );
}

/** Períodos de medición (CONTEXT.md, "Período"): con nombre, sin
 * superponerse, con huecos permitidos. El actual es el que contiene hoy. */
export default function PeriodosPage() {
  const { data, isLoading } = usePeriodos();
  const crear = useCrearPeriodo();
  const [version, setVersion] = useState(0);

  function crearPeriodo(input: PeriodoInput) {
    const promesa = crear.mutateAsync(input);
    toast.promise(promesa, {
      loading: 'Guardando…',
      success: 'Período creado',
      error: (e) => mensajeDeError(e, 'No se pudo crear el período'),
    });
    // Limpia el formulario solo si se guardó (remonta con `key`).
    promesa.then(() => setVersion((v) => v + 1)).catch(() => undefined);
  }

  return (
    <div className="space-y-5">
      <PageHeader area="seguridad" title="Períodos" />
      <p className="max-w-2xl text-sm text-slate">
        Los puntos caen en el período de la fecha en que pasó lo reportado. Un período terminado no se congela: si HyS
        califica un reporte atrasado, el ranking de ese período cambia.
      </p>
      <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Nuevo período</h2>
        <PeriodoForm key={version} enviando={crear.isPending} onGuardar={crearPeriodo} textoBoton="Crear período" />
      </section>
      {isLoading ? (
        <p className="text-sm text-slate">Cargando…</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {(data ?? []).map((p) => (
            <FilaPeriodo key={p.id} periodo={p} />
          ))}
          {(data ?? []).length === 0 && <li className="px-4 py-3 text-sm text-slate">Todavía no hay períodos.</li>}
        </ul>
      )}
    </div>
  );
}
