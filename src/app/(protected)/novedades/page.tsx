'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useActualizarNovedad, useNovedades } from '@/lib/api/novedades';
import { useSession } from '@/lib/auth/session';
import { NuevaNovedadForm } from '@/features/novedades/nueva-novedad-form';
import { EditarNovedadDialog } from '@/features/novedades/editar-novedad-dialog';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { BarraFiltros, MultiFiltro } from '@/components/ui/barra-filtros';
import { PeriodoFiltro } from '@/features/novedades/periodo-filtro';
import { opcionesFacetadas } from '@/lib/facetado';
import { quincenaDeFecha, type Quincena } from '@/lib/quincena';
import type { EstadoHys, Novedad } from '@/types/domain';

const ESTADO_LABEL: Record<EstadoHys, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  desaprobada: 'Desaprobada',
  no_aplica: 'No aplica',
};

/** Quiénes pueden cargar novedades (ver @Roles de POST /novedades en el
 * backend) — JefeContrato queda solo en consulta por ahora, a propósito. */
const ROLES_QUE_CARGAN = ['Supervisor', 'JefeCuadrilla', 'Admin'];

function pasaMulti(valor: string, seleccionados: string[]) {
  return seleccionados.length === 0 || seleccionados.includes(valor);
}

export default function NovedadesPage() {
  const { perfil } = useSession();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Novedad | null>(null);
  const actualizar = useActualizarNovedad();

  const esAdmin = perfil?.rol.nombre === 'Admin';

  function guardarEdicion(form: FormData) {
    if (!editando) return;
    const promesa = actualizar.mutateAsync({ id: editando.id, form });
    toast.promise(promesa, {
      loading: 'Guardando cambios…',
      success: 'Novedad actualizada',
      error: 'No se pudo actualizar la novedad',
    });
    promesa.then(() => setEditando(null)).catch(() => {});
  }

  const [periodoActivo, setPeriodoActivo] = useState(false);
  const [periodo, setPeriodo] = useState<Quincena>(() => quincenaDeFecha(new Date()));
  const { data, isLoading } = useNovedades(periodoActivo ? periodo : undefined);

  const [tipoSel, setTipoSel] = useState<string[]>([]);
  const [operarioSel, setOperarioSel] = useState<string[]>([]);
  const [estadoSel, setEstadoSel] = useState<string[]>([]);

  // JefeCuadrilla solo ve lo que él mismo cargó (el backend ya lo scopea);
  // se lo aclaramos acá para que no piense que falta algo.
  const esJefeCuadrilla = perfil?.rol.nombre === 'JefeCuadrilla';
  const puedeCargar = perfil ? ROLES_QUE_CARGAN.includes(perfil.rol.nombre) : false;

  const filtradas = useMemo(() => {
    return (data ?? []).filter(
      (n) =>
        pasaMulti(String(n.tipoNovedadId), tipoSel) &&
        pasaMulti(n.operarioCuil, operarioSel) &&
        pasaMulti(n.estadoHys, estadoSel),
    );
  }, [data, tipoSel, operarioSel, estadoSel]);

  // Opciones facetadas: cada MultiFiltro se acota con los DEMÁS filtros
  // aplicados (excluyendo el propio) sobre lo que ya trajo el período.
  const opcionesTipo = useMemo(() => {
    const candidatas = (data ?? []).filter(
      (n) => pasaMulti(n.operarioCuil, operarioSel) && pasaMulti(n.estadoHys, estadoSel),
    );
    const labelPorId = new Map((data ?? []).map((n) => [String(n.tipoNovedadId), n.tipoNovedad.nombre]));
    return opcionesFacetadas(candidatas, (n) => String(n.tipoNovedadId), tipoSel, {
      labelDe: (id) => labelPorId.get(id) ?? id,
    });
  }, [data, tipoSel, operarioSel, estadoSel]);

  const opcionesOperario = useMemo(() => {
    const candidatas = (data ?? []).filter(
      (n) => pasaMulti(String(n.tipoNovedadId), tipoSel) && pasaMulti(n.estadoHys, estadoSel),
    );
    const labelPorCuil = new Map((data ?? []).map((n) => [n.operarioCuil, n.operario.apellido_nombre]));
    return opcionesFacetadas(candidatas, (n) => n.operarioCuil, operarioSel, {
      labelDe: (cuil) => labelPorCuil.get(cuil) ?? cuil,
    });
  }, [data, tipoSel, operarioSel, estadoSel]);

  const opcionesEstado = useMemo(() => {
    const candidatas = (data ?? []).filter(
      (n) => pasaMulti(String(n.tipoNovedadId), tipoSel) && pasaMulti(n.operarioCuil, operarioSel),
    );
    return opcionesFacetadas(candidatas, (n) => n.estadoHys, estadoSel, {
      labelDe: (v) => ESTADO_LABEL[v as EstadoHys] ?? v,
    });
  }, [data, tipoSel, operarioSel, estadoSel]);

  const hayFiltros = periodoActivo || tipoSel.length > 0 || operarioSel.length > 0 || estadoSel.length > 0;

  function limpiarFiltros() {
    setPeriodoActivo(false);
    setTipoSel([]);
    setOperarioSel([]);
    setEstadoSel([]);
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Novedades"
        eyebrow={esJefeCuadrilla ? 'Las que cargaste vos' : undefined}
        action={
          puedeCargar && (
            <button
              type="button"
              onClick={() => setMostrarForm((v) => !v)}
              className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
            >
              {mostrarForm ? 'Cerrar' : 'Nueva novedad'}
            </button>
          )
        }
      />

      {mostrarForm && puedeCargar && <NuevaNovedadForm onCreada={() => setMostrarForm(false)} />}

      <BarraFiltros hayFiltros={hayFiltros} onLimpiar={limpiarFiltros}>
        <PeriodoFiltro
          activo={periodoActivo}
          periodo={periodo}
          onChange={(activo, q) => {
            setPeriodoActivo(activo);
            setPeriodo(q);
          }}
        />
        <MultiFiltro
          label="Tipo"
          ariaLabel="Filtrar por tipo de novedad"
          opciones={opcionesTipo}
          seleccionados={tipoSel}
          onChange={setTipoSel}
        />
        <MultiFiltro
          label="Operario"
          ariaLabel="Filtrar por operario"
          opciones={opcionesOperario}
          seleccionados={operarioSel}
          onChange={setOperarioSel}
        />
        <MultiFiltro
          label="Estado"
          ariaLabel="Filtrar por estado"
          opciones={opcionesEstado}
          seleccionados={estadoSel}
          onChange={setEstadoSel}
        />
      </BarraFiltros>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
          {(data ?? []).length === 0 ? 'Sin novedades.' : 'Ninguna novedad coincide con los filtros.'}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate">
            {filtradas.length} novedad{filtradas.length === 1 ? '' : 'es'}
          </p>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-accent/20 text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-4 py-2.5 font-medium">Operario</th>
                  <th className="px-4 py-2.5 font-medium">Tipo</th>
                  <th className="px-4 py-2.5 font-medium">Desde</th>
                  <th className="px-4 py-2.5 font-medium">Hasta</th>
                  <th className="px-4 py-2.5 font-medium">Estado HyS</th>
                  {esAdmin && <th className="px-4 py-2.5 font-medium">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((n: Novedad) => (
                  <tr key={n.id} className="border-b border-line text-ink transition last:border-0 hover:bg-accent/30">
                    <td className="px-4 py-2.5 font-medium">{n.operario.apellido_nombre}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs font-medium text-ink ring-1 ring-inset ring-line">
                        {n.tipoNovedad.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate">{n.fechaInicio.slice(0, 10)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate">{n.fechaFin ? n.fechaFin.slice(0, 10) : '—'}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge estado={n.estadoHys} />
                    </td>
                    {esAdmin && (
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => setEditando(n)}
                          className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-accent/60"
                        >
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editando && (
        <EditarNovedadDialog
          novedad={editando}
          onCancel={() => setEditando(null)}
          onGuardar={guardarEdicion}
          guardando={actualizar.isPending}
        />
      )}
    </section>
  );
}
