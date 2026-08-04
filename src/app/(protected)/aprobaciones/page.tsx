'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePorAprobar, type FiltrosPorAprobar } from '@/lib/api/aprobaciones';
import { agruparPorLote } from '@/lib/agrupar';
import { LoteCard } from '@/features/aprobaciones/lote-card';
import { LoteResueltoCard } from '@/features/aprobaciones/lote-resuelto-card';
import { QuincenaSelect } from '@/features/mis-registros/quincena-select';
import { FiltrosRegistros, type FiltrosRegistrosOpciones } from '@/components/filtros-registros';
import { quincenaDeFecha, enQuincena, type Quincena } from '@/lib/quincena';
import { PageHeader } from '@/components/page-header';
import type { EstadoRegistro, RegistroPorAprobar } from '@/types/domain';

type Tab = Extract<EstadoRegistro, 'pendiente' | 'aprobado' | 'desaprobado'>;

const TABS: { value: Tab; label: string }[] = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aprobado', label: 'Aprobados' },
  { value: 'desaprobado', label: 'Rechazados' },
];

function opcionesDeFiltros(filas: RegistroPorAprobar[]): FiltrosRegistrosOpciones {
  const contratos = new Map<number, { id: number; codigo: string }>();
  const cargadores = new Map<string, { cuil: string; nombre: string }>();
  const operarios = new Map<string, { cuil: string; apellido_nombre: string }>();
  for (const f of filas) {
    contratos.set(f.contrato.id, { id: f.contrato.id, codigo: f.contrato.codigo });
    if (f.cargadoPor.nombre) cargadores.set(f.cargadoPor.cuil, f.cargadoPor);
    operarios.set(f.operario.cuil, f.operario);
  }
  return { contratos: [...contratos.values()], cargadores: [...cargadores.values()], operarios: [...operarios.values()] };
}

export default function AprobacionesPage() {
  const searchParams = useSearchParams();
  // Permite llegar acá con un operario ya filtrado (ej. desde "Control
  // general", clic en un nombre con alerta) sin pasos extra.
  const operarioCuilInicial = searchParams.get('operarioCuil');

  const [tab, setTab] = useState<Tab>('pendiente');
  const [quincena, setQuincena] = useState<Quincena>(() => quincenaDeFecha(new Date()));
  const [filtros, setFiltros] = useState<FiltrosPorAprobar>(() =>
    operarioCuilInicial ? { operarioCuil: operarioCuilInicial } : {},
  );

  const { data, isLoading } = usePorAprobar(tab, filtros);

  // Pendientes es siempre una cola chica (lo no resuelto); aprobados/rechazados
  // se acumulan indefinidamente con el uso, así que ahí sí acotamos por quincena.
  // Contrato/cargador/operario/fecha ya vienen filtrados server-side (porAprobar).
  const filas = useMemo(
    () => (tab === 'pendiente' ? (data ?? []) : (data ?? []).filter((f) => enQuincena(f.fecha, quincena))),
    [data, tab, quincena],
  );
  const grupos = useMemo(() => agruparPorLote(filas), [filas]);
  // Las opciones de cada select salen de lo ya cargado en pantalla (no hay un
  // catálogo aparte) — al elegir un filtro, las demás opciones se acotan a lo
  // que queda visible; para volver a ampliarlas hay que limpiar filtros.
  const opciones = useMemo(() => opcionesDeFiltros(filas), [filas]);

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
