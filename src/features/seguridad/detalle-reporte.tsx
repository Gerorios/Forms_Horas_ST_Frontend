'use client';

import { useState, type ReactNode } from 'react';
import { StatusBadge } from '@/components/status-badge';
import type { ReporteSeguridad } from '@/lib/api/seguridad';
import { FotoProtegida } from './fotos-grupo';
import { VisorFotos } from './visor-fotos';
import { TIPO_LABEL, fechaCorta, signo } from './tipos';

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-sm">
      <dt className="text-slate">{etiqueta}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

function fechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Detalle de solo lectura de un reporte: lo que declaró el autor, sus fotos
 * y, si ya está calificado, el puntaje y el comentario de HyS. */
export function DetalleReporte({ reporte }: { reporte: ReporteSeguridad }) {
  const r = reporte;
  const puntos = r.estado === 'aprobado' && r.puntaje != null ? (r.tipo === 'inspeccion' ? -r.puntaje : r.puntaje) : null;
  const fotos = (grupo: 'riesgo' | 'control') => r.fotos.filter((f) => f.grupo === grupo);
  const etiqueta = (g: 'riesgo' | 'control') => (g === 'riesgo' ? 'Foto de lo que se vio' : 'Foto de lo que se hizo');
  // El visor recorre todas las fotos del reporte: primero las del riesgo.
  const todas = [...fotos('riesgo'), ...fotos('control')];
  const [abierta, setAbierta] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">{TIPO_LABEL[r.tipo]}</h2>
        <StatusBadge estado={r.estado} />
      </div>

      {(r.estado === 'aprobado' || r.estado === 'desaprobado') && (
        <div className="rounded-lg bg-accent px-3 py-2.5 text-sm">
          <p className="font-semibold text-ink">
            {r.estado === 'aprobado' ? `Aprobado · ${signo(puntos ?? 0)} puntos` : 'Desaprobado · 0 puntos'}
          </p>
          {r.comentarioHys && <p className="mt-1 text-ink">{r.comentarioHys}</p>}
        </div>
      )}
      {r.estado === 'anulado' && r.motivoAnulacion && (
        <p className="rounded-lg bg-slate/10 px-3 py-2.5 text-sm text-ink">Anulado: {r.motivoAnulacion}</p>
      )}

      <dl className="space-y-1.5">
        <Fila etiqueta="Fecha">
          {fechaCorta(r.fechaReporte)} · enviado {fechaHora(r.enviadoEn)}
        </Fila>
        <Fila etiqueta="Actividad">
          {r.contrato.codigo} › {r.tarea.nombre}
        </Fila>
        <Fila etiqueta="Lugar">
          {r.provincia.nombre}
          {r.ubicacion ? ` · ${r.ubicacion}` : ''}
        </Fila>
        {r.naturaleza && <Fila etiqueta="Naturaleza">{r.naturaleza.nombre}</Fila>}
        {r.motivoParalizacion && <Fila etiqueta="Motivo">{r.motivoParalizacion.nombre}</Fila>}
        {r.involucrados.length > 0 && (
          <Fila etiqueta={r.tipo === 'inspeccion' ? 'Observados' : 'Involucrados'}>
            {r.involucrados.map((i) => i.nombre || i.cuil).join(', ')}
          </Fila>
        )}
      </dl>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate">
          {r.tipo === 'propuesta_mejora' ? 'Propuesta' : 'Qué se vio'}
        </p>
        <p className="whitespace-pre-line text-sm text-ink">{r.descripcion}</p>
      </div>
      {r.controlRiesgo && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Qué se hizo</p>
          <p className="whitespace-pre-line text-sm text-ink">{r.controlRiesgo}</p>
        </div>
      )}

      {(['riesgo', 'control'] as const).map(
        (g) =>
          fotos(g).length > 0 && (
            <div key={g} className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate">
                {g === 'riesgo' ? 'Fotos de lo que se vio' : 'Fotos de lo que se hizo'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {fotos(g).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-label={`Ampliar: ${etiqueta(g).toLowerCase()}`}
                    onClick={() => setAbierta(todas.indexOf(f))}
                    className="aspect-square cursor-zoom-in overflow-hidden rounded-lg border border-line"
                  >
                    <FotoProtegida reporteId={r.id} fotoId={f.id} alt={etiqueta(g)} />
                  </button>
                ))}
              </div>
            </div>
          ),
      )}
      {abierta != null && (
        <VisorFotos
          fotos={todas.map((f) => ({ reporteId: r.id, fotoId: f.id, alt: etiqueta(f.grupo) }))}
          inicio={abierta}
          onCerrar={() => setAbierta(null)}
        />
      )}
    </div>
  );
}
