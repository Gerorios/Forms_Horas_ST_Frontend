'use client';

import { useState, type ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { TableSkeleton } from '@/components/skeleton';
import { usePeriodos, useRanking, useTableros, type Conteo, type RangoConsulta, type TipoReporte } from '@/lib/api/seguridad';
import { TIPO_LABEL, fechaCorta, signo } from '@/features/seguridad/tipos';

const CAMPO = 'min-h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';
const TARJETA = 'rounded-xl border border-line bg-surface p-4';
/** Dos series que se distinguen también por luminosidad, no solo por tono. */
const COLOR_REPORTES = 'bg-[#2f5f8a]';
const COLOR_INSPECCIONES = 'bg-[#e08a2e]';

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
      <span className="w-8 text-right font-mono text-xs text-slate">{valor}</span>
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

/** "2026-10" → "Octubre 2026". */
function etiquetaMes(clave: string) {
  const [a, m] = clave.split('-').map(Number);
  const mes = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(new Date(a, m - 1, 1));
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${a}`;
}

/** Ranking y tableros de HyS y Admin. El rango sale de un período guardado o
 * de fechas libres; sin elegir nada, el período actual. */
export default function RankingPage() {
  const { data: periodos } = usePeriodos();
  const [modo, setModo] = useState<string>(''); // '' = actual, id de período, o 'libre'
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const rango: RangoConsulta =
    modo === 'libre' ? { desde: desde || undefined, hasta: hasta || undefined } : modo ? { periodoId: Number(modo) } : {};
  const { data: ranking, isLoading } = useRanking(rango);
  const { data: t } = useTableros(rango);

  const textoRango = ranking?.periodo
    ? `${ranking.periodo.nombre} · ${fechaCorta(ranking.periodo.desde)} al ${fechaCorta(ranking.periodo.hasta)}`
    : ranking?.desde || ranking?.hasta
      ? `${ranking.desde ? fechaCorta(ranking.desde) : 'el principio'} al ${ranking.hasta ? fechaCorta(ranking.hasta) : 'hoy'}`
      : 'Sin período vigente: todo el historial';
  const maxNaturaleza = Math.max(0, ...(t?.porNaturaleza ?? []).flatMap((n) => [n.reportes, n.inspecciones]));
  const calificados = (t?.totales.aprobados ?? 0) + (t?.totales.desaprobados ?? 0);
  const totalTodos = (t?.totales.reportes ?? 0) + (t?.totales.inspecciones ?? 0);

  return (
    <div className="space-y-5">
      <PageHeader area="seguridad" title="Ranking y tableros" />

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate">
          Período
          <select aria-label="Período" value={modo} onChange={(e) => setModo(e.target.value)} className={`${CAMPO} min-w-64`}>
            <option value="">El actual</option>
            {(periodos ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({fechaCorta(p.desde)} al {fechaCorta(p.hasta)})
              </option>
            ))}
            <option value="libre">Rango libre…</option>
          </select>
        </label>
        {modo === 'libre' && (
          <>
            <label className="flex flex-col gap-1 text-xs text-slate">
              Desde
              <input aria-label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={CAMPO} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate">
              Hasta
              <input aria-label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={CAMPO} />
            </label>
          </>
        )}
        <p className="pb-2 text-sm text-slate">{textoRango}</p>
      </div>

      {ranking && ranking.pendientes > 0 && (
        <p role="status" className="rounded-lg border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-ink">
          Este rango tiene <strong>{ranking.pendientes} reportes pendientes</strong>. El ranking puede cambiar: calificalos antes de
          anunciar ganadores.
        </p>
      )}

      {t && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Participación" valor={`${t.participacion.personas} de ${t.participacion.nominaActiva}`} detalle="personas con al menos un reporte" />
          <Kpi label="Aprobados" valor={pct(t.totales.aprobados, calificados)} detalle={`${t.totales.aprobados} aprobados · ${t.totales.desaprobados} desaprobados`} />
          <Kpi
            label="Respuesta de HyS"
            valor={t.respuestaHysDias == null ? '—' : `${t.respuestaHysDias.toLocaleString('es-AR')} días`}
            detalle="promedio de envío a calificación"
          />
          <Kpi label="Reportes con punto en el mapa" valor={pct(t.conPunto, totalTodos)} detalle={`${t.conPunto} de ${totalTodos}, por foto de cámara`} />
        </div>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-[1_1_480px]">
          <Seccion titulo="Ranking" extra={ranking && <span className="text-sm text-slate">{ranking.filas.length} personas con movimientos</span>}>
            {isLoading ? (
              <TableSkeleton />
            ) : !ranking || ranking.filas.length === 0 ? (
              <p className="text-sm text-slate">Nadie sumó ni perdió puntos en este rango.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                      <th className="py-2 pr-2">Puesto</th>
                      <th className="px-2 py-2">Persona</th>
                      <th className="px-2 py-2">Legajo</th>
                      <th className="px-2 py-2 text-right">Reportes</th>
                      <th className="px-2 py-2 text-right">Inspecciones</th>
                      <th className="py-2 pl-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.filas.map((f) => (
                      <tr key={f.cuil} className="border-b border-line/60 last:border-0">
                        <td className="py-2 pr-2 font-mono">{f.puesto}º</td>
                        <td className="px-2 py-2 text-ink">{f.nombre || f.cuil}</td>
                        <td className="px-2 py-2 font-mono text-slate">{f.legajo ?? '—'}</td>
                        <td className="px-2 py-2 text-right font-mono text-approved">{signo(f.mas)}</td>
                        <td className="px-2 py-2 text-right font-mono text-danger">{f.menos > 0 ? `−${f.menos}` : '0'}</td>
                        <td className="py-2 pl-2 text-right font-mono font-semibold text-ink">{signo(f.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>
        </div>

        <div className="min-w-0 flex-[1_1_420px]">
          <Seccion
            titulo="Por naturaleza"
            extra={
              <div className="flex gap-3 text-xs text-slate">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-sm ${COLOR_REPORTES}`} />
                  Lo que reporta la gente
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-sm ${COLOR_INSPECCIONES}`} />
                  Lo que encuentra HyS
                </span>
              </div>
            }
          >
            {(t?.porNaturaleza ?? []).length === 0 ? (
              <p className="text-sm text-slate">Sin datos en el rango.</p>
            ) : (
              (t?.porNaturaleza ?? []).map((n) => (
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
        </div>
      </div>

      {t && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Corte titulo="Por tipo" filas={t.porTipo} etiqueta={(n) => TIPO_LABEL[n as TipoReporte] ?? n} />
          <Corte titulo="Por contrato" filas={t.porContrato} />
          <Corte titulo="Por provincia" filas={t.porProvincia} />
          <Corte titulo="Tareas con más reportes" filas={t.porTarea} />
          <Corte titulo="Motivos de paralización" filas={t.porMotivoParalizacion} />
          <Corte titulo="Por mes" filas={t.porMes.map((m) => ({ nombre: m.mes, cantidad: m.reportes + m.inspecciones }))} etiqueta={etiquetaMes} />
          <section className={`${TARJETA} space-y-2 md:col-span-2 xl:col-span-3`}>
            <h3 className="font-display text-sm font-semibold text-ink">Personas más inspeccionadas</h3>
            {t.masInspeccionados.length === 0 ? (
              <p className="text-sm text-slate">Ninguna inspección en el rango.</p>
            ) : (
              <ul className="divide-y divide-line/60 text-sm">
                {t.masInspeccionados.map((p) => (
                  <li key={p.cuil} className="flex justify-between gap-3 py-1.5">
                    <span className="text-ink">{p.nombre || p.cuil}</span>
                    <span className="font-mono text-slate">
                      {p.cantidad} {p.cantidad === 1 ? 'inspección' : 'inspecciones'} · <span className="text-danger">{signo(p.puntos)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
