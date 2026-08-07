'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { BarraFiltros, MultiFiltro } from '@/components/ui/barra-filtros';
import { opcionesFacetadas } from '@/lib/facetado';
import {
  useDetalleQuincena,
  useMontosMensualizados,
  useCargarMontosMensualizados,
  useKmPorTantos,
  mensajeDeError,
  type FilaDetalleEmpleado,
} from '@/lib/api/liquidacion';
import { FilaEmpleado, REGIMEN_LABEL } from '@/features/liquidacion/fila-empleado';
import { TablaPorTantos } from '@/features/liquidacion/tabla-por-tantos';

function nombreQuincena(quincena: number, mes: number, anio: number) {
  const nombreMes = new Date(2000, mes - 1, 1).toLocaleDateString('es-AR', { month: 'long' });
  return `Quincena ${quincena === 1 ? '1ra' : '2da'} de ${nombreMes} ${anio}`;
}

function pasaEmpleado(cuil: string, seleccionados: string[]) {
  return seleccionados.length === 0 || seleccionados.includes(cuil);
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
  // Solo lectura: el km de "por tantos" lo carga el Jefe de Contrato
  // habilitado (o Admin) en /km-por-tantos, ver ADR-014.
  const { data: kmsPorTantos } = useKmPorTantos(anio, mes, quincena);
  const kmPorCuil = useMemo(
    () => new Map((kmsPorTantos ?? []).map((k) => [k.cuil, k.kmTotal])),
    [kmsPorTantos],
  );

  const [montoEdits, setMontoEdits] = useState<Record<string, string>>({});

  const [empleadoSel, setEmpleadoSel] = useState<string[]>([]);
  const [regimenSel, setRegimenSel] = useState<string[]>([]);
  const [categoriaSel, setCategoriaSel] = useState<string[]>([]);
  const [contratoSel, setContratoSel] = useState<string[]>([]);

  // "Por tantos" se muestra en una tabla propia (columnas y regla de extra
  // distintas — ver ADR-015), separada del resto de los regímenes.
  const filas = useMemo(
    () =>
      [...(data?.filas ?? [])]
        .filter((f) => f.regimen !== 'por_tantos')
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [data?.filas],
  );
  const filasPorTantos = useMemo(
    () =>
      [...(data?.filas ?? [])]
        .filter((f) => f.regimen === 'por_tantos')
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [data?.filas],
  );
  const sinPerfil = useMemo(
    () => [...(data?.sinPerfil ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [data?.sinPerfil],
  );

  const nombrePorCuil = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of filas) m.set(f.cuil, f.nombre);
    for (const f of filasPorTantos) m.set(f.cuil, f.nombre);
    for (const e of sinPerfil) m.set(e.cuil, e.nombre);
    return m;
  }, [filas, filasPorTantos, sinPerfil]);

  // Empleado y Categoría se comparten entre las dos tablas (ver ADR-014);
  // Régimen y Contrato solo aplican a la tabla principal (no a "por tantos").
  const opcionesEmpleado = useMemo(() => {
    // Las filas sin perfil no tienen régimen/categoría/contrato, así que esos
    // filtros no las excluyen de la lista de personas a elegir.
    const candidatos: { cuil: string }[] = [
      ...filas.filter((f) => pasaRegimen(f, regimenSel) && pasaCategoria(f, categoriaSel) && pasaContrato(f.dias, contratoSel)),
      ...filasPorTantos.filter((f) => pasaCategoria(f, categoriaSel)),
      ...sinPerfil,
    ];
    return opcionesFacetadas(candidatos, (item) => item.cuil, empleadoSel, {
      labelDe: (cuil) => nombrePorCuil.get(cuil) ?? cuil,
    });
  }, [filas, filasPorTantos, sinPerfil, regimenSel, categoriaSel, contratoSel, empleadoSel, nombrePorCuil]);

  const opcionesRegimen = useMemo(
    () =>
      opcionesFacetadas(
        filas.filter((f) => pasaEmpleado(f.cuil, empleadoSel) && pasaCategoria(f, categoriaSel) && pasaContrato(f.dias, contratoSel)),
        (f) => f.regimen,
        regimenSel,
        { labelDe: (v) => REGIMEN_LABEL[v as keyof typeof REGIMEN_LABEL] ?? v },
      ),
    [filas, empleadoSel, categoriaSel, contratoSel, regimenSel],
  );

  const opcionesCategoria = useMemo(
    () =>
      opcionesFacetadas(
        [
          ...filas.filter((f) => pasaEmpleado(f.cuil, empleadoSel) && pasaRegimen(f, regimenSel) && pasaContrato(f.dias, contratoSel)),
          ...filasPorTantos.filter((f) => pasaEmpleado(f.cuil, empleadoSel)),
        ],
        (f) => f.categoria,
        categoriaSel,
      ),
    [filas, filasPorTantos, empleadoSel, regimenSel, contratoSel, categoriaSel],
  );

  const opcionesContrato = useMemo(
    () =>
      opcionesFacetadas(
        filas.filter((f) => pasaEmpleado(f.cuil, empleadoSel) && pasaRegimen(f, regimenSel) && pasaCategoria(f, categoriaSel)),
        (f) => f.dias.map((d) => d.contratoCodigo),
        contratoSel,
      ),
    [filas, empleadoSel, regimenSel, categoriaSel, contratoSel],
  );

  const filasVisibles = filas.filter(
    (f) =>
      pasaEmpleado(f.cuil, empleadoSel) &&
      pasaRegimen(f, regimenSel) &&
      pasaCategoria(f, categoriaSel) &&
      pasaContrato(f.dias, contratoSel),
  );
  // Las filas sin perfil no tienen contrato/régimen/categoría asignados, así
  // que esos filtros no les aplican: quedan siempre visibles (solo el filtro
  // de empleado las filtra) y se atenúan cuando hay un filtro de contrato
  // activo, para no desaparecer en silencio.
  const sinPerfilVisibles = sinPerfil.filter((e) => pasaEmpleado(e.cuil, empleadoSel));
  const filasPorTantosVisibles = filasPorTantos.filter(
    (f) => pasaEmpleado(f.cuil, empleadoSel) && pasaCategoria(f, categoriaSel),
  );

  const hayFiltros = empleadoSel.length > 0 || regimenSel.length > 0 || categoriaSel.length > 0 || contratoSel.length > 0;
  function limpiarFiltros() {
    setEmpleadoSel([]);
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

  function guardarMonto(cuil: string) {
    const v = montoEdits[cuil];
    if (v === undefined || v === '') return;
    toast.promise(cargarMontos.mutateAsync({ anio, mes, quincena, montos: [{ cuil, monto: Number(v) }] }), {
      loading: 'Guardando monto…',
      success: 'Monto guardado',
      error: (e) => mensajeDeError(e, 'No se pudo guardar el monto'),
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
            <MultiFiltro
              label="Empleado"
              ariaLabel="Filtrar por empleado"
              opciones={opcionesEmpleado}
              seleccionados={empleadoSel}
              onChange={setEmpleadoSel}
            />
            <MultiFiltro
              label="Régimen"
              ariaLabel="Filtrar por régimen"
              opciones={opcionesRegimen}
              seleccionados={regimenSel}
              onChange={setRegimenSel}
            />
            <MultiFiltro
              label="Categoría"
              ariaLabel="Filtrar por categoría"
              opciones={opcionesCategoria}
              seleccionados={categoriaSel}
              onChange={setCategoriaSel}
            />
            <MultiFiltro
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
            <table className="w-full min-w-[1250px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-3 py-2.5 font-medium">Empleado</th>
                  <th className="px-3 py-2.5 font-medium">Régimen</th>
                  <th className="px-3 py-2.5 font-medium">Categoría</th>
                  <th className="px-3 py-2.5 font-medium">Hs totales</th>
                  <th className="px-3 py-2.5 font-medium">Hs CCT</th>
                  <th className="px-3 py-2.5 font-medium">Hs extra</th>
                  <th className="px-3 py-2.5 font-medium">Total bruto</th>
                  <th className="px-3 py-2.5 font-medium">$$ Hs Extras</th>
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
                    <td className="px-3 py-2.5" colSpan={9}>
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
                    <td colSpan={14} className="px-3 py-3 text-sm text-slate">
                      {filas.length === 0 && sinPerfil.length === 0
                        ? 'Sin empleados en esta quincena.'
                        : 'Ningún empleado coincide con los filtros aplicados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">
              Por tantos (relevadores)
            </h2>
            <TablaPorTantos filas={filasPorTantosVisibles} kmPorCuil={kmPorCuil} />
          </div>
        </>
      )}
    </section>
  );
}
