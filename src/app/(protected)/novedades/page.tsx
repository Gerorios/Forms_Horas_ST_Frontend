'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useActualizarNovedad, useAnularNovedad, useNovedades } from '@/lib/api/novedades';
import { useSession } from '@/lib/auth/session';
import { NuevaNovedadForm } from '@/features/novedades/nueva-novedad-form';
import { EditarNovedadDialog } from '@/features/novedades/editar-novedad-dialog';
import { AnularNovedadDialog } from '@/features/novedades/anular-novedad-dialog';
import { DetalleNovedadDialog } from '@/features/novedades/detalle-novedad-dialog';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { BarraFiltros, MultiFiltro } from '@/components/ui/barra-filtros';
import { PeriodoFiltro } from '@/features/novedades/periodo-filtro';
import { opcionesFacetadas } from '@/lib/facetado';
import { quincenaDeFecha, type Quincena } from '@/lib/quincena';
import type { EstadoHys, EstadoNovedad, Novedad, Perfil } from '@/types/domain';

const ESTADO_LABEL: Record<EstadoHys, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  desaprobada: 'Desaprobada',
  no_aplica: 'No aplica',
};

const VIGENCIA_LABEL: Record<EstadoNovedad, string> = { activa: 'Activa', anulada: 'Anulada' };

/** Quiénes pueden cargar novedades (ver @Roles de POST /novedades en el
 * backend) — JefeContrato queda solo en consulta por ahora, a propósito. */
const ROLES_QUE_CARGAN = ['Supervisor', 'JefeCuadrilla', 'Admin'];

function pasaMulti(valor: string, seleccionados: string[]) {
  return seleccionados.length === 0 || seleccionados.includes(valor);
}

/** Editar/Anular: Admin en cualquier tipo; HyS solo en Ausencia (mismo
 * alcance que valida el backend en PATCH /novedades/:id y /:id/anular —
 * un 403 si HyS intenta en otro tipo). */
function puedeEditar(novedad: Novedad, perfil: Pick<Perfil, 'rol'> | null | undefined): boolean {
  if (!perfil) return false;
  if (perfil.rol.nombre === 'Admin') return true;
  if (perfil.rol.nombre === 'HyS') return novedad.tipoNovedad.nombre === 'Ausencia';
  return false;
}

export default function NovedadesPage() {
  const { perfil } = useSession();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Novedad | null>(null);
  const [anulando, setAnulando] = useState<Novedad | null>(null);
  const [detalle, setDetalle] = useState<Novedad | null>(null);
  const actualizar = useActualizarNovedad();
  const anular = useAnularNovedad();

  const esAdmin = perfil?.rol.nombre === 'Admin';
  const esHys = perfil?.rol.nombre === 'HyS';
  const mostrarColumnaAcciones = esAdmin || esHys;

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

  function confirmarAnulacion(motivo: string) {
    if (!anulando) return;
    const promesa = anular.mutateAsync({ id: anulando.id, motivo });
    toast.promise(promesa, {
      loading: 'Anulando…',
      success: 'Novedad anulada',
      error: 'No se pudo anular',
    });
    promesa.then(() => setAnulando(null)).catch(() => {});
  }

  const [periodoActivo, setPeriodoActivo] = useState(false);
  const [periodo, setPeriodo] = useState<Quincena>(() => quincenaDeFecha(new Date()));
  const { data, isLoading } = useNovedades(periodoActivo ? periodo : undefined);

  const [tipoSel, setTipoSel] = useState<string[]>([]);
  const [operarioSel, setOperarioSel] = useState<string[]>([]);
  const [estadoSel, setEstadoSel] = useState<string[]>([]);
  // Vigencia (activa/anulada) — eje distinto de `estadoSel` (resolución de
  // HyS). Sin default: se ven todas (activas y anuladas) hasta que el
  // usuario filtre a propósito (2026-08-19, pedido explícito — a diferencia
  // de combustible, acá no querían que las anuladas quedaran ocultas).
  const [estadoActivoSel, setEstadoActivoSel] = useState<string[]>([]);

  // JefeCuadrilla solo ve lo que él mismo cargó (el backend ya lo scopea);
  // se lo aclaramos acá para que no piense que falta algo.
  const esJefeCuadrilla = perfil?.rol.nombre === 'JefeCuadrilla';
  const puedeCargar = perfil ? ROLES_QUE_CARGAN.includes(perfil.rol.nombre) : false;

  const filtradas = useMemo(() => {
    return (data ?? []).filter(
      (n) =>
        pasaMulti(String(n.tipoNovedadId), tipoSel) &&
        pasaMulti(n.operarioCuil, operarioSel) &&
        pasaMulti(n.estadoHys, estadoSel) &&
        pasaMulti(n.estado, estadoActivoSel),
    );
  }, [data, tipoSel, operarioSel, estadoSel, estadoActivoSel]);

  // Opciones facetadas: cada MultiFiltro se acota con los DEMÁS filtros
  // aplicados (excluyendo el propio) sobre lo que ya trajo el período.
  const opcionesTipo = useMemo(() => {
    const candidatas = (data ?? []).filter(
      (n) =>
        pasaMulti(n.operarioCuil, operarioSel) &&
        pasaMulti(n.estadoHys, estadoSel) &&
        pasaMulti(n.estado, estadoActivoSel),
    );
    const labelPorId = new Map((data ?? []).map((n) => [String(n.tipoNovedadId), n.tipoNovedad.nombre]));
    return opcionesFacetadas(candidatas, (n) => String(n.tipoNovedadId), tipoSel, {
      labelDe: (id) => labelPorId.get(id) ?? id,
    });
  }, [data, tipoSel, operarioSel, estadoSel, estadoActivoSel]);

  const opcionesOperario = useMemo(() => {
    const candidatas = (data ?? []).filter(
      (n) =>
        pasaMulti(String(n.tipoNovedadId), tipoSel) &&
        pasaMulti(n.estadoHys, estadoSel) &&
        pasaMulti(n.estado, estadoActivoSel),
    );
    const labelPorCuil = new Map((data ?? []).map((n) => [n.operarioCuil, n.operario.apellido_nombre]));
    return opcionesFacetadas(candidatas, (n) => n.operarioCuil, operarioSel, {
      labelDe: (cuil) => labelPorCuil.get(cuil) ?? cuil,
    });
  }, [data, tipoSel, operarioSel, estadoSel, estadoActivoSel]);

  const opcionesEstado = useMemo(() => {
    const candidatas = (data ?? []).filter(
      (n) =>
        pasaMulti(String(n.tipoNovedadId), tipoSel) &&
        pasaMulti(n.operarioCuil, operarioSel) &&
        pasaMulti(n.estado, estadoActivoSel),
    );
    return opcionesFacetadas(candidatas, (n) => n.estadoHys, estadoSel, {
      labelDe: (v) => ESTADO_LABEL[v as EstadoHys] ?? v,
    });
  }, [data, tipoSel, operarioSel, estadoSel, estadoActivoSel]);

  const opcionesEstadoActivo = useMemo(() => {
    const candidatas = (data ?? []).filter(
      (n) =>
        pasaMulti(String(n.tipoNovedadId), tipoSel) &&
        pasaMulti(n.operarioCuil, operarioSel) &&
        pasaMulti(n.estadoHys, estadoSel),
    );
    return opcionesFacetadas(candidatas, (n) => n.estado, estadoActivoSel, {
      labelDe: (v) => VIGENCIA_LABEL[v as EstadoNovedad] ?? v,
    });
  }, [data, tipoSel, operarioSel, estadoSel, estadoActivoSel]);

  const hayFiltros =
    periodoActivo ||
    tipoSel.length > 0 ||
    operarioSel.length > 0 ||
    estadoSel.length > 0 ||
    estadoActivoSel.length > 0;

  function limpiarFiltros() {
    setPeriodoActivo(false);
    setTipoSel([]);
    setOperarioSel([]);
    setEstadoSel([]);
    setEstadoActivoSel([]);
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
        <MultiFiltro
          label="Vigencia"
          ariaLabel="Filtrar por vigencia"
          opciones={opcionesEstadoActivo}
          seleccionados={estadoActivoSel}
          onChange={setEstadoActivoSel}
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
                  <th className="px-4 py-2.5 font-medium">Justificación</th>
                  <th className="px-4 py-2.5 font-medium">Estado HyS</th>
                  {mostrarColumnaAcciones && <th className="px-4 py-2.5 font-medium">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((n: Novedad) => {
                  const anulada = n.estado === 'anulada';
                  return (
                    <tr
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetalle(n)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetalle(n);
                        }
                      }}
                      className={`cursor-pointer border-b border-line text-ink transition last:border-0 hover:bg-accent/30 ${anulada ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-2.5 font-medium">
                        <span className="flex items-center gap-2">
                          {n.operario.apellido_nombre}
                          {anulada && <StatusBadge estado="anulada" />}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs font-medium text-ink ring-1 ring-inset ring-line">
                          {n.tipoNovedad.nombre}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-slate">{n.fechaInicio.slice(0, 10)}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate">{n.fechaFin ? n.fechaFin.slice(0, 10) : '—'}</td>
                      <td className="max-w-[220px] truncate px-4 py-2.5 text-slate" title={n.justificacionTexto ?? undefined}>
                        {n.justificacionTexto ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge estado={n.estadoHys} />
                      </td>
                      {mostrarColumnaAcciones && (
                        <td className="px-4 py-2.5">
                          {!anulada && puedeEditar(n, perfil) && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditando(n);
                                }}
                                className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-accent/60"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAnulando(n);
                                }}
                                className="rounded-md border border-danger px-2.5 py-1 text-xs font-medium text-danger transition hover:bg-danger/10"
                              >
                                Anular
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detalle && (
        <DetalleNovedadDialog
          novedad={detalle}
          onClose={() => setDetalle(null)}
          puedeActuar={puedeEditar(detalle, perfil)}
          onEditar={() => {
            setDetalle(null);
            setEditando(detalle);
          }}
          onAnular={() => {
            setDetalle(null);
            setAnulando(detalle);
          }}
        />
      )}

      {editando && (
        <EditarNovedadDialog
          novedad={editando}
          onCancel={() => setEditando(null)}
          onGuardar={guardarEdicion}
          guardando={actualizar.isPending}
        />
      )}

      {anulando && (
        <AnularNovedadDialog
          onCancel={() => setAnulando(null)}
          onConfirmar={confirmarAnulacion}
          anulando={anular.isPending}
        />
      )}
    </section>
  );
}
