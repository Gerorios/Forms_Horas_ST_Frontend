'use client';

import { useMemo, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { TableSkeleton, TilesSkeleton } from '@/components/skeleton';
import { useRanking, useTableros, type Conteo, type TipoReporte } from '@/lib/api/seguridad';
import { TIPO_LABEL, signo } from '@/features/seguridad/tipos';
import { FiltroRango, rangoDe, textoRango, type FiltroRangoValor } from '@/features/seguridad/filtro-rango';
import { ErrorCarga } from '@/features/seguridad/error-carga';
import { rangoDeUrl, urlDeRango } from '@/features/seguridad/ranking-url';

const TARJETA = 'rounded-xl border border-line bg-surface p-4';
/** Series de la paleta de gráficos del tema (globals.css, --color-chart-*),
 * validada sobre blanco; el dorado de la marca no se usa como color de dato. */
const COLOR_REPORTES = 'bg-chart-2';
const COLOR_INSPECCIONES = 'bg-chart-5';

/**
 * Inspecciones de HyS contra las de los inspectores habilitados. Muchas del
 * resto muestran compromiso de los inspectores; ninguna de HyS es una alerta
 * para que HyS salga más a campo.
 */
function KpiInspecciones({ hys, inspectores }: { hys: number; inspectores: number }) {
  const total = hys + inspectores;
  const pctHys = total ? Math.round((hys / total) * 100) : 0;
  return (
    <div className={`${TARJETA} space-y-1.5`}>
      <p className="text-sm text-slate">Inspecciones: HyS / inspectores</p>
      <p className="font-display text-2xl font-semibold text-ink">
        {hys} <span className="text-slate">/</span> {inspectores}
      </p>
      {total > 0 ? (
        <>
          <div className="flex h-2 overflow-hidden rounded-full bg-line" role="img" aria-label={`${pctHys}% de HyS, ${100 - pctHys}% de inspectores`}>
            <div className="bg-graphite" style={{ width: `${pctHys}%` }} />
            <div className="bg-chart-2" style={{ width: `${100 - pctHys}%` }} />
          </div>
          <p className="text-xs text-slate">
            {pctHys}% de HyS · {100 - pctHys}% del resto
            {hys === 0 && <span className="font-medium text-warn"> · HyS no cargó ninguna</span>}
          </p>
        </>
      ) : (
        <p className="text-xs text-slate">Ninguna inspección en el rango</p>
      )}
    </div>
  );
}

function Kpi({ label, valor, detalle }: { label: string; valor: string; detalle: string }) {
  return (
    <div className={`${TARJETA} space-y-1`}>
      <p className="text-sm text-slate">{label}</p>
      <p className="font-display text-2xl font-semibold text-ink">{valor}</p>
      <p className="text-xs text-slate">{detalle}</p>
    </div>
  );
}

function Barra({ valor, max, color }: { valor: number; max: number; color: string }) {
  const ancho = max > 0 ? Math.max(2, Math.round((valor / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 flex-1 rounded-sm bg-line/40">
        <div className={`h-2.5 rounded-sm ${color}`} style={{ width: `${ancho}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-xs tabular-nums text-slate">{valor}</span>
    </div>
  );
}

function Corte({ titulo, filas, etiqueta }: { titulo: string; filas: Conteo[]; etiqueta?: (n: string) => string }) {
  const max = Math.max(0, ...filas.map((f) => f.cantidad));
  return (
    <section className={`${TARJETA} space-y-2.5`}>
      <h3 className="font-display text-sm font-semibold text-ink">{titulo}</h3>
      {filas.length === 0 ? (
        <p className="text-sm text-slate">Sin datos en el rango.</p>
      ) : (
        filas.map((f) => (
          <div key={f.nombre} className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 text-sm">
            <span className="truncate text-ink" title={etiqueta ? etiqueta(f.nombre) : f.nombre}>
              {etiqueta ? etiqueta(f.nombre) : f.nombre}
            </span>
            <Barra valor={f.cantidad} max={max} color={COLOR_REPORTES} />
          </div>
        ))
      )}
    </section>
  );
}

/** Cantidad por mes en columnas: el tiempo se lee de izquierda a derecha. */
function ColumnasMes({ meses }: { meses: { mes: string; reportes: number; inspecciones: number }[] }) {
  const max = Math.max(0, ...meses.map((m) => m.reportes + m.inspecciones));
  return (
    <section className={`${TARJETA} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-ink">Por mes</h3>
        <Leyenda />
      </div>
      {meses.length === 0 ? (
        <p className="text-sm text-slate">Sin datos en el rango.</p>
      ) : (
        <div className="flex h-40 items-end gap-2 overflow-x-auto pb-1" role="list" aria-label="Reportes e inspecciones por mes">
          {meses.map((m) => {
            const total = m.reportes + m.inspecciones;
            const alto = (n: number) => (max > 0 ? `${Math.round((n / max) * 100)}%` : '0');
            return (
              <div
                key={m.mes}
                role="listitem"
                aria-label={`${etiquetaMes(m.mes)}: ${m.reportes} reportes, ${m.inspecciones} inspecciones`}
                className="flex h-full min-w-10 flex-1 flex-col items-center justify-end gap-1"
              >
                <span className="font-mono text-xs tabular-nums text-ink">{total}</span>
                <div className="flex w-full max-w-10 flex-1 flex-col justify-end">
                  <div className={`w-full rounded-t-sm ${COLOR_INSPECCIONES}`} style={{ height: alto(m.inspecciones) }} />
                  <div className={`w-full ${m.inspecciones ? '' : 'rounded-t-sm'} ${COLOR_REPORTES}`} style={{ height: alto(m.reportes) }} />
                </div>
                <span className="text-xs text-slate">{etiquetaMesCorta(m.mes)}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Leyenda() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate">
      <span className="inline-flex items-center gap-1.5">
        <span className={`h-2.5 w-2.5 rounded-sm ${COLOR_REPORTES}`} />
        Lo que reporta la gente
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className={`h-2.5 w-2.5 rounded-sm ${COLOR_INSPECCIONES}`} />
        Lo que encuentran las inspecciones
      </span>
    </div>
  );
}

function Seccion({ titulo, children, extra }: { titulo: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className={`${TARJETA} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold text-ink">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : '—');

/** "2026-10" → "oct 26", para el pie de las columnas. */
function etiquetaMesCorta(clave: string) {
  const [a, m] = clave.split('-').map(Number);
  const mes = new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(new Date(a, m - 1, 1)).replace('.', '');
  return `${mes} ${String(a).slice(2)}`;
}

/** "2026-10" → "Octubre 2026". */
function etiquetaMes(clave: string) {
  const [a, m] = clave.split('-').map(Number);
  const mes = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(new Date(a, m - 1, 1));
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${a}`;
}

/** Ranking y tableros de HyS y Admin, por rango de fechas: cada una elige
 * si mira el mes, el trimestre, el semestre o el año (por defecto, el año en
 * curso). No hay períodos guardados (ADR-027, revisión 2026-10-08). El rango
 * va en la dirección de la página: sobrevive a recargar y se comparte.
 *
 * Jerarquía (crítica 2026-10-08): arriba lo que se mira siempre (tarjetas,
 * ranking y quiénes más reportan); los cortes por categoría van agrupados en
 * "Más detalle", plegable, para no armar una pared de bloques. */
export default function RankingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filtro = useMemo(() => rangoDeUrl(new URLSearchParams(searchParams.toString())), [searchParams]);
  const rango = rangoDe(filtro);
  const ranking = useRanking(rango);
  const tableros = useTableros(rango);
  const r = ranking.data;
  const t = tableros.data;
  const maxNaturaleza = Math.max(0, ...(t?.porNaturaleza ?? []).flatMap((n) => [n.reportes, n.inspecciones]));
  const calificados = (t?.totales.aprobados ?? 0) + (t?.totales.desaprobados ?? 0);
  const totalTodos = (t?.totales.reportes ?? 0) + (t?.totales.inspecciones ?? 0);

  function cambiarRango(v: FiltroRangoValor) {
    router.replace(`${pathname}${urlDeRango(v)}`, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <PageHeader area="seguridad" title="Ranking y tableros" />

      <div className="flex flex-wrap items-end gap-3">
        <FiltroRango valor={filtro} onChange={cambiarRango} />
        {r && <p className="pb-3 text-sm text-slate">{textoRango(r)}</p>}
      </div>

      {r && r.pendientes > 0 && (
        <p role="status" className="rounded-lg border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-ink">
          Este rango tiene <strong>{r.pendientes} reportes pendientes</strong>. El ranking puede cambiar: calificalos antes de
          anunciar ganadores.
        </p>
      )}

      {tableros.isError ? (
        <ErrorCarga que="los tableros" onReintentar={() => tableros.refetch()} reintentando={tableros.isFetching} />
      ) : tableros.isLoading || !t ? (
        <TilesSkeleton count={5} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Kpi label="Participación" valor={`${t.participacion.personas} de ${t.participacion.nominaActiva}`} detalle="personas con al menos un reporte" />
          <Kpi label="Aprobados" valor={pct(t.totales.aprobados, calificados)} detalle={`${t.totales.aprobados} aprobados · ${t.totales.desaprobados} desaprobados`} />
          <Kpi
            label="Respuesta de HyS"
            valor={t.respuestaHysDias == null ? '—' : `${t.respuestaHysDias.toLocaleString('es-AR')} días`}
            detalle="promedio de envío a calificación"
          />
          <KpiInspecciones hys={t.inspeccionesPorOrigen.hys} inspectores={t.inspeccionesPorOrigen.inspectores} />
          <Kpi label="Reportes con punto en el mapa" valor={pct(t.conPunto, totalTodos)} detalle={`${t.conPunto} de ${totalTodos}, por GPS o foto de cámara`} />
        </div>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-[3_1_520px]">
          <Seccion titulo="Ranking" extra={r && <span className="text-sm text-slate">{r.filas.length} personas con movimientos</span>}>
            {ranking.isError ? (
              <ErrorCarga que="el ranking" onReintentar={() => ranking.refetch()} reintentando={ranking.isFetching} />
            ) : ranking.isLoading || !r ? (
              <TableSkeleton />
            ) : r.filas.length === 0 ? (
              <p className="text-sm text-slate">Nadie sumó ni perdió puntos en este rango.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-slate">
                      <th className="py-2 pr-2 font-medium">Puesto</th>
                      <th className="px-2 py-2 font-medium">Persona</th>
                      <th className="px-2 py-2 font-medium">Legajo</th>
                      <th className="px-2 py-2 text-right font-medium">Reportes</th>
                      <th className="px-2 py-2 text-right font-medium">Inspecciones</th>
                      <th className="py-2 pl-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {r.filas.map((f) => (
                      <tr key={f.cuil} className="border-b border-line/60 last:border-0">
                        <td className="py-2 pr-2 font-mono">{f.puesto}º</td>
                        <td className="px-2 py-2 text-ink">{f.nombre || f.cuil}</td>
                        <td className="px-2 py-2 font-mono text-slate">{f.legajo ?? '—'}</td>
                        <td className="px-2 py-2 text-right font-mono text-approved">{signo(f.mas)}</td>
                        <td className="px-2 py-2 text-right font-mono text-danger">{f.menos > 0 ? `−${f.menos}` : '0'}</td>
                        <td className={`py-2 pl-2 text-right font-mono font-semibold ${f.total < 0 ? 'text-danger' : 'text-ink'}`}>{signo(f.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>
        </div>

        <div className="min-w-0 flex-[2_1_360px]">
          <Seccion titulo="Quiénes más reportan" extra={<span className="text-xs text-slate">por reportes enviados, sin inspecciones</span>}>
            {tableros.isError ? (
              <p className="text-sm text-slate">No disponible: no se pudieron cargar los tableros.</p>
            ) : !t ? (
              <TableSkeleton rows={4} cols={3} />
            ) : t.masReportan.length === 0 ? (
              <p className="text-sm text-slate">Nadie envió reportes en este rango.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-slate">
                      <th className="py-2 pr-2 font-medium">#</th>
                      <th className="px-2 py-2 font-medium">Persona</th>
                      <th className="px-2 py-2 text-right font-medium">Enviados</th>
                      <th className="px-2 py-2 text-right font-medium">Aprobados</th>
                      <th className="py-2 pl-2 text-right font-medium">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {t.masReportan.map((p, i) => (
                      <tr key={p.cuil} className="border-b border-line/60 last:border-0">
                        <td className="py-2 pr-2 font-mono">{i + 1}</td>
                        <td className="px-2 py-2 text-ink">{p.nombre || p.cuil}</td>
                        <td className="px-2 py-2 text-right font-mono font-semibold text-ink">{p.enviados}</td>
                        <td className="px-2 py-2 text-right font-mono text-slate">{p.aprobados}</td>
                        <td className="py-2 pl-2 text-right font-mono text-approved">{signo(p.puntos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>
        </div>
      </div>

      {t && (
        <details className="group space-y-4 rounded-xl border border-line bg-sand-deep/60 p-4 open:bg-transparent open:p-0 open:border-0">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-1 font-display text-base font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
            <span>
              Más detalle
              <span className="ml-2 font-sans text-sm font-normal text-slate">
                por naturaleza, mes, tipo, contrato, provincia, tarea, motivo y personas más inspeccionadas
              </span>
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-slate transition group-open:rotate-180">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>

          <div className="grid gap-4 lg:grid-cols-2">
            <Seccion titulo="Por naturaleza" extra={<Leyenda />}>
              {t.porNaturaleza.length === 0 ? (
                <p className="text-sm text-slate">Sin datos en el rango.</p>
              ) : (
                t.porNaturaleza.map((n) => (
                  <div key={n.nombre} className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 text-sm">
                    <span className="truncate text-ink">{n.nombre}</span>
                    <div className="space-y-1">
                      <Barra valor={n.reportes} max={maxNaturaleza} color={COLOR_REPORTES} />
                      <Barra valor={n.inspecciones} max={maxNaturaleza} color={COLOR_INSPECCIONES} />
                    </div>
                  </div>
                ))
              )}
            </Seccion>
            <ColumnasMes meses={t.porMes} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Corte titulo="Por tipo" filas={t.porTipo} etiqueta={(n) => TIPO_LABEL[n as TipoReporte] ?? n} />
            <Corte titulo="Por contrato" filas={t.porContrato} />
            <Corte titulo="Por provincia" filas={t.porProvincia} />
            <Corte titulo="Tareas con más reportes" filas={t.porTarea} />
            <Corte titulo="Motivos de paralización" filas={t.porMotivoParalizacion} />
            <section className={`${TARJETA} space-y-2`}>
              <h3 className="font-display text-sm font-semibold text-ink">Personas más inspeccionadas</h3>
              {t.masInspeccionados.length === 0 ? (
                <p className="text-sm text-slate">Ninguna inspección en el rango.</p>
              ) : (
                <ul className="divide-y divide-line/60 text-sm">
                  {t.masInspeccionados.map((p) => (
                    <li key={p.cuil} className="flex justify-between gap-3 py-1.5">
                      <span className="text-ink">{p.nombre || p.cuil}</span>
                      <span className="font-mono tabular-nums text-slate">
                        {p.cantidad} {p.cantidad === 1 ? 'inspección' : 'inspecciones'} · <span className="text-danger">{signo(p.puntos)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </details>
      )}
    </div>
  );
}
