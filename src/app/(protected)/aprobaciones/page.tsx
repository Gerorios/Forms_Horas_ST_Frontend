'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePorAprobar } from '@/lib/api/aprobaciones';
import { agruparPorLote } from '@/lib/agrupar';
import { LoteCard } from '@/features/aprobaciones/lote-card';
import { LoteResueltoCard } from '@/features/aprobaciones/lote-resuelto-card';
import { QuincenaSelect } from '@/features/mis-registros/quincena-select';
import { FiltrosRegistros, type FiltrosRegistrosOpciones, type FiltrosRegistrosValue } from '@/components/filtros-registros';
import { opcionesFacetadas } from '@/lib/facetado';
import { quincenaDeFecha, enQuincena, type Quincena } from '@/lib/quincena';
import { PageHeader } from '@/components/page-header';
import type { EstadoRegistro, RegistroPorAprobar } from '@/types/domain';

type Tab = Extract<EstadoRegistro, 'pendiente' | 'aprobado' | 'desaprobado'>;

const TABS: { value: Tab; label: string }[] = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aprobado', label: 'Aprobados' },
  { value: 'desaprobado', label: 'Rechazados' },
];

function pasaContrato(f: RegistroPorAprobar, seleccionados: string[]) {
  return seleccionados.length === 0 || seleccionados.includes(String(f.contrato.id));
}

function pasaCargador(f: RegistroPorAprobar, seleccionados: string[]) {
  return seleccionados.length === 0 || seleccionados.includes(f.cargadoPor.cuil);
}

function pasaOperario(f: RegistroPorAprobar, seleccionados: string[]) {
  return seleccionados.length === 0 || seleccionados.includes(f.operario.cuil);
}

export default function AprobacionesPage() {
  const searchParams = useSearchParams();
  // Permite llegar acá con un operario ya filtrado (ej. desde "Control
  // general", clic en un nombre con alerta) sin pasos extra.
  const operarioCuilInicial = searchParams.get('operarioCuil');

  const [tab, setTab] = useState<Tab>('pendiente');
  const [quincena, setQuincena] = useState<Quincena>(() => quincenaDeFecha(new Date()));
  const [filtros, setFiltros] = useState<FiltrosRegistrosValue>(() =>
    operarioCuilInicial ? { operarioCuils: [operarioCuilInicial] } : {},
  );

  // El useState inicial solo lee el query param una vez: si se navega de nuevo
  // a esta misma página con otro operarioCuil (misma ruta, nuevo query), React
  // reutiliza la instancia y el estado inicial no se vuelve a evaluar. Este
  // effect mantiene el filtro sincronizado con el param sin pisar los demás
  // filtros que el usuario haya elegido en pantalla.
  useEffect(() => {
    if (operarioCuilInicial) {
      setFiltros((prev) => ({ ...prev, operarioCuils: [operarioCuilInicial] }));
    }
  }, [operarioCuilInicial]);

  // Contrato/cargador/operario se filtran en cliente (multi-selección, ver
  // MultiFiltro): el backend de porAprobar solo acepta un valor por campo, así
  // que dejamos de mandárselos y filtramos las filas ya traídas. La fecha sí
  // sigue yendo server-side, como antes.
  const { data, isLoading } = usePorAprobar(tab, { fecha: filtros.fecha });

  // Pendientes es siempre una cola chica (lo no resuelto); aprobados/rechazados
  // se acumulan indefinidamente con el uso, así que ahí sí acotamos por quincena.
  const filasDelPeriodo = useMemo(
    () => (tab === 'pendiente' ? (data ?? []) : (data ?? []).filter((f) => enQuincena(f.fecha, quincena))),
    [data, tab, quincena],
  );

  const filas = useMemo(
    () =>
      filasDelPeriodo.filter(
        (f) =>
          pasaContrato(f, filtros.contratoIds ?? []) &&
          pasaCargador(f, filtros.cargadoPorCuils ?? []) &&
          pasaOperario(f, filtros.operarioCuils ?? []),
      ),
    [filasDelPeriodo, filtros],
  );
  const grupos = useMemo(() => agruparPorLote(filas), [filas]);

  // Las opciones de cada MultiFiltro salen de lo ya cargado en pantalla (no
  // hay un catálogo aparte) y se facetan con los DEMÁS filtros aplicados
  // (excluyendo el propio) — así el contador de cada opción refleja cuántas
  // filas quedarían si se tildara esa opción.
  const codigoPorContratoId = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of filasDelPeriodo) m.set(String(f.contrato.id), f.contrato.codigo);
    return m;
  }, [filasDelPeriodo]);
  const nombrePorCargadorCuil = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of filasDelPeriodo) if (f.cargadoPor.nombre) m.set(f.cargadoPor.cuil, f.cargadoPor.nombre);
    return m;
  }, [filasDelPeriodo]);
  const nombrePorOperarioCuil = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of filasDelPeriodo) m.set(f.operario.cuil, f.operario.apellido_nombre);
    return m;
  }, [filasDelPeriodo]);

  const opciones: FiltrosRegistrosOpciones = useMemo(
    () => ({
      contratos: opcionesFacetadas(
        filasDelPeriodo.filter(
          (f) => pasaCargador(f, filtros.cargadoPorCuils ?? []) && pasaOperario(f, filtros.operarioCuils ?? []),
        ),
        (f) => String(f.contrato.id),
        filtros.contratoIds ?? [],
        { labelDe: (id) => codigoPorContratoId.get(id) ?? id },
      ),
      cargadores: opcionesFacetadas(
        filasDelPeriodo.filter(
          (f) => pasaContrato(f, filtros.contratoIds ?? []) && pasaOperario(f, filtros.operarioCuils ?? []),
        ),
        (f) => (f.cargadoPor.nombre ? f.cargadoPor.cuil : null),
        filtros.cargadoPorCuils ?? [],
        { labelDe: (cuil) => nombrePorCargadorCuil.get(cuil) ?? cuil },
      ),
      operarios: opcionesFacetadas(
        filasDelPeriodo.filter(
          (f) => pasaContrato(f, filtros.contratoIds ?? []) && pasaCargador(f, filtros.cargadoPorCuils ?? []),
        ),
        (f) => f.operario.cuil,
        filtros.operarioCuils ?? [],
        { labelDe: (cuil) => nombrePorOperarioCuil.get(cuil) ?? cuil },
      ),
    }),
    [filasDelPeriodo, filtros, codigoPorContratoId, nombrePorCargadorCuil, nombrePorOperarioCuil],
  );

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Jefe de contrato" title="Aprobaciones" />

      <div className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              tab === t.value
                ? 'border-brand font-medium text-ink'
                : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'pendiente' && <QuincenaSelect value={quincena} onChange={setQuincena} />}

      <FiltrosRegistros value={filtros} onChange={setFiltros} opciones={opciones} />

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : grupos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
          {tab === 'pendiente' ? 'No hay registros pendientes.' : 'No hay registros en esta quincena.'}
        </div>
      ) : tab === 'pendiente' ? (
        grupos.map((g) => <LoteCard key={g.loteId} grupo={g} />)
      ) : (
        grupos.map((g) => <LoteResueltoCard key={g.loteId} grupo={g} />)
      )}
    </section>
  );
}
