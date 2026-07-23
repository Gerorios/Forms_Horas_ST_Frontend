'use client';

import { useMemo } from 'react';
import { enQuincena, type Quincena } from '@/lib/quincena';
import { infoCorreccion, type CorreccionInput } from '@/lib/correccion';
import { StatusBadge } from '@/components/status-badge';
import type { RegistroHoras } from '@/types/domain';

function Encabezado({ r }: { r: RegistroHoras }) {
  return (
    <div>
      <div className="font-medium text-ink">{r.fecha.slice(0, 10)}</div>
      <div className="text-sm text-slate">
        <span>{r.contrato.codigo}</span> · {r.tareas.map((t) => t.tarea.nombre).join(', ') || '—'}
      </div>
      {r.moviles.length > 0 && (
        <div className="text-xs text-slate/70">
          {r.moviles.map((m) => m.movil.identificador).join(', ')}
        </div>
      )}
    </div>
  );
}

function TarjetaSimple({ r }: { r: RegistroHoras }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <Encabezado r={r} />
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums text-ink">
            {r.horas} hs
            {r.alertaHoras && (
              <span className="ml-1 rounded bg-warn/10 px-1 text-xs font-medium text-warn">+16h</span>
            )}
          </div>
          <StatusBadge estado={r.estado} />
        </div>
      </div>
      {r.estado === 'desaprobado' && r.motivoDesaprobacion && (
        <p className="mt-2 text-xs text-danger">Motivo: {r.motivoDesaprobacion}</p>
      )}
    </div>
  );
}

/** Una sola tarjeta para el par rechazo→corrección: se ve de un vistazo qué
 * se declaró, qué se rechazó y en qué quedó — no dos tarjetas sueltas. */
function TarjetaCorregida({ original, corregida }: { original: RegistroHoras; corregida: RegistroHoras }) {
  return (
    <div className="rounded-xl border border-approved/40 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <Encabezado r={corregida} />
        <div className="text-right">
          <div className="text-sm text-slate/60 line-through tabular-nums">{original.horas} hs</div>
          <div className="text-lg font-bold tabular-nums text-ink">
            {corregida.horas} hs
            {corregida.alertaHoras && (
              <span className="ml-1 rounded bg-warn/10 px-1 text-xs font-medium text-warn">+16h</span>
            )}
          </div>
          <StatusBadge estado="aprobado" />
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-approved">
        Corregido de <span className="tabular-nums">{original.horas}</span> a{' '}
        <span className="tabular-nums">{corregida.horas}</span> hs
      </p>
      {original.motivoDesaprobacion && (
        <p className="mt-1 text-xs text-slate">Motivo: {original.motivoDesaprobacion}</p>
      )}
    </div>
  );
}

export function RegistrosCards({
  registros,
  quincena,
  isLoading,
}: {
  registros: RegistroHoras[] | undefined;
  quincena: Quincena;
  isLoading: boolean;
}) {
  const filtrados = useMemo(
    () => (registros ?? []).filter((r) => enQuincena(r.fecha, quincena)),
    [registros, quincena],
  );
  const total = useMemo(
    // Solo lo aprobado cuenta como hora a cobrar: lo pendiente todavía no
    // está confirmado y lo desaprobado fue rechazado.
    () =>
      filtrados
        .filter((r) => r.estado === 'aprobado')
        .reduce((s, r) => s + Number(r.horas), 0),
    [filtrados],
  );
  const paraCorreccion: CorreccionInput[] = useMemo(
    () =>
      filtrados.map((r) => ({
        id: r.id,
        loteId: r.loteId,
        loteIdOrigen: r.loteIdOrigen,
        contrato: r.contrato,
        horas: Number(r.horas),
        motivoDesaprobacion: r.motivoDesaprobacion,
      })),
    [filtrados],
  );

  if (isLoading) return <p className="text-slate">Cargando…</p>;
  if (filtrados.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
        Sin registros en esta quincena.
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-brand p-5 text-center">
        <div className="text-xs font-medium uppercase tracking-wide text-ink/70">
          Total {quincena.parte === 1 ? '1ª' : '2ª'} quincena
        </div>
        <div className="text-4xl font-extrabold tabular-nums text-ink">{total} hs</div>
      </div>

      <div className="space-y-2">
        {filtrados.map((r, i) => {
          const info = infoCorreccion(paraCorreccion[i], paraCorreccion);
          // La original se muestra anidada dentro de la tarjeta que la corrige, no aparte.
          if (info?.tipo === 'reemplazada') return null;
          if (info?.tipo === 'corrige') {
            const original = filtrados.find((f) => f.id === info.original.id)!;
            return <TarjetaCorregida key={r.id} original={original} corregida={r} />;
          }
          return <TarjetaSimple key={r.id} r={r} />;
        })}
      </div>
    </div>
  );
}
