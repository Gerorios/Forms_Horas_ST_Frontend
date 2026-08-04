'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { BarraFiltros, FiltroBusqueda, FiltroChecks } from '@/components/ui/barra-filtros';
import {
  useDetalleQuincena,
  useMontosMensualizados,
  useCargarMontosMensualizados,
  useKmPorTantos,
  useCargarKmPorTantos,
  type FilaDetalleEmpleado,
} from '@/lib/api/liquidacion';
import { FilaEmpleado, REGIMEN_LABEL } from '@/features/liquidacion/fila-empleado';

function nombreQuincena(quincena: number, mes: number, anio: number) {
  const nombreMes = new Date(2000, mes - 1, 1).toLocaleDateString('es-AR', { month: 'long' });
  return `Quincena ${quincena === 1 ? '1ra' : '2da'} de ${nombreMes} ${anio}`;
}

function normalizar(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function pasaNombre(nombre: string, filtro: string) {
  return filtro === '' || normalizar(nombre).includes(normalizar(filtro));
}

function pasaRegimen(fila: FilaDetalleEmpleado, seleccionados: string[]) {
  return seleccionados.length === 0 || seleccionados.includes(fila.regimen);
}

function pasaCategoria(fila: FilaDetalleEmpleado, seleccionados: string[]) {
  return seleccionados.length === 0 || (fila.categoria != null && seleccionados.includes(fila.categoria));
}

function pasaContrato(dias: { contratoCodigo: string }[], seleccionados: string[]) {
  return seleccionados.length === 0 || dias.some((d) => seleccionados.includes(d.contratoCodigo));
}

type OpcionFacet = { value: string; label: string; count: number };

/** Opciones facetadas: cuentan cuántas filas (de las que ya pasan los DEMÁS
 * filtros) tienen cada valor, y siempre incluyen los valores ya
 * seleccionados aunque hayan quedado en 0 — así se pueden destildar. */
function opcionesFacetUnicas(
  filas: FilaDetalleEmpleado[],
  extraer: (f: FilaDetalleEmpleado) => string | null,
  seleccionados: string[],
  labelDe: (v: string) => string,
): OpcionFacet[] {
  const counts = new Map<string, number>();
  for (const f of filas) {
    const v = extraer(f);
    if (v == null) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  for (const s of seleccionados) if (!counts.has(s)) counts.set(s, 0);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: labelDe(value), count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function opcionesFacetContrato(filas: FilaDetalleEmpleado[], seleccionados: string[]): OpcionFacet[] {
  const counts = new Map<string, number>();
  for (const f of filas) {
    for (const codigo of new Set(f.dias.map((d) => d.contratoCodigo))) {
      counts.set(codigo, (counts.get(codigo) ?? 0) + 1);
    }
  }
  for (const s of seleccionados) if (!counts.has(s)) counts.set(s, 0);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function periodoEsValido(anio: number, mes: number, quincena: number) {
  return (
    Number.isInteger(anio) &&
    anio > 0 &&
    Number.isInteger(mes) &&
    mes >= 1 &&
    mes <= 12 &&
    (quincena === 1 || quincena === 2)
  );
}

export default function DetalleQuincenaPage() {
  const searchParams = useSearchParams();
  const anio = Number(searchParams.get('anio'));
  const mes = Number(searchParams.get('mes'));
  const quincena = Number(searchParams.get('q')) as 1 | 2;
  const periodoValido = periodoEsValido(anio, mes, quincena);

  const { data, isLoading } = useDetalleQuincena(anio, mes, quincena, periodoValido);
  const { data: montosMensualizados } = useMontosMensualizados(anio, mes, quincena);
  const cargarMontos = useCargarMontosMensualizados();
  const { data: kmsPorTantos } = useKmPorTantos(anio, mes, quincena);
  const cargarKms = useCargarKmPorTantos();

  const [montoEdits, setMontoEdits] = useState<Record<string, string>>({});
  const [kmEdits, setKmEdits] = useState<Record<string, string>>({});

  const [filtroNombre, setFiltroNombre] = useState('');
  const [regimenSel, setRegimenSel] = useState<string[]>([]);
  const [categoriaSel, setCategoriaSel] = useState<string[]>([]);
  const [contratoSel, setContratoSel] = useState<string[]>([]);

  const filas = useMemo(
    () => [...(data?.filas ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [data?.filas],
  );
  const sinPerfil = useMemo(
    () => [...(data?.sinPerfil ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [data?.sinPerfil],
  );

  const opcionesRegimen = useMemo(
    () =>
      opcionesFacetUnicas(
        filas.filter((f) => pasaNombre(f.nombre, filtroNombre) && pasaCategoria(f, categoriaSel) && pasaContrato(f.dias, contratoSel)),
        (f) => f.regimen,
        regimenSel,
        (v) => REGIMEN_LABEL[v as keyof typeof REGIMEN_LABEL] ?? v,
      ),
    [filas, filtroNombre, categoriaSel, contratoSel, regimenSel],
  );

  const opcionesCategoria = useMemo(
    () =>
      opcionesFacetUnicas(
        filas.filter((f) => pasaNombre(f.nombre, filtroNombre) && pasaRegimen(f, regimenSel) && pasaContrato(f.dias, contratoSel)),
        (f) => f.categoria,
        categoriaSel,
        (v) => v,
      ),
    [filas, filtroNombre, regimenSel, contratoSel, categoriaSel],
  );

  const opcionesContrato = useMemo(
    () =>
      opcionesFacetContrato(
        filas.filter((f) => pasaNombre(f.nombre, filtroNombre) && pasaRegimen(f, regimenSel) && pasaCategoria(f, categoriaSel)),
        contratoSel,
      ),
    [filas, filtroNombre, regimenSel, categoriaSel, contratoSel],
  );

  const filasVisibles = filas.filter(
    (f) =>
      pasaNombre(f.nombre, filtroNombre) &&
      pasaRegimen(f, regimenSel) &&
      pasaCategoria(f, categoriaSel) &&
      pasaContrato(f.dias, contratoSel),
  );
  // Las filas sin perfil no tienen contrato/régimen/categoría asignados, así
  // que esos filtros no les aplican: quedan siempre visibles (solo la
  // búsqueda por nombre las filtra) y se atenúan cuando hay un filtro de
  // contrato activo, para no desaparecer en silencio.
  const sinPerfilVisibles = sinPerfil.filter((e) => pasaNombre(e.nombre, filtroNombre));

  const hayFiltros = filtroNombre !== '' || regimenSel.length > 0 || categoriaSel.length > 0 || contratoSel.length > 0;
  function limpiarFiltros() {
    setFiltroNombre('');
    setRegimenSel([]);
    setCategoriaSel([]);
    setContratoSel([]);
  }

  // Los edits se resincronizan solo cuando cambia la quincena elegida, no en
  // cada refetch de la misma quincena (evita pisar lo que se está tipeando).
  const clavePeriodo = `${anio}-${mes}-${quincena}`;
  const montosSyncKey = useRef('');
  useEffect(() => {
    if (!montosMensualizados || montosSyncKey.current === clavePeriodo) return;
    montosSyncKey.current = clavePeriodo;
    setMontoEdits(Object.fromEntries(montosMensualizados.map((m) => [m.cuil, m.monto ?? ''])));
  }, [montosMensualizados, clavePeriodo]);

  const kmsSyncKey = useRef('');
  useEffect(() => {
    if (!kmsPorTantos || kmsSyncKey.current === clavePeriodo) return;
    kmsSyncKey.current = clavePeriodo;
    setKmEdits(Object.fromEntries(kmsPorTantos.map((k) => [k.cuil, k.kmTotal ?? ''])));
  }, [kmsPorTantos, clavePeriodo]);

  function guardarMonto(cuil: string) {
    const v = montoEdits[cuil];
    if (v === undefined || v === '') return;
    toast.promise(cargarMontos.mutateAsync({ anio, mes, quincena, montos: [{ cuil, monto: Number(v) }] }), {
      loading: 'Guardando monto…',
      success: 'Monto guardado',
      error: 'No se pudo guardar',
    });
  }

  function guardarKm(cuil: string) {
    const v = kmEdits[cuil];
    if (v === undefined || v === '') return;
    toast.promise(cargarKms.mutateAsync({ anio, mes, quincena, kms: [{ cuil, kmTotal: Number(v) }] }), {
      loading: 'Guardando km…',
      success: 'Km guardado',
      error: 'No se pudo guardar',
    });
  }

  if (!periodoValido) {
    return (
      <section className="space-y-5">
        <PageHeader eyebrow="Liquidador" title="Período inválido" />
        <p className="text-slate">
          Período inválido —{' '}
          <Link href="/liquidacion/quincena" className="underline">
            volvé al panel de quincenas
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Liquidador" title={nombreQuincena(quincena, mes, anio)} />

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <>
          <BarraFiltros hayFiltros={hayFiltros} onLimpiar={limpiarFiltros}>
            <FiltroBusqueda
              label="Empleado"
              ariaLabel="Filtrar por empleado"
              value={filtroNombre}
              onChange={setFiltroNombre}
              placeholder="Buscar por nombre…"
            />
            <FiltroChecks
              label="Régimen"
              ariaLabel="Filtrar por régimen"
              opciones={opcionesRegimen}
              seleccionados={regimenSel}
              onChange={setRegimenSel}
            />
            <FiltroChecks
              label="Categoría"
              ariaLabel="Filtrar por categoría"
              opciones={opcionesCategoria}
              seleccionados={categoriaSel}
              onChange={setCategoriaSel}
            />
            <FiltroChecks
              label="Contrato"
              ariaLabel="Filtrar por contrato"
              opciones={opcionesContrato}
              seleccionados={contratoSel}
              onChange={setContratoSel}
            />
          </BarraFiltros>

          <p className="text-xs text-slate">
            Mostrando {filasVisibles.length + sinPerfilVisibles.length} de {filas.length + sinPerfil.length} empleados
          </p>

          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-3 py-2.5 font-medium">Empleado</th>
                  <th className="px-3 py-2.5 font-medium">Régimen</th>
                  <th className="px-3 py-2.5 font-medium">Categoría</th>
                  <th className="px-3 py-2.5 font-medium">Hs</th>
                  <th className="px-3 py-2.5 font-medium">Básico</th>
                  <th className="px-3 py-2.5 font-medium">Extras</th>
                  <th className="px-3 py-2.5 font-medium">Presentismo</th>
                  <th className="px-3 py-2.5 font-medium">Plus</th>
                  <th className="px-3 py-2.5 font-medium">Bono</th>
                  <th className="px-3 py-2.5 font-medium">TOTAL</th>
                  <th className="px-3 py-2.5 font-medium">Alertas</th>
                  <th className="px-3 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filasVisibles.map((f) => (
                  <FilaEmpleado
                    key={f.cuil}
                    fila={f}
                    montoEdit={montoEdits[f.cuil] ?? ''}
                    onMontoEditChange={(v) => setMontoEdits((prev) => ({ ...prev, [f.cuil]: v }))}
                    onGuardarMonto={() => guardarMonto(f.cuil)}
                    guardandoMonto={cargarMontos.isPending}
                    kmEdit={kmEdits[f.cuil] ?? ''}
                    onKmEditChange={(v) => setKmEdits((prev) => ({ ...prev, [f.cuil]: v }))}
                    onGuardarKm={() => guardarKm(f.cuil)}
                    guardandoKm={cargarKms.isPending}
                    contratosDestacados={contratoSel}
                  />
                ))}
                {sinPerfilVisibles.map((e) => (
                  <tr
                    key={e.cuil}
                    className="border-b border-line bg-sand/60 text-slate last:border-0"
                    style={contratoSel.length > 0 ? { opacity: 0.5 } : undefined}
                    title={contratoSel.length > 0 ? 'Sin datos de contrato para filtrar' : undefined}
                  >
                    <td className="px-3 py-2.5">{e.nombre}</td>
                    <td className="px-3 py-2.5" colSpan={7}>
                      {e.motivo === 'sin_perfil' ? 'Sin perfil de liquidación asignado' : 'Perfil incompleto'} —{' '}
                      {e.horasAprobadas}hs aprobadas
                    </td>
                    <td className="px-3 py-2.5" colSpan={4}>
                      <Link href="/liquidacion/perfiles" className="underline">
                        Ir a Perfiles de empleados →
                      </Link>
                    </td>
                  </tr>
                ))}
                {filasVisibles.length === 0 && sinPerfilVisibles.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-3 py-3 text-sm text-slate">
                      {filas.length === 0 && sinPerfil.length === 0
                        ? 'Sin empleados en esta quincena.'
                        : 'Ningún empleado coincide con los filtros aplicados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
