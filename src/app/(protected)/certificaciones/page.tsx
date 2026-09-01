'use client';

import { useMemo, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from '@/lib/auth/session';
import { PageHeader } from '@/components/page-header';
import { FiltroNumero, FiltroSelect } from '@/components/ui/barra-filtros';
import { BlockSkeleton, TilesSkeleton } from '@/components/skeleton';
import {
  useResumenCert,
  useEstadoCargas,
  usePresupuesto,
  usePorContratoMes,
  useIncidenciaSerie,
} from '@/lib/api/certificaciones';
import { calcularIncidencia, semaforo, type Semaforo } from '@/features/certificaciones/resumen/incidencia';
import { construirSerie, ordenarCodigosK } from '@/features/certificaciones/resumen/serie-incidencia';
import { colorContrato, fmtMoneda, fmtPct } from '@/features/certificaciones/analytics/colores';

// Recharts (~100kb+) no hace falta en el bundle inicial de la página — se
// carga recién cuando se renderiza (mismo patrón que /certificaciones/analytics).
const EvolucionIncidencia = dynamic(
  () => import('@/features/certificaciones/resumen/evolucion-incidencia').then((m) => m.EvolucionIncidencia),
  { ssr: false },
);

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_OPCIONES = NOMBRES_MES.map((nombre, i) => ({ value: i + 1, label: nombre }));

const SEMAFORO_LABEL: Record<Semaforo, string> = { ok: 'OK', alerta: 'Alerta', excedido: 'Excedido' };
const SEMAFORO_CLASE: Record<Semaforo, string> = {
  ok: 'bg-approved/10 text-approved ring-approved/25',
  alerta: 'bg-warn/10 text-warn ring-warn/25',
  excedido: 'bg-danger/10 text-danger ring-danger/25',
};

function SemaforoBadge({ pct }: { pct: number }) {
  const s = semaforo(pct);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${SEMAFORO_CLASE[s]}`}
    >
      {SEMAFORO_LABEL[s]}
    </span>
  );
}

/** "YYYY-MM" del mes calendario anterior a `anio`/`mes` (cruza año en enero). */
function periodoAnterior(anio: number, mes: number): string {
  const m = mes === 1 ? 12 : mes - 1;
  const a = mes === 1 ? anio - 1 : anio;
  return `${a}-${String(m).padStart(2, '0')}`;
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs tabular-nums">{sub}</p>}
    </div>
  );
}

/** Delta del total certificado vs el mes anterior. A diferencia de un KPI de
 * costo (liquidación, donde subir es malo), acá más certificado es más
 * trabajo ejecutado: sube = ok (verde), baja = danger (rojo). Sin dato si no
 * hay certificaciones cargadas para el mes anterior. */
function DeltaCertificado({ actual, anterior, hayAnterior }: { actual: number; anterior: number; hayAnterior: boolean }) {
  if (!hayAnterior) return <span className="text-slate">—</span>;
  if (anterior === 0) return <span className="text-slate">—</span>;
  const pct = Math.round(((actual - anterior) / anterior) * 1000) / 10;
  if (pct === 0) return <span className="text-slate">= vs mes anterior</span>;
  const sube = pct > 0;
  return (
    <span className={sube ? 'text-approved' : 'text-danger'}>
      {sube ? '▲ ' : '▼ '}
      {fmtPct(pct, true)} vs mes anterior
    </span>
  );
}

function Card({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <h2 className="font-display text-sm font-semibold text-ink">{titulo}</h2>
      {children}
    </div>
  );
}

export default function CertificacionesPage() {
  const { perfil } = useSession();
  const hoy = useMemo(() => new Date(), []);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const periodo = `${anio}-${String(mes).padStart(2, '0')}`;
  const periodoPrevio = periodoAnterior(anio, mes);

  // `/analytics/estado-cargas` ahora filtra server-side por K asignado —
  // accesible también para el nivel `carga` (Task 2), así que ya no hay que
  // gatear la query acá.
  const { data: resumen, isLoading: cargandoResumen } = useResumenCert(periodo);
  const { data: resumenAnterior, isLoading: cargandoAnterior } = useResumenCert(periodoPrevio);
  const { data: estadoCargas, isLoading: cargandoEstado } = useEstadoCargas(periodo);
  const { data: presupuesto, isError: errorPresupuesto } = usePresupuesto();

  // La incidencia MO solo se calcula si el usuario tiene el claim (admin/lectura
  // siempre, 'carga' solo con `inc`).
  const muestraIncidencia = perfil?.cert != null && (perfil.cert.inc || perfil.cert.nivel !== 'carga');
  const { data: porContratoMes, isLoading: cargandoPorContrato } = usePorContratoMes({});
  const {
    data: incidenciaSerieRaw,
    isLoading: cargandoIncidenciaSerie,
    isError: errorIncidenciaSerie,
  } = useIncidenciaSerie(anio, mes, muestraIncidencia);

  const certificadoPorK = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const fila of resumen ?? []) {
      acc[fila.contrato] = (acc[fila.contrato] ?? 0) + fila.monto_total;
    }
    return acc;
  }, [resumen]);

  const ultimoPuntoRaw = incidenciaSerieRaw?.at(-1);

  const moPorK = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const c of ultimoPuntoRaw?.contratos ?? []) acc[c.codigo] = c.montoMo;
    return acc;
  }, [ultimoPuntoRaw]);

  // `ordenarCodigosK` es el mismo helper que usa `evolucion-incidencia.tsx`
  // para ordenar las líneas del chart — así el índice usado para
  // `colorContrato(i)` es idéntico acá y ahí: el swatch de un K en la tabla
  // coincide con el color de su línea, sin depender del orden en que la API
  // devuelva los contratos.
  const filasIncidencia = useMemo(() => {
    const filas = calcularIncidencia(certificadoPorK, moPorK);
    const porCodigo = new Map(filas.map((f) => [f.codigo, f]));
    return ordenarCodigosK(filas.map((f) => f.codigo)).map((codigo) => porCodigo.get(codigo)!);
  }, [certificadoPorK, moPorK]);

  const certPorMes = useMemo(
    () => (porContratoMes ?? []).map((p) => ({ periodo: p.periodo, contrato: p.contrato, monto: p.monto_total })),
    [porContratoMes],
  );
  const puntosSerie = useMemo(
    () => construirSerie(certPorMes, incidenciaSerieRaw ?? []),
    [certPorMes, incidenciaSerieRaw],
  );

  const totalCertificado = (resumen ?? []).reduce((acc, f) => acc + f.monto_total, 0);
  const totalAnterior = (resumenAnterior ?? []).reduce((acc, f) => acc + f.monto_total, 0);
  const hayMesAnterior = !cargandoAnterior && (resumenAnterior ?? []).length > 0;
  const contratosCertificaron = (estadoCargas ?? []).filter((c) => c.cargado).length;
  const contratosFaltantes = (estadoCargas ?? []).filter((c) => !c.cargado).length;
  const totalContratosPeriodo = (estadoCargas ?? []).length;

  const cargandoKpis = cargandoResumen || cargandoAnterior || cargandoEstado;
  const cargandoIncidencia = cargandoResumen || cargandoIncidenciaSerie || cargandoPorContrato;

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Certificaciones" title="Resumen de certificaciones" />

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4">
        <FiltroSelect
          label="Mes"
          value={mes}
          onChange={(v) => setMes(Number(v))}
          opciones={MESES_OPCIONES}
          opcional={false}
        />
        <FiltroNumero label="Año" value={anio} onChange={(v) => setAnio(Number(v) || anio)} className="w-24" />
      </div>

      {cargandoKpis ? (
        <TilesSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            label="Certificado del mes"
            value={fmtMoneda(totalCertificado)}
            sub={<DeltaCertificado actual={totalCertificado} anterior={totalAnterior} hayAnterior={hayMesAnterior} />}
          />
          <StatTile
            label="Contratos certificados"
            value={`${contratosCertificaron} / ${totalContratosPeriodo}`}
          />
          <StatTile
            label="Aún sin subir"
            value={String(contratosFaltantes)}
            sub={contratosFaltantes > 0 ? <span className="text-slate">Sin carga en el período</span> : undefined}
          />
        </div>
      )}

      {presupuesto && !errorPresupuesto && (
        <Card titulo="Presupuesto por contrato">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Presupuesto por contrato">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-3 py-2.5 font-medium">Contrato</th>
                  <th className="px-3 py-2.5 font-medium">Descripción</th>
                  <th className="px-3 py-2.5 text-right font-medium">Presupuesto</th>
                  <th className="px-3 py-2.5 text-right font-medium">Consumido</th>
                  <th className="px-3 py-2.5 text-right font-medium">% ejecutado</th>
                </tr>
              </thead>
              <tbody>
                {presupuesto.map((p) => (
                  <tr key={p.contrato} className="border-b border-line text-ink last:border-0">
                    <td className="px-3 py-2.5">{p.contrato}</td>
                    <td className="px-3 py-2.5 text-slate">{p.descripcion}</td>
                    <td className="tabular-nums px-3 py-2.5 text-right">{fmtMoneda(p.monto_presupuesto)}</td>
                    <td className="tabular-nums px-3 py-2.5 text-right">{fmtMoneda(p.consumido)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          p.pct > 100
                            ? 'bg-danger/10 text-danger ring-danger/25'
                            : p.pct > 80
                              ? 'bg-warn/10 text-warn ring-warn/25'
                              : 'bg-approved/10 text-approved ring-approved/25'
                        }`}
                      >
                        {fmtPct(p.pct)}
                      </span>
                    </td>
                  </tr>
                ))}
                {presupuesto.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-sm text-slate">
                      Sin presupuesto cargado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {muestraIncidencia && (
        <section
          aria-label="Incidencia de mano de obra"
          className="space-y-3 rounded-xl border border-line bg-surface p-4"
        >
          <h2 className="font-display text-sm font-semibold text-ink">Incidencia de mano de obra</h2>
          {cargandoIncidencia ? (
            <BlockSkeleton lines={4} />
          ) : errorIncidenciaSerie ? (
            <p className="text-sm text-slate">No se pudo cargar la incidencia de mano de obra.</p>
          ) : (
            <>
              <EvolucionIncidencia puntos={puntosSerie} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Incidencia de mano de obra por contrato">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                      <th className="px-3 py-2.5 font-medium">Contrato</th>
                      <th className="px-3 py-2.5 text-right font-medium">Certificado</th>
                      <th className="px-3 py-2.5 text-right font-medium">MO imputada</th>
                      <th className="px-3 py-2.5 text-right font-medium">% incidencia</th>
                      <th className="px-3 py-2.5 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasIncidencia.map((f, i) => (
                      <tr key={f.codigo} className="border-b border-line text-ink last:border-0">
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-sm"
                              style={{ background: colorContrato(i) }}
                            />
                            {f.codigo}
                          </span>
                        </td>
                        <td className="tabular-nums px-3 py-2.5 text-right">{fmtMoneda(f.certificado)}</td>
                        <td className="tabular-nums px-3 py-2.5 text-right">{fmtMoneda(f.mo)}</td>
                        <td className="tabular-nums px-3 py-2.5 text-right">
                          {f.pct === null ? '—' : fmtPct(f.pct)}
                        </td>
                        <td className="px-3 py-2.5">{f.pct !== null && <SemaforoBadge pct={f.pct} />}</td>
                      </tr>
                    ))}
                    {filasIncidencia.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-3 text-sm text-slate">
                          Sin datos de incidencia para este período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {ultimoPuntoRaw && ultimoPuntoRaw.sinAsignar !== null && (
                <p className="text-xs text-slate">
                  Sin contrato asignable: <span className="font-medium text-ink">{fmtMoneda(ultimoPuntoRaw.sinAsignar)}</span>
                </p>
              )}
            </>
          )}
        </section>
      )}
    </section>
  );
}
