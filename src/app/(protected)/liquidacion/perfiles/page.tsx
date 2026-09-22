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
  useUpsertPerfilLiquidacion,
  useEliminarPerfilLiquidacion,
  useContratosLiquidacion,
  mensajeDeError,
  type RegimenLiquidacion,
  type PerfilLiquidacion,
  type ContratoLiquidacion,
} from '@/lib/api/liquidacion';
import { Button } from '@/components/button';

const REGIMEN_LABEL: Record<RegimenLiquidacion, string> = {
  jornalizado: 'Jornalizado (por horas)',
  fijo: 'Fijo (88hs + horas extra pactadas)',
  mensualizado: 'Mensualizado (monto fijo por quincena)',
  por_tantos: 'Por tantos (por cantidad)',
  administrativo: 'Administrativo (se liquida por otro circuito)',
};

const POR_PAGINA = 20;

/** Regímenes que admiten contratos de imputación para el corte por contrato
 * del Análisis (plan 2026-08-12, addendum): sin horas reales que prorratear,
 * el costo se reparte en partes iguales entre los contratos asignados. */
const REGIMENES_CON_IMPUTACION: RegimenLiquidacion[] = ['mensualizado', 'fijo', 'por_tantos'];

/** Selector múltiple de contratos de imputación de UNA fila. Guarda con el
 * upsert individual (el masivo NO toca imputación), re-mandando el resto del
 * perfil tal cual está para no pisarlo. */
function ContratosImputacionCell({
  perfil,
  nombre,
  contratos,
}: {
  perfil: PerfilLiquidacion;
  nombre: string;
  contratos: ContratoLiquidacion[];
}) {
  const upsert = useUpsertPerfilLiquidacion();
  const guardados = (perfil.contratosImputacionIds ?? []).map(String);
  const [ids, setIds] = useState<string[]>(guardados);
  const dirty = [...guardados].sort().join(',') !== [...ids].sort().join(',');

  function guardar() {
    toast.promise(
      upsert.mutateAsync({
        cuil: perfil.cuil,
        regimen: perfil.regimen,
        categoriaUocraId: perfil.categoriaUocraId ?? undefined,
        // Se re-mandan aunque no se editen: el backend hace `?? null` / `?? false`,
        // así que omitirlos acá borraría las horas pactadas y apagaría el flag
        // de horas extra sin que nadie lo pidiera.
        horasExtraPactadas:
          perfil.horasExtraPactadas != null ? Number(perfil.horasExtraPactadas) : undefined,
        permiteHorasExtra: perfil.permiteHorasExtra,
        zonaOverride: perfil.zonaOverride,
        contratosImputacionIds: ids.map(Number),
      }),
      {
        loading: 'Guardando contratos…',
        success: 'Contratos de imputación guardados',
        error: (e) => mensajeDeError(e, 'No se pudieron guardar los contratos'),
      },
    );
  }

  return (
    <div className="flex items-end gap-2">
      <MultiFiltro
        label="Contratos"
        ariaLabel={`Contratos de imputación de ${nombre}`}
        opciones={contratos.map((c) => ({ value: String(c.id), label: `${c.codigo} — ${c.nombre}` }))}
        seleccionados={ids}
        onChange={setIds}
      />
      {dirty && (
        <Button
          variant="primary"
          size="xs"
          aria-label={`Guardar contratos de ${nombre}`}
          disabled={upsert.isPending}
          onClick={guardar}
        >
          Guardar
        </Button>
      )}
    </div>
  );
}

function valorRegimenDe(perfil: PerfilLiquidacion | undefined) {
  return perfil ? perfil.regimen : 'sin_perfil';
}

function valorCategoriaDe(perfil: PerfilLiquidacion | undefined) {
  return perfil?.categoriaUocraId ? String(perfil.categoriaUocraId) : 'sin_categoria';
}

/** Formatea las horas pactadas al estilo local: 17.50 -> "17,5", 12.00 -> "12". */
function formatearHoras(valor: string) {
  return String(Number(valor)).replace('.', ',');
}

/** Solo "mensualizado" puede tener permiteHorasExtra — ver ADR-017.
 * Un "fijo" muestra sus horas pactadas acá mismo (no hay columna propia):
 * "Fijo (88 + 12)", o el aviso si nadie las cargó todavía. Ver ADR-023. */
function etiquetaRegimenDe(perfil: PerfilLiquidacion | undefined) {
  if (!perfil) return '—';
  if (perfil.regimen === 'fijo') {
    return perfil.horasExtraPactadas == null
      ? 'Fijo (faltan las horas pactadas)'
      : `Fijo (88 + ${formatearHoras(perfil.horasExtraPactadas)})`;
  }
  const base = REGIMEN_LABEL[perfil.regimen];
  return perfil.regimen === 'mensualizado' && perfil.permiteHorasExtra ? `${base} + horas extra` : base;
}

function pasaMulti(valor: string, seleccionados: string[]) {
  return seleccionados.length === 0 || seleccionados.includes(valor);
}

export default function PerfilesLiquidacionPage() {
  const { data: empleados, isLoading: cargandoEmpleados } = useEmpleadosActivos();
  const { data: perfiles, isLoading: cargandoPerfiles } = usePerfilesLiquidacion();
  const { data: categorias } = useCategoriasUocra();
  const { data: contratosLiquidacion } = useContratosLiquidacion();
  const upsertMasivo = useUpsertPerfilesMasivo();
  const eliminar = useEliminarPerfilLiquidacion();

  const [empleadoSel, setEmpleadoSel] = useState<string[]>([]);
  const [filtroRegimenSel, setFiltroRegimenSel] = useState<string[]>([]);
  const [filtroCategoriaSel, setFiltroCategoriaSel] = useState<string[]>([]);
  const [pagina, setPagina] = useState(1);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [regimen, setRegimen] = useState<RegimenLiquidacion | ''>('');
  const [categoriaUocraId, setCategoriaUocraId] = useState<number | null>(null);
  const [horasExtraPactadas, setHorasExtraPactadas] = useState('');
  const [zonaOverride, setZonaOverride] = useState<'' | 'norte' | 'sur'>('');
  const [permiteHorasExtra, setPermiteHorasExtra] = useState(false);

  const esAdministrativo = regimen === 'administrativo';
  const esMensualizado = regimen === 'mensualizado';
  const esFijo = regimen === 'fijo';

  const perfilPorCuil = useMemo(() => {
    return new Map((perfiles ?? []).map((p) => [p.cuil, p]));
  }, [perfiles]);

  const filtrados = useMemo(() => {
    return (empleados ?? []).filter((e) => {
      const perfil = perfilPorCuil.get(e.cuil);
      return (
        pasaMulti(e.cuil, empleadoSel) &&
        pasaMulti(valorRegimenDe(perfil), filtroRegimenSel) &&
        pasaMulti(valorCategoriaDe(perfil), filtroCategoriaSel)
      );
    });
  }, [empleados, perfilPorCuil, empleadoSel, filtroRegimenSel, filtroCategoriaSel]);

  // Opciones facetadas: cada MultiFiltro se acota con los DEMÁS filtros
  // aplicados (excluyendo el propio), con el catálogo completo como base para
  // que las opciones en 0 (ej. "Sin categoría" si todos tienen una asignada)
  // sigan apareciendo tildables.
  const opcionesEmpleado = useMemo(() => {
    const candidatos = (empleados ?? []).filter((e) => {
      const perfil = perfilPorCuil.get(e.cuil);
      return (
        pasaMulti(valorRegimenDe(perfil), filtroRegimenSel) &&
        pasaMulti(valorCategoriaDe(perfil), filtroCategoriaSel)
      );
    });
    return opcionesFacetadas(candidatos, (e) => e.cuil, empleadoSel, {
      labelDe: (cuil) => (empleados ?? []).find((e) => e.cuil === cuil)?.apellido_nombre ?? cuil,
    });
  }, [empleados, perfilPorCuil, filtroRegimenSel, filtroCategoriaSel, empleadoSel]);

  const opcionesRegimen = useMemo(() => {
    const candidatos = (empleados ?? []).filter((e) => {
      const perfil = perfilPorCuil.get(e.cuil);
      return (
        pasaMulti(e.cuil, empleadoSel) &&
        pasaMulti(valorCategoriaDe(perfil), filtroCategoriaSel)
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
  }, [empleados, perfilPorCuil, empleadoSel, filtroCategoriaSel, filtroRegimenSel]);

  const opcionesCategoria = useMemo(() => {
    const candidatos = (empleados ?? []).filter((e) => {
      const perfil = perfilPorCuil.get(e.cuil);
      return (
        pasaMulti(e.cuil, empleadoSel) &&
        pasaMulti(valorRegimenDe(perfil), filtroRegimenSel)
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
  }, [empleados, perfilPorCuil, empleadoSel, filtroRegimenSel, filtroCategoriaSel, categorias]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const enPagina = filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  useEffect(() => {
    setPagina(1);
  }, [empleadoSel, filtroRegimenSel, filtroCategoriaSel]);

  function cambiarRegimen(valor: RegimenLiquidacion | '') {
    setRegimen(valor);
    if (valor === 'administrativo') {
      setCategoriaUocraId(null);
    }
    if (valor !== 'mensualizado') {
      setPermiteHorasExtra(false);
    }
    if (valor !== 'fijo') {
      setHorasExtraPactadas('');
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
      // Vacío es "no lo cargo todavía" (queda la alerta); "0" es una respuesta
      // válida y tiene que viajar como 0. Ver ADR-023.
      horasExtraPactadas:
        esFijo && horasExtraPactadas.trim() !== '' ? Number(horasExtraPactadas) : undefined,
      // Vacío = "no toco la excepción". Para QUITARLA hay que mandar null
      // explícito, y eso lo hace la opción "Por su provincia".
      zonaOverride: zonaOverride === '' ? undefined : zonaOverride,
      permiteHorasExtra: esMensualizado ? permiteHorasExtra : undefined,
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
      <PageHeader area="resultados" title="Perfiles de empleados" />
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
          {esFijo && (
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              Horas extra pactadas
              <input
                type="number"
                min="0"
                step="0.5"
                aria-label="Horas extra pactadas"
                value={horasExtraPactadas}
                onChange={(e) => setHorasExtraPactadas(e.target.value)}
                placeholder="12"
                className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
              <span className="text-xs font-normal text-slate">
                88 hs de base (CCT) + estas horas extra, siempre, sin depender de lo reportado. 0 = solo las 88.
              </span>
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Zona del Excel (excepción)
            <select
              aria-label="Zona del Excel"
              value={zonaOverride}
              onChange={(e) => setZonaOverride(e.target.value as '' | 'norte' | 'sur')}
              className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              <option value="">— (no cambiar)</option>
              <option value="norte">Forzar NORTE</option>
              <option value="sur">Forzar SUR (Tucumán)</option>
            </select>
            <span className="text-xs font-normal text-slate">
              Normalmente la hoja sale de la provincia. Esto la fuerza para quien no encaje en esa regla.
            </span>
          </label>
          {esMensualizado && (
            <label className="flex items-center gap-2 text-sm font-medium text-ink sm:col-span-3">
              <input
                type="checkbox"
                checked={permiteHorasExtra}
                onChange={(e) => setPermiteHorasExtra(e.target.checked)}
              />
              Permite horas extra (además del monto fijo, cobra lo declarado como excedente × 1.5 — necesita categoría UOCRA — ver ADR-017)
            </label>
          )}
        </div>
        <Button variant="primary" disabled={!puedeAsignar || upsertMasivo.isPending} onClick={asignar}>
          Asignar a {seleccionados.length || ''} seleccionado{seleccionados.length === 1 ? '' : 's'}
        </Button>
      </div>

      <BarraFiltros
        hayFiltros={
          empleadoSel.length > 0 ||
          filtroRegimenSel.length > 0 ||
          filtroCategoriaSel.length > 0
        }
        onLimpiar={() => {
          setEmpleadoSel([]);
          setFiltroRegimenSel([]);
          setFiltroCategoriaSel([]);
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
      </BarraFiltros>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <>
          {/* overflow-visible (no hidden): el popover del MultiFiltro de
              contratos de imputación se abre DENTRO de esta tarjeta y con
              overflow-hidden quedaba recortado por el borde. */}
          <div className="overflow-visible rounded-xl border border-line bg-surface">
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
                  <th className="px-4 py-2.5 font-medium">Contratos de imputación (análisis)</th>
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
                      <td className="px-4 py-2.5">{etiquetaRegimenDe(perfil)}</td>
                      <td className="px-4 py-2.5">{perfil?.categoria?.nombre ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        {perfil && REGIMENES_CON_IMPUTACION.includes(perfil.regimen) ? (
                          <ContratosImputacionCell
                            key={`${e.cuil}-${(perfil.contratosImputacionIds ?? []).join('.')}`}
                            perfil={perfil}
                            nombre={e.apellido_nombre}
                            contratos={contratosLiquidacion ?? []}
                          />
                        ) : (
                          <span className="text-slate">—</span>
                        )}
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

          <p className="text-xs text-slate">
            Contratos de imputación (análisis): el costo de este empleado se imputa a estos
            contratos en partes iguales en el Análisis. Solo aplica a los regímenes mensualizado,
            fijo y por tantos.
          </p>

          <div className="flex items-center justify-between text-sm text-slate">
            <span>
              Página {paginaSegura} de {totalPaginas} — {filtrados.length} empleado{filtrados.length === 1 ? '' : 's'}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={paginaSegura <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={paginaSegura >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
