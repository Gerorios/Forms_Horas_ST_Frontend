'use client';

import { useMemo, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from '@/lib/auth/session';
import { PageHeader } from '@/components/page-header';
import { BarraFiltros, FiltroFecha, FiltroSelect, MultiFiltro } from '@/components/ui/barra-filtros';
import { BlockSkeleton, TableSkeleton, TilesSkeleton } from '@/components/skeleton';
import {
  useContratosAnalytics,
  useEstadoCargasCompleto,
  useEvolucionMensual,
  useInteranual,
  usePorContratoMes,
  usePorProvincia,
  useProvinciasAnalytics,
  useTopItems,
  type FiltrosAnalytics,
} from '@/lib/api/certificaciones';
import { fmtMoneda, fmtPct, fmtPgn } from '@/features/certificaciones/analytics/colores';

// Recharts (~100kb+) no hace falta en el bundle inicial de la página — cada
// gráfico se carga recién cuando se renderiza (mismo patrón que
// /liquidacion/analisis). EstadoOperativo y TopItems no usan Recharts pero
// se cargan igual con `dynamic` por consistencia con el resto de la sección.
const EvolucionChart = dynamic(
  () => import('@/features/certificaciones/analytics/evolucion-chart').then((m) => m.EvolucionChart),
  { ssr: false },
);
const PorContratoChart = dynamic(
  () => import('@/features/certificaciones/analytics/por-contrato-chart').then((m) => m.PorContratoChart),
  { ssr: false },
);
const InteranualChart = dynamic(
  () => import('@/features/certificaciones/analytics/interanual-chart').then((m) => m.InteranualChart),
  { ssr: false },
);
const PorProvinciaChart = dynamic(
  () => import('@/features/certificaciones/analytics/por-provincia-chart').then((m) => m.PorProvinciaChart),
  { ssr: false },
);
const TopItems = dynamic(
  () => import('@/features/certificaciones/analytics/top-items').then((m) => m.TopItems),
  { ssr: false },
);
const EstadoOperativo = dynamic(
  () => import('@/features/certificaciones/analytics/estado-operativo').then((m) => m.EstadoOperativo),
  { ssr: false },
);

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs tabular-nums text-slate">{sub}</p>}
    </div>
  );
}

/** Sección con `<section aria-label>` — unidad accesible de cada bloque
 * (Evolución mensual / Por contrato / Desagregado / Operativo). */
function Seccion({ ariaLabel, titulo, children }: { ariaLabel: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-label={ariaLabel} className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <h2 className="font-display text-sm font-semibold text-ink">{titulo}</h2>
      {children}
    </section>
  );
}

/** Mensaje uniforme para queries que fallan — solo `/analytics/estado-cargas`
 * está restringido a gerente/admin (403 para el nivel `carga`, ver
 * `useEstadoCargasCompleto`; se gatea aparte con `enabled` para no pegarle
 * al endpoint) y esta sección cubre cualquier otro error de red en el resto
 * de `/analytics/*`. No hay forma de distinguirlos sin inspeccionar el
 * status acá, así que el mensaje es genérico. */
function EstadoError() {
  return <p className="text-sm text-slate">No se pudo cargar esta sección (verificá tu acceso a Analytics).</p>;
}

export default function AnalyticsPage() {
  const { perfil } = useSession();
  // `/analytics/estado-cargas` exige gerente/admin — el nivel `carga` del
  // claim `cert` no tiene acceso (403). Se gatea la query (no se dispara) y
  // no se renderiza la sección "Operativo" para ese nivel.
  const puedeVerOperativo = perfil?.cert?.nivel !== 'carga';

  const [contratos, setContratos] = useState<string[]>([]);
  const [provincias, setProvincias] = useState<string[]>([]);
  const [tipo, setTipo] = useState<'' | 'OPEX' | 'CAPEX'>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const filtros: FiltrosAnalytics = useMemo(
    () => ({
      contratos: contratos.length > 0 ? contratos : undefined,
      provincias: provincias.length > 0 ? provincias : undefined,
      tipo: tipo || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
    }),
    [contratos, provincias, tipo, desde, hasta],
  );

  const { data: contratosDisponibles } = useContratosAnalytics();
  const { data: provinciasDisponibles } = useProvinciasAnalytics();

  const { data: evolucion, isLoading: cargandoEvolucion, isError: errorEvolucion } = useEvolucionMensual(filtros);
  const { data: porContratoMes, isLoading: cargandoPorContrato, isError: errorPorContrato } =
    usePorContratoMes(filtros);
  const { data: porProvincia, isLoading: cargandoProvincia, isError: errorProvincia } = usePorProvincia(filtros);
  const { data: topItemsData, isLoading: cargandoTopItems, isError: errorTopItems } = useTopItems(filtros);
  const { data: interanual, isLoading: cargandoInteranual, isError: errorInteranual } = useInteranual(filtros);
  const { data: estadoCargas, isLoading: cargandoEstado, isError: errorEstado } =
    useEstadoCargasCompleto(puedeVerOperativo);

  const hayFiltros =
    contratos.length > 0 || provincias.length > 0 || tipo !== '' || desde !== '' || hasta !== '';

  function limpiarFiltros() {
    setContratos([]);
    setProvincias([]);
    setTipo('');
    setDesde('');
    setHasta('');
  }

  const totalMonto = (evolucion ?? []).reduce((s, p) => s + p.monto_total, 0);
  const totalPgn = (evolucion ?? []).reduce((s, p) => s + p.pgn_total, 0);

  const ultimoMesConVariacion = [...(interanual?.meses ?? [])].reverse().find((m) => m.var_monto !== null);

  // La matriz operativa filtra client-side por contrato y por rango de fecha
  // (el endpoint `/analytics/estado-cargas` no acepta filtros — devuelve TODO
  // el histórico, ver hook `useEstadoCargasCompleto`). `desde`/`hasta` son
  // fechas "YYYY-MM-DD"; se comparan por prefijo "YYYY-MM" contra `periodo`.
  const estadoCargasFiltrado = useMemo(() => {
    const desdePeriodo = desde ? desde.slice(0, 7) : null;
    const hastaPeriodo = hasta ? hasta.slice(0, 7) : null;
    return (estadoCargas ?? []).filter((f) => {
      if (contratos.length > 0 && !contratos.includes(f.contrato)) return false;
      if (desdePeriodo && f.periodo < desdePeriodo) return false;
      if (hastaPeriodo && f.periodo > hastaPeriodo) return false;
      return true;
    });
  }, [estadoCargas, contratos, desde, hasta]);

  const ultimoPeriodoOperativo = [...new Set(estadoCargasFiltrado.map((f) => f.periodo))].sort().at(-1);
  const filasUltimoPeriodo = estadoCargasFiltrado.filter((f) => f.periodo === ultimoPeriodoOperativo);
  const cargadosUltimoPeriodo = filasUltimoPeriodo.filter((f) => f.cargado).length;

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Certificaciones" title="Analytics" />

      <BarraFiltros hayFiltros={hayFiltros} onLimpiar={limpiarFiltros}>
        <MultiFiltro
          label="Contrato"
          ariaLabel="Filtrar por contrato"
          opciones={(contratosDisponibles ?? []).map((c) => ({ value: c, label: c }))}
          seleccionados={contratos}
          onChange={setContratos}
        />
        <MultiFiltro
          label="Provincia"
          ariaLabel="Filtrar por provincia"
          opciones={(provinciasDisponibles ?? []).map((p) => ({ value: p, label: p }))}
          seleccionados={provincias}
          onChange={setProvincias}
        />
        <FiltroSelect
          label="Tipo"
          ariaLabel="Filtrar por tipo"
          value={tipo}
          onChange={(v) => setTipo(v as '' | 'OPEX' | 'CAPEX')}
          opciones={[
            { value: 'OPEX', label: 'OPEX' },
            { value: 'CAPEX', label: 'CAPEX' },
          ]}
        />
        <FiltroFecha label="Desde" ariaLabel="Fecha desde" value={desde} onChange={setDesde} />
        <FiltroFecha label="Hasta" ariaLabel="Fecha hasta" value={hasta} onChange={setHasta} />
      </BarraFiltros>

      <section aria-label="Resumen del período" className="space-y-3">
        <h2 className="font-display text-sm font-semibold text-ink">Resumen del período</h2>
        {cargandoEvolucion || cargandoInteranual || cargandoEstado ? (
          <TilesSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Total certificado" value={errorEvolucion ? '—' : fmtMoneda(totalMonto)} />
            <StatTile label="Puntos Gasnor" value={errorEvolucion ? '—' : fmtPgn(totalPgn)} />
            <StatTile
              label="Variación interanual"
              value={
                errorInteranual || !ultimoMesConVariacion || ultimoMesConVariacion.var_monto === null
                  ? '—'
                  : fmtPct(ultimoMesConVariacion.var_monto, true)
              }
              sub={ultimoMesConVariacion ? `Último mes con datos: mes ${ultimoMesConVariacion.mes}` : undefined}
            />
            <StatTile
              label="Contratos al día"
              value={errorEstado || !ultimoPeriodoOperativo ? '—' : `${cargadosUltimoPeriodo}/${filasUltimoPeriodo.length}`}
              sub={ultimoPeriodoOperativo}
            />
          </div>
        )}
      </section>

      <div className="space-y-3">
        <h2 className="font-display text-base font-semibold text-ink">Tendencia</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <Seccion ariaLabel="Evolución mensual" titulo="Evolución mensual">
            {cargandoEvolucion ? (
              <BlockSkeleton />
            ) : errorEvolucion ? (
              <EstadoError />
            ) : (
              <EvolucionChart datos={evolucion ?? []} />
            )}
          </Seccion>
          <Seccion ariaLabel="Por contrato" titulo="Por contrato">
            {cargandoPorContrato ? (
              <BlockSkeleton />
            ) : errorPorContrato ? (
              <EstadoError />
            ) : (
              <PorContratoChart datos={porContratoMes ?? []} />
            )}
          </Seccion>
        </div>
        <Seccion ariaLabel="Comparación interanual" titulo="Comparación interanual">
          <p className="-mt-2 text-xs text-slate">
            Compara año completo actual vs anterior — no aplica el filtro de fechas.
          </p>
          {cargandoInteranual ? (
            <BlockSkeleton />
          ) : errorInteranual ? (
            <EstadoError />
          ) : (
            <InteranualChart datos={interanual ?? { anio_actual: null, anio_anterior: null, meses: [] }} />
          )}
        </Seccion>
      </div>

      <Seccion ariaLabel="Desagregado" titulo="Desagregado">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate">Por provincia</h3>
            {cargandoProvincia ? (
              <BlockSkeleton />
            ) : errorProvincia ? (
              <EstadoError />
            ) : (
              <PorProvinciaChart datos={porProvincia ?? []} />
            )}
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate">Top ítems</h3>
            {cargandoTopItems ? (
              <TableSkeleton rows={5} cols={5} />
            ) : errorTopItems ? (
              <EstadoError />
            ) : (
              <TopItems datos={topItemsData ?? []} />
            )}
          </div>
        </div>
      </Seccion>

      {puedeVerOperativo && (
        <Seccion ariaLabel="Operativo" titulo="Operativo">
          {cargandoEstado ? (
            <TableSkeleton rows={5} cols={6} />
          ) : errorEstado ? (
            <EstadoError />
          ) : (
            <EstadoOperativo datos={estadoCargasFiltrado} />
          )}
        </Seccion>
      )}
    </section>
  );
}
