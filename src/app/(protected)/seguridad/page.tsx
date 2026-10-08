'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { TableSkeleton } from '@/components/skeleton';
import { mensajeDeError } from '@/lib/api/liquidacion';
import {
  useAnularReporte,
  useMisPuntos,
  useMisReportes,
  type MisPuntos,
  type ReporteSeguridad,
} from '@/lib/api/seguridad';
import { AnularReporteDialog } from '@/features/seguridad/anular-reporte-dialog';
import { TIPO_LABEL, fechaCorta, signo } from '@/features/seguridad/tipos';
import { FiltroRango, RANGO_INICIAL, rangoDe, textoRango } from '@/features/seguridad/filtro-rango';

const ENLACE_PRIMARIO =
  'inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-ink transition hover:brightness-95';

/** Quiénes van delante se muestran sin nombres; con muchos, solo los más
 * cercanos (lo que importa es cuánto falta para pasar al de adelante). */
const MAX_DELANTE = 10;

function TarjetaPuntos({ datos }: { datos: MisPuntos }) {
  const { puntos, posicion, delante } = datos;
  const cercanos = delante.slice(-MAX_DELANTE);
  return (
    <section className="space-y-4 rounded-xl bg-graphite p-5 text-white">
      <p className="text-sm text-white/75">{textoRango(datos)}</p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-5xl font-bold leading-none text-brand">{signo(puntos.total)}</p>
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
        <span className="font-mono text-base font-semibold text-ink">
          {r.estado === 'aprobado' ? signo(r.puntaje ?? 0) : r.estado === 'desaprobado' ? '0' : '—'}
        </span>
        <div className="flex gap-2">
          {r.estado === 'pendiente' ? (
            <>
              <Link href={`/seguridad/${r.id}`} className="inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-accent/60">
                Editar
              </Link>
              <button type="button" onClick={onAnular} className="min-h-11 rounded-md border border-line px-3 text-sm font-medium text-danger hover:bg-danger/10">
                Anular
              </button>
            </>
          ) : (
            <Link href={`/seguridad/${r.id}`} className="inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-accent/60">
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
  const { data: puntos } = useMisPuntos(rangoDe(filtro));
  const { data: reportes, isLoading } = useMisReportes();
  const anular = useAnularReporte();
  const [anulando, setAnulando] = useState<ReporteSeguridad | null>(null);

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

      <FiltroRango valor={filtro} onChange={setFiltro} />

      {puntos && <TarjetaPuntos datos={puntos} />}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">Mis reportes</h2>
        {isLoading ? (
          <TableSkeleton />
        ) : (reportes ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-slate">
            Todavía no enviaste ningún reporte. Cuando veas un riesgo y lo resuelvas, contalo acá y sumá puntos.
          </p>
        ) : (
          (reportes ?? []).map((r) => <TarjetaReporte key={r.id} r={r} onAnular={() => setAnulando(r)} />)
        )}
      </section>

      {puntos && puntos.inspecciones.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">Inspecciones de HyS</h2>
          <p className="text-sm text-slate">Situaciones en las que HyS te vio trabajando sin las condiciones de seguridad.</p>
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
        <AnularReporteDialog anulando={anular.isPending} onCancel={() => setAnulando(null)} onConfirmar={confirmarAnulacion} />
      )}
    </div>
  );
}
