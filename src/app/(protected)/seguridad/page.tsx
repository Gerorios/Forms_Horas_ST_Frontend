'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/button';
import { CardsSkeleton } from '@/components/skeleton';
import { mensajeDeError } from '@/lib/api/liquidacion';
import {
  useAnularReporte,
  useMisPuntos,
  useMisReportes,
  type MisPuntos,
  type ReporteSeguridad,
} from '@/lib/api/seguridad';
import { AnularReporteDialog } from '@/features/seguridad/anular-reporte-dialog';
import { ErrorCarga } from '@/features/seguridad/error-carga';
import { FOCO_VISIBLE, TIPO_LABEL, fechaCorta, signo } from '@/features/seguridad/tipos';
import { FiltroRango, RANGO_INICIAL, rangoDe, textoRango } from '@/features/seguridad/filtro-rango';

const ENLACE_PRIMARIO = `inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-ink transition hover:brightness-95 ${FOCO_VISIBLE}`;
const ENLACE_SECUNDARIO = `inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-accent/60 ${FOCO_VISIBLE}`;

/** Quiénes van delante se muestran sin nombres; con muchos, solo los más
 * cercanos (lo que importa es cuánto falta para pasar al de adelante). */
const MAX_DELANTE = 10;
/** Reportes por tanda: un reportero frecuente no tiene que scrollear todo. */
const POR_TANDA = 20;

/** Lo que vale un reporte para su autor. En una inspección, el puntaje es lo
 * que pierde cada persona observada: se muestra con signo menos, igual que en
 * el detalle. */
function puntosDelReporte(r: ReporteSeguridad): string {
  if (r.estado === 'desaprobado') return '0';
  if (r.estado !== 'aprobado' || r.puntaje == null) return '—';
  return signo(r.tipo === 'inspeccion' ? -r.puntaje : r.puntaje);
}

function TarjetaPuntos({ datos }: { datos: MisPuntos }) {
  const { puntos, posicion, delante } = datos;
  const cercanos = delante.slice(-MAX_DELANTE);
  // El dorado es la marca y se lee como logro: un total negativo va en blanco.
  const colorTotal = puntos.total > 0 ? 'text-brand' : 'text-white';
  return (
    <section aria-label="Mis puntos" className="space-y-4 rounded-xl bg-graphite p-5 text-white">
      <p className="text-sm text-white/75">{textoRango(datos)}</p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={`font-display text-5xl font-bold leading-none ${colorTotal}`}>{signo(puntos.total)}</p>
          <p className="mt-1 text-sm text-white/75">puntos</p>
        </div>
        {posicion && (
          <div className="text-right">
            <p className="font-display text-3xl font-semibold leading-none">{posicion.puesto}º</p>
            <p className="mt-1 text-sm text-white/75">de {posicion.de} personas</p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/85">
        <span>{signo(puntos.mas)} por reportes</span>
        <span>{puntos.menos > 0 ? `−${puntos.menos}` : '0'} por inspecciones</span>
      </div>
      {posicion && cercanos.length > 0 && (
        <div className="space-y-1 border-t border-white/15 pt-3">
          <p className="text-sm font-medium">Delante tuyo</p>
          <ul className="space-y-0.5 text-sm">
            {cercanos.map((d, i) => (
              <li key={i} className="flex justify-between font-mono text-white/85">
                <span>{d.puesto}º</span>
                <span>{signo(d.total)}</span>
              </li>
            ))}
          </ul>
          {delante.length > MAX_DELANTE && (
            <p className="text-xs text-white/70">y {delante.length - MAX_DELANTE} personas más adelante</p>
          )}
        </div>
      )}
    </section>
  );
}

function TarjetaPuntosCargando() {
  return (
    <section role="status" aria-label="Cargando tus puntos" className="space-y-4 rounded-xl bg-graphite p-5">
      <div className="h-3.5 w-40 animate-pulse rounded bg-white/15" />
      <div className="h-12 w-24 animate-pulse rounded bg-white/15" />
      <div className="h-3.5 w-52 animate-pulse rounded bg-white/15" />
    </section>
  );
}

/** Cómo se gana y se pierde: para que un 3 o un 8 no sean un misterio. */
function ComoSeGanan() {
  return (
    <details className="group rounded-xl border border-line bg-surface">
      <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 text-sm font-medium text-ink ${FOCO_VISIBLE}`}>
        ¿Cómo se ganan puntos?
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="transition group-open:rotate-180" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="space-y-2 px-4 pb-4 text-sm text-ink">
        <p>HyS aprueba tu reporte si gestionaste vos el riesgo, y le pone de 0 a 10 puntos:</p>
        <ul className="space-y-1 pl-1">
          <li>
            <span className="font-mono font-semibold">0–3</span> · gestión mínima
          </li>
          <li>
            <span className="font-mono font-semibold">4–7</span> · bien gestionado
          </li>
          <li>
            <span className="font-mono font-semibold">8–10</span> · ejemplar
          </li>
        </ul>
        <p>Avisarle a otro no suma: lo que cuenta es lo que hiciste vos. Si HyS te ve trabajando sin las condiciones de seguridad en una inspección, perdés puntos.</p>
      </div>
    </details>
  );
}

function TarjetaReporte({ r, onAnular }: { r: ReporteSeguridad; onAnular: () => void }) {
  return (
    <article className="space-y-2 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-ink">{TIPO_LABEL[r.tipo]}</span>
        <StatusBadge estado={r.estado} />
      </div>
      <p className="text-xs text-slate">
        {fechaCorta(r.fechaReporte)} · {r.contrato.codigo} › {r.tarea.nombre} · {r.provincia.nombre}
      </p>
      <p className="line-clamp-2 text-sm text-ink">{r.descripcion}</p>
      {r.comentarioHys && (
        <div className="rounded-lg bg-accent px-3 py-2 text-sm">
          <p className="text-xs font-semibold text-brand-deep">Comentario de HyS</p>
          <p className="text-ink">{r.comentarioHys}</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="font-mono text-base font-semibold text-ink">{puntosDelReporte(r)}</span>
        <div className="flex gap-2">
          {r.estado === 'pendiente' ? (
            <>
              <Link href={`/seguridad/${r.id}`} className={ENLACE_SECUNDARIO}>
                Editar
              </Link>
              <Button variant="danger" className="min-h-11" onClick={onAnular}>
                Anular
              </Button>
            </>
          ) : (
            <Link href={`/seguridad/${r.id}`} className={ENLACE_SECUNDARIO}>
              Ver
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

/** Mis reportes y puntos: lo que cada persona ve de sí misma (CONTEXT.md del
 * backend, "Mis puntos"). */
export default function MisReportesPage() {
  const [filtro, setFiltro] = useState(RANGO_INICIAL);
  const misPuntos = useMisPuntos(rangoDe(filtro));
  const misReportes = useMisReportes();
  const anular = useAnularReporte();
  const [anulando, setAnulando] = useState<ReporteSeguridad | null>(null);
  const [visibles, setVisibles] = useState(POR_TANDA);
  const puntos = misPuntos.data;
  const reportes = misReportes.data ?? [];

  function confirmarAnulacion(motivo: string) {
    if (!anulando) return;
    const promesa = anular.mutateAsync({ id: anulando.id, motivo });
    toast.promise(promesa, {
      loading: 'Anulando…',
      success: 'Reporte anulado',
      error: (e) => mensajeDeError(e, 'No se pudo anular el reporte'),
    });
    promesa.then(() => setAnulando(null)).catch(() => undefined);
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader
        area="seguridad"
        title="Mis reportes y puntos"
        action={
          <Link href="/seguridad/nuevo" className={ENLACE_PRIMARIO}>
            Nuevo reporte
          </Link>
        }
      />

      {misPuntos.isError ? (
        <ErrorCarga que="tus puntos" oscuro onReintentar={() => void misPuntos.refetch()} />
      ) : puntos ? (
        <TarjetaPuntos datos={puntos} />
      ) : (
        <TarjetaPuntosCargando />
      )}

      <FiltroRango valor={filtro} onChange={setFiltro} />
      <ComoSeGanan />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">Mis reportes</h2>
        {misReportes.isError ? (
          <ErrorCarga que="tus reportes" onReintentar={() => void misReportes.refetch()} />
        ) : misReportes.isLoading ? (
          <CardsSkeleton />
        ) : reportes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-slate">
            Todavía no enviaste ningún reporte. Cuando veas un riesgo y lo resuelvas, contalo acá y sumá puntos.
          </p>
        ) : (
          <>
            {reportes.slice(0, visibles).map((r) => (
              <TarjetaReporte key={r.id} r={r} onAnular={() => setAnulando(r)} />
            ))}
            {reportes.length > visibles && (
              <Button variant="secondary" className="min-h-11 w-full" onClick={() => setVisibles((v) => v + POR_TANDA)}>
                Ver más ({reportes.length - visibles} {reportes.length - visibles === 1 ? 'reporte' : 'reportes'})
              </Button>
            )}
          </>
        )}
      </section>

      {puntos && puntos.inspecciones.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">Inspecciones de seguridad</h2>
          <p className="text-sm text-slate">
            Situaciones en las que te vieron trabajando sin las condiciones de seguridad. Si tenés dudas, hablá con HyS.
          </p>
          {puntos.inspecciones.map((i, n) => (
            <article key={n} className="flex justify-between gap-3 rounded-xl border border-line bg-surface p-4">
              <div className="space-y-1">
                <p className="text-xs text-slate">
                  {fechaCorta(i.fecha)}
                  {i.naturaleza ? ` · ${i.naturaleza}` : ''} · {i.contrato}
                </p>
                <p className="text-sm text-ink">{i.descripcion}</p>
              </div>
              <span className="whitespace-nowrap font-mono text-base font-semibold text-danger">{signo(i.puntos)}</span>
            </article>
          ))}
        </section>
      )}

      {anulando && (
        <AnularReporteDialog
          reporte={anulando}
          anulando={anular.isPending}
          onCancel={() => setAnulando(null)}
          onConfirmar={confirmarAnulacion}
        />
      )}
    </div>
  );
}

