'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { mensajeDeError } from '@/lib/api/liquidacion';
import { useActualizarLanzamiento, type EstadoLanzamiento, type Lanzamiento } from '@/lib/api/lanzamientos';
import { ConfirmarDialog } from '@/features/seguridad/confirmar-dialog';
import { PersonasSelect } from '@/features/seguridad/personas-select';
import { FOCO_VISIBLE } from '@/features/seguridad/tipos';
import type { EmpleadoBusqueda, Rol } from '@/types/domain';

const ROLES: Rol[] = ['HyS', 'Supervisor', 'JefeContrato', 'JefeCuadrilla', 'Operario', 'Liquidador'];

const comoPersona = (u: Lanzamiento['usuarios'][number]): EmpleadoBusqueda => ({
  cuil: u.cuil,
  apellido_nombre: u.nombre,
  legajo: 0,
  cargo: '',
});

/**
 * Un módulo con lanzamiento (ADR-028): su estado (en prueba interna o para
 * todos) y el piloto que lo prueba mientras está interno. Admin lo ve siempre.
 */
export function LanzamientoCard({ l }: { l: Lanzamiento }) {
  const actualizar = useActualizarLanzamiento();
  const [roles, setRoles] = useState<Rol[]>(l.roles);
  const [personas, setPersonas] = useState<EmpleadoBusqueda[]>(l.usuarios.map(comoPersona));
  const [cambiandoA, setCambiandoA] = useState<EstadoLanzamiento | null>(null);

  const interno = l.estado === 'interno';
  const pilotoCambiado =
    [...roles].sort().join() !== [...l.roles].sort().join() ||
    personas.map((p) => p.cuil).sort().join() !== l.usuarios.map((u) => u.cuil).sort().join();

  function guardar(cambios: Parameters<typeof actualizar.mutateAsync>[0]['cambios'], ok: string) {
    const promesa = actualizar.mutateAsync({ modulo: l.modulo, cambios });
    toast.promise(promesa, { loading: 'Guardando…', success: ok, error: (e) => mensajeDeError(e, 'No se pudo guardar') });
    return promesa;
  }

  function confirmarEstado() {
    if (!cambiandoA) return;
    guardar(
      { estado: cambiandoA },
      cambiandoA === 'todos' ? `${l.nombre} ya lo ven todos` : `${l.nombre} volvió a prueba interna`,
    )
      .then(() => setCambiandoA(null))
      .catch(() => undefined);
  }

  const resumenPiloto = [
    'Admin',
    ...l.roles,
    ...(l.usuarios.length ? [`${l.usuarios.length} ${l.usuarios.length === 1 ? 'persona' : 'personas'}`] : []),
  ].join(', ');

  return (
    <section className="space-y-4 rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">{l.nombre}</h2>
          <p className="text-sm text-slate">
            {interno ? `En prueba interna: lo ven ${resumenPiloto}.` : 'Lanzado: lo ven todos los que por su rol tienen acceso.'}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
            interno ? 'bg-warn/10 text-ink ring-warn/30' : 'bg-approved/10 text-approved ring-approved/25'
          }`}
        >
          {interno ? 'Prueba interna' : 'Para todos'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {interno ? (
          <Button variant="approve" className="min-h-11" onClick={() => setCambiandoA('todos')}>
            Lanzar para todos
          </Button>
        ) : (
          <Button variant="secondary" className="min-h-11" onClick={() => setCambiandoA('interno')}>
            Volver a prueba interna
          </Button>
        )}
      </div>

      <div className={`space-y-4 border-t border-line pt-4 ${interno ? '' : 'opacity-70'}`}>
        <div>
          <h3 className="font-medium text-ink">Piloto</h3>
          <p className="text-xs text-slate">
            Quiénes lo prueban mientras está en prueba interna. Adentro del módulo, cada uno puede hacer lo que su rol permite.
            {!interno && ' Ahora no se usa: el módulo ya es para todos.'}
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Roles</legend>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-sand px-3 text-sm text-slate">
              <input type="checkbox" checked disabled />
              Admin (siempre)
            </label>
            {ROLES.map((r) => (
              <label key={r} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-line px-3 text-sm text-ink ${FOCO_VISIBLE}`}>
                <input
                  type="checkbox"
                  checked={roles.includes(r)}
                  onChange={(e) => setRoles((prev) => (e.target.checked ? [...prev, r] : prev.filter((x) => x !== r)))}
                />
                {r}
              </label>
            ))}
          </div>
        </fieldset>

        <PersonasSelect
          id={`piloto-${l.modulo}`}
          label="Personas"
          ayuda="Gente puntual que lo prueba aunque su rol no esté tildado. Tiene que tener usuario en el sistema."
          value={personas}
          onChange={setPersonas}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            className="min-h-11"
            disabled={!pilotoCambiado || actualizar.isPending}
            onClick={() => guardar({ roles, usuarios: personas.map((p) => p.cuil) }, 'Piloto guardado').catch(() => undefined)}
          >
            Guardar piloto
          </Button>
          {pilotoCambiado && (
            <Button
              variant="ghost"
              className="min-h-11"
              onClick={() => {
                setRoles(l.roles);
                setPersonas(l.usuarios.map(comoPersona));
              }}
            >
              Deshacer cambios
            </Button>
          )}
        </div>
      </div>

      {cambiandoA && (
        <ConfirmarDialog
          titulo={cambiandoA === 'todos' ? `Lanzar ${l.nombre} para todos` : `Volver ${l.nombre} a prueba interna`}
          detalle={
            cambiandoA === 'todos'
              ? 'Lo van a ver todos los usuarios que por su rol tienen acceso, la próxima vez que entren o recarguen la página. No hace falta deploy.'
              : `Deja de verlo todo el mundo salvo el piloto: ${resumenPiloto}.`
          }
          verbo={cambiandoA === 'todos' ? 'Lanzar para todos' : 'Volver a prueba interna'}
          variante={cambiandoA === 'todos' ? 'approve' : 'danger-solid'}
          ocupado={actualizar.isPending}
          onConfirmar={confirmarEstado}
          onCancelar={() => setCambiandoA(null)}
        />
      )}
    </section>
  );
}
