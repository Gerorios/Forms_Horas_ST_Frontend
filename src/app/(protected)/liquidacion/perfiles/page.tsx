'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { BarraFiltros, MultiFiltro } from '@/components/ui/barra-filtros';
import { opcionesFacetadas } from '@/lib/facetado';
import { useEmpleadosActivos } from '@/lib/api/empleados';
import {
  useCategoriasUocra,
  usePerfilesLiquidacion,
  useUpsertPerfilesMasivo,
  useEliminarPerfilLiquidacion,
  mensajeDeError,
  type RegimenLiquidacion,
  type ModalidadPago,
  type PerfilLiquidacion,
} from '@/lib/api/liquidacion';

const REGIMEN_LABEL: Record<RegimenLiquidacion, string> = {
  jornalizado: 'Jornalizado (por horas)',
  fijo: 'Fijo (88hs por quincena)',
  mensualizado: 'Mensualizado (monto fijo por quincena)',
  por_tantos: 'Por tantos (por cantidad)',
  administrativo: 'Administrativo (se liquida por otro circuito)',
};

const MODALIDAD_PAGO_LABEL: Record<ModalidadPago, string> = {
  en_b: 'En B (sin descuentos)',
  con_descuentos: 'Con descuentos (sueldo formal)',
};

const POR_PAGINA = 20;

function valorRegimenDe(perfil: PerfilLiquidacion | undefined) {
  return perfil ? perfil.regimen : 'sin_perfil';
}

function valorCategoriaDe(perfil: PerfilLiquidacion | undefined) {
  return perfil?.categoriaUocraId ? String(perfil.categoriaUocraId) : 'sin_categoria';
}

function valorModalidadDe(perfil: PerfilLiquidacion | undefined) {
  return perfil?.modalidadPago ?? 'sin_modalidad';
}

function pasaMulti(valor: string, seleccionados: string[]) {
  return seleccionados.length === 0 || seleccionados.includes(valor);
}

export default function PerfilesLiquidacionPage() {
  const { data: empleados, isLoading: cargandoEmpleados } = useEmpleadosActivos();
  const { data: perfiles, isLoading: cargandoPerfiles } = usePerfilesLiquidacion();
  const { data: categorias } = useCategoriasUocra();
  const upsertMasivo = useUpsertPerfilesMasivo();
  const eliminar = useEliminarPerfilLiquidacion();

  const [empleadoSel, setEmpleadoSel] = useState<string[]>([]);
  const [filtroRegimenSel, setFiltroRegimenSel] = useState<string[]>([]);
  const [filtroCategoriaSel, setFiltroCategoriaSel] = useState<string[]>([]);
  const [filtroModalidadSel, setFiltroModalidadSel] = useState<string[]>([]);
  const [pagina, setPagina] = useState(1);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [regimen, setRegimen] = useState<RegimenLiquidacion | ''>('');
  const [categoriaUocraId, setCategoriaUocraId] = useState<number | null>(null);
  const [modalidadPago, setModalidadPago] = useState<ModalidadPago | ''>('');

  const esAdministrativo = regimen === 'administrativo';

  const perfilPorCuil = useMemo(() => {
    return new Map((perfiles ?? []).map((p) => [p.cuil, p]));
  }, [perfiles]);

  const filtrados = useMemo(() => {
    return (empleados ?? []).filter((e) => {
      const perfil = perfilPorCuil.get(e.cuil);
      return (
        pasaMulti(e.cuil, empleadoSel) &&
        pasaMulti(valorRegimenDe(perfil), filtroRegimenSel) &&
        pasaMulti(valorCategoriaDe(perfil), filtroCategoriaSel) &&
        pasaMulti(valorModalidadDe(perfil), filtroModalidadSel)
      );
    });
  }, [empleados, perfilPorCuil, empleadoSel, filtroRegimenSel, filtroCategoriaSel, filtroModalidadSel]);

  // Opciones facetadas: cada MultiFiltro se acota con los DEMÁS filtros
  // aplicados (excluyendo el propio), con el catálogo completo como base para
  // que las opciones en 0 (ej. "Sin categoría" si todos tienen una asignada)
  // sigan apareciendo tildables.
  const opcionesEmpleado = useMemo(() => {
    const candidatos = (empleados ?? []).filter((e) => {
      const perfil = perfilPorCuil.get(e.cuil);
      return (
        pasaMulti(valorRegimenDe(perfil), filtroRegimenSel) &&
        pasaMulti(valorCategoriaDe(perfil), filtroCategoriaSel) &&
        pasaMulti(valorModalidadDe(perfil), filtroModalidadSel)
      );
    });
    return opcionesFacetadas(candidatos, (e) => e.cuil, empleadoSel, {
      labelDe: (cuil) => (empleados ?? []).find((e) => e.cuil === cuil)?.apellido_nombre ?? cuil,
    });
  }, [empleados, perfilPorCuil, filtroRegimenSel, filtroCategoriaSel, filtroModalidadSel, empleadoSel]);

  const opcionesRegimen = useMemo(() => {
    const candidatos = (empleados ?? []).filter((e) => {
      const perfil = perfilPorCuil.get(e.cuil);
      return (
        pasaMulti(e.cuil, empleadoSel) &&
        pasaMulti(valorCategoriaDe(perfil), filtroCategoriaSel) &&
        pasaMulti(valorModalidadDe(perfil), filtroModalidadSel)
      );
    });
    const counts = opcionesFacetadas(candidatos, (e) => valorRegimenDe(perfilPorCuil.get(e.cuil)), filtroRegimenSel);
    const countPorValor = new Map(counts.map((o) => [o.value, o.count]));
    return [
      { value: 'sin_perfil', label: 'Sin perfil asignado', count: countPorValor.get('sin_perfil') ?? 0 },
      ...(Object.keys(REGIMEN_LABEL) as RegimenLiquidacion[]).map((r) => ({
        value: r,
        label: REGIMEN_LABEL[r],
        count: countPorValor.get(r) ?? 0,
      })),
    ];
  }, [empleados, perfilPorCuil, empleadoSel, filtroCategoriaSel, filtroModalidadSel, filtroRegimenSel]);

  const opcionesCategoria = useMemo(() => {
    const candidatos = (empleados ?? []).filter((e) => {
      const perfil = perfilPorCuil.get(e.cuil);
      return (
        pasaMulti(e.cuil, empleadoSel) &&
        pasaMulti(valorRegimenDe(perfil), filtroRegimenSel) &&
        pasaMulti(valorModalidadDe(perfil), filtroModalidadSel)
      );
    });
    const counts = opcionesFacetadas(candidatos, (e) => valorCategoriaDe(perfilPorCuil.get(e.cuil)), filtroCategoriaSel);
    const countPorValor = new Map(counts.map((o) => [o.value, o.count]));
    return [
      { value: 'sin_categoria', label: 'Sin categoría', count: countPorValor.get('sin_categoria') ?? 0 },
      ...(categorias ?? []).map((c) => ({
        value: String(c.id),
        label: c.nombre,
        count: countPorValor.get(String(c.id)) ?? 0,
      })),
    ];
  }, [empleados, perfilPorCuil, empleadoSel, filtroRegimenSel, filtroModalidadSel, filtroCategoriaSel, categorias]);

  const opcionesModalidad = useMemo(() => {
    const candidatos = (empleados ?? []).filter((e) => {
      const perfil = perfilPorCuil.get(e.cuil);
      return (
        pasaMulti(e.cuil, empleadoSel) &&
        pasaMulti(valorRegimenDe(perfil), filtroRegimenSel) &&
        pasaMulti(valorCategoriaDe(perfil), filtroCategoriaSel)
      );
    });
    const counts = opcionesFacetadas(candidatos, (e) => valorModalidadDe(perfilPorCuil.get(e.cuil)), filtroModalidadSel);
    const countPorValor = new Map(counts.map((o) => [o.value, o.count]));
    return [
      { value: 'sin_modalidad', label: 'Sin modalidad', count: countPorValor.get('sin_modalidad') ?? 0 },
      ...(Object.keys(MODALIDAD_PAGO_LABEL) as ModalidadPago[]).map((m) => ({
        value: m,
        label: MODALIDAD_PAGO_LABEL[m],
        count: countPorValor.get(m) ?? 0,
      })),
    ];
  }, [empleados, perfilPorCuil, empleadoSel, filtroRegimenSel, filtroCategoriaSel, filtroModalidadSel]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const enPagina = filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  useEffect(() => {
    setPagina(1);
  }, [empleadoSel, filtroRegimenSel, filtroCategoriaSel, filtroModalidadSel]);

  function cambiarRegimen(valor: RegimenLiquidacion | '') {
    setRegimen(valor);
    if (valor === 'administrativo') {
      setCategoriaUocraId(null);
      setModalidadPago('');
    }
  }

  const isLoading = cargandoEmpleados || cargandoPerfiles;
  const puedeAsignar = seleccionados.length > 0 && regimen !== '';

  function toggleUno(cuil: string) {
    setSeleccionados((prev) => (prev.includes(cuil) ? prev.filter((c) => c !== cuil) : [...prev, cuil]));
  }

  function toggleTodosDeLaPagina() {
    const cuilsPagina = enPagina.map((e) => e.cuil);
    const todosSeleccionados = cuilsPagina.length > 0 && cuilsPagina.every((c) => seleccionados.includes(c));
    setSeleccionados((prev) =>
      todosSeleccionados
        ? prev.filter((c) => !cuilsPagina.includes(c))
        : [...new Set([...prev, ...cuilsPagina])],
    );
  }

  function asignar() {
    if (!puedeAsignar) return;
    const promesa = upsertMasivo.mutateAsync({
      cuils: seleccionados,
      regimen: regimen as RegimenLiquidacion,
      categoriaUocraId: categoriaUocraId ?? undefined,
      modalidadPago: modalidadPago || undefined,
    });
    toast.promise(promesa, {
      loading: `Asignando a ${seleccionados.length} empleado(s)…`,
      success: 'Perfiles asignados',
      error: (e) => mensajeDeError(e, 'No se pudo asignar'),
    });
    promesa.then(() => setSeleccionados([])).catch(() => {});
  }

  function quitar(cuil: string) {
    toast.promise(eliminar.mutateAsync(cuil), {
      loading: 'Quitando…',
      success: 'Perfil quitado del panel de liquidación',
      error: (e) => mensajeDeError(e, 'No se pudo quitar'),
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Perfiles de empleados" />
      <p className="text-sm text-slate">
        Solo los empleados con un perfil asignado acá aparecen en el panel de liquidación. Un
        empleado sin perfil todavía no fue revisado; uno con régimen &quot;Administrativo&quot; ya
        se revisó y se confirmó que se liquida por otro circuito. Tildá uno o varios y asigná (o
        reasigná) en conjunto.
      </p>

      <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Régimen
            <select
              aria-label="Régimen"
              value={regimen}
              onChange={(e) => cambiarRegimen(e.target.value as RegimenLiquidacion | '')}
              className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              <option value="">—</option>
              {(Object.keys(REGIMEN_LABEL) as RegimenLiquidacion[]).map((r) => (
                <option key={r} value={r}>{REGIMEN_LABEL[r]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Categoría UOCRA
            <select
              aria-label="Categoría UOCRA"
              value={categoriaUocraId ?? ''}
              disabled={esAdministrativo}
              onChange={(e) => setCategoriaUocraId(e.target.value ? Number(e.target.value) : null)}
              className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-50"
            >
              <option value="">— (no aplica)</option>
              {(categorias ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Modalidad de pago
            <select
              aria-label="Modalidad de pago"
              value={modalidadPago}
              disabled={esAdministrativo}
              onChange={(e) => setModalidadPago(e.target.value as ModalidadPago | '')}
              className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-50"
            >
              <option value="">— (no aplica)</option>
              {(Object.keys(MODALIDAD_PAGO_LABEL) as ModalidadPago[]).map((m) => (
                <option key={m} value={m}>{MODALIDAD_PAGO_LABEL[m]}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={!puedeAsignar || upsertMasivo.isPending}
          onClick={asignar}
          className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
        >
          Asignar a {seleccionados.length || ''} seleccionado{seleccionados.length === 1 ? '' : 's'}
        </button>
      </div>

      <BarraFiltros
        hayFiltros={
          empleadoSel.length > 0 ||
          filtroRegimenSel.length > 0 ||
          filtroCategoriaSel.length > 0 ||
          filtroModalidadSel.length > 0
        }
        onLimpiar={() => {
          setEmpleadoSel([]);
          setFiltroRegimenSel([]);
          setFiltroCategoriaSel([]);
          setFiltroModalidadSel([]);
        }}
      >
        <MultiFiltro
          label="Empleado"
          ariaLabel="Buscar empleado"
          opciones={opcionesEmpleado}
          seleccionados={empleadoSel}
          onChange={setEmpleadoSel}
        />
        <MultiFiltro
          label="Régimen"
          ariaLabel="Filtrar por régimen"
          opciones={opcionesRegimen}
          seleccionados={filtroRegimenSel}
          onChange={setFiltroRegimenSel}
        />
        <MultiFiltro
          label="Categoría"
          ariaLabel="Filtrar por categoría"
          opciones={opcionesCategoria}
          seleccionados={filtroCategoriaSel}
          onChange={setFiltroCategoriaSel}
        />
        <MultiFiltro
          label="Modalidad de pago"
          ariaLabel="Filtrar por modalidad de pago"
          opciones={opcionesModalidad}
          seleccionados={filtroModalidadSel}
          onChange={setFiltroModalidadSel}
        />
      </BarraFiltros>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="w-10 px-4 py-2.5">
                    <input
                      aria-label="Seleccionar todos"
                      type="checkbox"
                      checked={enPagina.length > 0 && enPagina.every((e) => seleccionados.includes(e.cuil))}
                      onChange={toggleTodosDeLaPagina}
                    />
                  </th>
                  <th className="px-4 py-2.5 font-medium">Empleado</th>
                  <th className="px-4 py-2.5 font-medium">Régimen</th>
                  <th className="px-4 py-2.5 font-medium">Categoría</th>
                  <th className="px-4 py-2.5 font-medium">Modalidad de pago</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {enPagina.map((e) => {
                  const perfil = perfilPorCuil.get(e.cuil);
                  return (
                    <tr key={e.cuil} className="border-b border-line text-ink last:border-0">
                      <td className="px-4 py-2.5">
                        <input
                          aria-label={`Seleccionar ${e.apellido_nombre}`}
                          type="checkbox"
                          checked={seleccionados.includes(e.cuil)}
                          onChange={() => toggleUno(e.cuil)}
                        />
                      </td>
                      <td className="px-4 py-2.5">{e.apellido_nombre}</td>
                      <td className="px-4 py-2.5">{perfil ? REGIMEN_LABEL[perfil.regimen] : '—'}</td>
                      <td className="px-4 py-2.5">{perfil?.categoria?.nombre ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        {perfil?.modalidadPago ? MODALIDAD_PAGO_LABEL[perfil.modalidadPago] : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {perfil && (
                          <button
                            type="button"
                            onClick={() => quitar(e.cuil)}
                            className="rounded-md px-2 py-1 text-xs text-danger transition hover:bg-danger/10"
                          >
                            Quitar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {enPagina.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-sm text-slate">Sin empleados que coincidan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate">
            <span>
              Página {paginaSegura} de {totalPaginas} — {filtrados.length} empleado{filtrados.length === 1 ? '' : 's'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={paginaSegura <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="rounded-md border border-line px-3 py-1.5 font-medium text-ink transition hover:bg-accent/50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={paginaSegura >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="rounded-md border border-line px-3 py-1.5 font-medium text-ink transition hover:bg-accent/50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
