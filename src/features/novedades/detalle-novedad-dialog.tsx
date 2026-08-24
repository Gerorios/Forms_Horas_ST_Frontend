'use client';

import { type ReactNode } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/status-badge';
import { abrirAdjuntoNovedad } from '@/lib/api/novedades';
import type { Novedad } from '@/types/domain';

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Fila({ label, valor }: { label: string; valor: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate">{label}</p>
      <p className="text-sm text-ink">{valor}</p>
    </div>
  );
}

/** Acciones de resolución HyS (Justificar/No justificar/Reabrir) — solo
 * aplican a novedades de tipo Ausencia, ver /ausencias. Opcional: si no se
 * pasa, el diálogo se comporta como en /novedades (solo Editar/Anular). */
export interface AccionesHys {
  puedeGestionar: boolean;
  onJustificar: () => void;
  onNoJustificar: () => void;
  onReabrir: () => void;
  resolviendo: boolean;
  reabriendo: boolean;
}

/** Modal con el detalle completo de una novedad ya cargada (mismo patrón que
 * DetalleCarga en combustible), disparado al hacer click en una fila de
 * /novedades o /ausencias. Recibe el objeto completo directo (no vuelve a
 * pedirlo por id): la lista ya trae todos los campos. Consolida acá las
 * acciones que antes vivían sueltas en cada fila (Editar/Anular siempre;
 * Justificar/No justificar/Reabrir solo si viene `accionesHys`, 2026-08-20). */
export function DetalleNovedadDialog({
  novedad,
  onClose,
  puedeActuar,
  onEditar,
  onAnular,
  accionesHys,
}: {
  novedad: Novedad;
  onClose: () => void;
  puedeActuar: boolean;
  onEditar: () => void;
  onAnular: () => void;
  accionesHys?: AccionesHys;
}) {
  const anulada = novedad.estado === 'anulada';

  async function verCertificado() {
    try {
      await abrirAdjuntoNovedad(novedad.id);
    } catch {
      toast.error('No se pudo abrir el certificado');
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-semibold text-ink">Detalle de la novedad</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md px-2 py-1 text-slate hover:bg-accent/60"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {anulada && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              <p className="font-medium">Novedad anulada</p>
              <p>Motivo: {novedad.motivoAnulacion}</p>
              <p>
                {novedad.anuladaPorCuil ?? '—'}
                {novedad.anuladaEn ? ` · ${formatearFechaHora(novedad.anuladaEn)}` : ''}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <StatusBadge estado={novedad.estado} />
            <StatusBadge estado={novedad.estadoHys} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Fila label="Operario" valor={novedad.operario.apellido_nombre} />
            <Fila label="Legajo" valor={novedad.operario.legajo} />
            <Fila label="Tipo" valor={novedad.tipoNovedad.nombre} />
            <Fila label="Desde" valor={novedad.fechaInicio.slice(0, 10)} />
            <Fila label="Hasta" valor={novedad.fechaFin ? novedad.fechaFin.slice(0, 10) : '—'} />
            <Fila label="Cargado por" valor={novedad.cargadoPor.email} />
            <Fila label="Fecha de carga" valor={formatearFechaHora(novedad.createdAt)} />
          </div>

          <Fila label="Justificación" valor={novedad.justificacionTexto ?? '—'} />

          {novedad.descargoHys && <Fila label="Descargo de HyS" valor={novedad.descargoHys} />}

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate">Certificado adjunto</p>
            {novedad.adjuntoUrl ? (
              <button
                type="button"
                onClick={verCertificado}
                className="mt-1 text-sm font-medium text-brand-deep underline transition hover:no-underline"
              >
                Ver certificado
              </button>
            ) : (
              <p className="text-sm text-ink">—</p>
            )}
          </div>

          {!anulada && ((accionesHys?.puedeGestionar ?? false) || puedeActuar) && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              {accionesHys?.puedeGestionar &&
                (novedad.estadoHys === 'pendiente' ? (
                  <>
                    <button
                      type="button"
                      disabled={accionesHys.resolviendo}
                      onClick={accionesHys.onJustificar}
                      className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
                    >
                      Justificar
                    </button>
                    <button
                      type="button"
                      disabled={accionesHys.resolviendo}
                      onClick={accionesHys.onNoJustificar}
                      className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-accent/60 disabled:opacity-50"
                    >
                      No justificar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={accionesHys.reabriendo}
                    onClick={accionesHys.onReabrir}
                    className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-accent/60 disabled:opacity-50"
                  >
                    Reabrir
                  </button>
                ))}
              {puedeActuar && (
                <>
                  <button
                    type="button"
                    onClick={onEditar}
                    className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-accent/60"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={onAnular}
                    className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white transition hover:brightness-95"
                  >
                    Anular
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
