'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/button';
import { CardsSkeleton } from '@/components/skeleton';
import { mensajeDeError } from '@/lib/api/liquidacion';
import { useDeshabilitarInspector, useHabilitarInspector, useInspectores } from '@/lib/api/seguridad';
import { PersonasSelect } from '@/features/seguridad/personas-select';
import { ConfirmarDialog } from '@/features/seguridad/confirmar-dialog';
import { ErrorCarga } from '@/features/seguridad/error-carga';
import type { EmpleadoBusqueda } from '@/types/domain';

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Inspectores (ADR-027, revisión 2026-10-08): quiénes, además de HyS, pueden
 * cargar inspecciones de seguridad. Se habilita por persona, no por rol: hoy
 * algunos supervisores. Sus inspecciones las sigue aprobando HyS.
 */
export default function InspectoresPage() {
  const { data: inspectores, isLoading, isError, refetch, isFetching } = useInspectores();
  const [quitando, setQuitando] = useState<{ cuil: string; nombre: string } | null>(null);
  const habilitar = useHabilitarInspector();
  const deshabilitar = useDeshabilitarInspector();
  const [elegido, setElegido] = useState<EmpleadoBusqueda[]>([]);

  function agregar() {
    const persona = elegido[0];
    if (!persona) return;
    toast.promise(habilitar.mutateAsync(persona.cuil), {
      loading: 'Habilitando…',
      success: `${persona.apellido_nombre} ya puede cargar inspecciones`,
      error: (e) => mensajeDeError(e, 'No se pudo habilitar'),
    });
    setElegido([]);
  }

  function quitar(cuil: string, nombre: string) {
    setQuitando(null);
    toast.promise(deshabilitar.mutateAsync(cuil), {
      loading: 'Quitando…',
      success: `${nombre} ya no puede cargar inspecciones`,
      error: (e) => mensajeDeError(e, 'No se pudo quitar'),
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader area="seguridad" title="Inspectores" />
      <p className="text-sm text-slate">
        HyS siempre puede cargar inspecciones. Acá habilitás a otras personas, una por una (por ejemplo, un supervisor). Sus
        inspecciones quedan pendientes y las aprueba HyS, como todas. Quitar la habilitación no borra lo que ya cargaron.
      </p>

      <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <h2 className="font-medium text-ink">Habilitar a alguien</h2>
        <PersonasSelect
          id="persona-inspector"
          label="Persona a habilitar"
          ayuda="Tiene que tener usuario en el sistema."
          max={1}
          value={elegido}
          onChange={setElegido}
        />
        <Button variant="primary" disabled={elegido.length === 0 || habilitar.isPending} onClick={agregar}>
          Habilitar como inspector
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">Habilitados</h2>
        {isError ? (
          <ErrorCarga que="los inspectores" onReintentar={() => refetch()} reintentando={isFetching} />
        ) : isLoading ? (
          <CardsSkeleton count={2} />
        ) : (inspectores ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-slate">
            Todavía no habilitaste a nadie: por ahora solo HyS carga inspecciones.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {(inspectores ?? []).map((i) => (
              <li key={i.cuil} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-ink">
                    {i.nombre}
                    {!i.activo && <span className="ml-2 text-xs font-normal text-danger">(usuario inactivo)</span>}
                  </p>
                  <p className="text-xs text-slate">
                    {i.rol} · habilitado {i.habilitadoPor ? `por ${i.habilitadoPor} ` : ''}el {fecha(i.habilitadoEn)}
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={deshabilitar.isPending}
                  onClick={() => setQuitando({ cuil: i.cuil, nombre: i.nombre })}
                  className="min-h-10"
                >
                  Quitar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {quitando && (
        <ConfirmarDialog
          titulo={`Quitar a ${quitando.nombre} como inspector`}
          detalle="Deja de poder cargar inspecciones. Las que ya cargó quedan como están y se siguen calificando."
          afectados={[quitando.nombre]}
          verbo="Quitar habilitación"
          variante="danger-solid"
          ocupado={deshabilitar.isPending}
          onCancelar={() => setQuitando(null)}
          onConfirmar={() => quitar(quitando.cuil, quitando.nombre)}
        />
      )}
    </div>
  );
}
