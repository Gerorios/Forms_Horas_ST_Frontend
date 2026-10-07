'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { TableSkeleton } from '@/components/skeleton';
import { useSession } from '@/lib/auth/session';
import { usePanelReportes, type EstadoReporte, type FiltrosPanel, type ReporteSeguridad, type TipoReporte } from '@/lib/api/seguridad';
import { DetalleReporte } from '@/features/seguridad/detalle-reporte';
import { CalificarReporte } from '@/features/seguridad/calificar-reporte';
import { TIPO_LABEL, fechaCorta } from '@/features/seguridad/tipos';

const ESTADOS: { valor: EstadoReporte | ''; label: string }[] = [
  { valor: 'pendiente', label: 'Pendientes' },
  { valor: 'aprobado', label: 'Aprobados' },
  { valor: 'desaprobado', label: 'Desaprobados' },
  { valor: 'anulado', label: 'Anulados' },
  { valor: '', label: 'Todos' },
];

const CAMPO = 'min-h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

function enviado(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function clasificacion(r: ReporteSeguridad) {
  return r.naturaleza?.nombre ?? r.motivoParalizacion?.nombre ?? '—';
}

function punto(r: ReporteSeguridad) {
  if (!r.punto) return '—';
  return r.punto.errorMetros != null ? `±${Math.round(r.punto.errorMetros)} m` : 'Sí';
}

function IconoAlarma() {
  return (
    <svg role="img" aria-label="Alarma: paralización sin calificar" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-danger">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

/** Panel de reportes de HyS y Admin: la bandeja para calificar. Las
 * paralizaciones pendientes (la única alarma) van arriba de todo; el backend
 * ya las ordena así. */
export default function PanelReportesPage() {
  const { perfil } = useSession();
  const [filtros, setFiltros] = useState<FiltrosPanel>({ estado: 'pendiente' });
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  const { data, isLoading } = usePanelReportes(filtros);
  const reportes = useMemo(() => data ?? [], [data]);
  // Se guarda el id: al calificar, la lista se refresca y el detalle tiene que
  // mostrar el estado nuevo (mismo criterio que /novedades).
  const seleccionado = reportes.find((r) => r.id === seleccionadoId) ?? null;
  const alarmas = reportes.filter((r) => r.alarma).length;

  function cambiar<K extends keyof FiltrosPanel>(clave: K, valor: FiltrosPanel[K]) {
    setFiltros((f) => ({ ...f, [clave]: valor || undefined }));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        area="seguridad"
        title="Panel de reportes"
        action={
          <Link href="/seguridad/nuevo" className="inline-flex min-h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-ink hover:brightness-95">
            {perfil?.rol.nombre === 'HyS' ? 'Nueva inspección' : 'Nuevo reporte'}
          </Link>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Estado">
          {ESTADOS.map((e) => {
            const activo = (filtros.estado ?? '') === e.valor;
            return (
              <button
                key={e.label}
                type="button"
                aria-pressed={activo}
                onClick={() => cambiar('estado', e.valor || undefined)}
                className={`min-h-10 rounded-full px-3.5 text-sm transition ${
                  activo ? 'bg-graphite font-semibold text-white' : 'border border-line bg-surface text-ink hover:bg-accent/60'
                }`}
              >
                {e.label}
              </button>
            );
          })}
        </div>
        <label className="flex flex-col gap-1 text-xs text-slate">
          Tipo
          <select aria-label="Tipo" value={filtros.tipo ?? ''} onChange={(e) => cambiar('tipo', (e.target.value || undefined) as TipoReporte | undefined)} className={CAMPO}>
            <option value="">Todos</option>
            {(Object.keys(TIPO_LABEL) as TipoReporte[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate">
          Desde
          <input aria-label="Desde" type="date" value={filtros.desde ?? ''} onChange={(e) => cambiar('desde', e.target.value)} className={CAMPO} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate">
          Hasta
          <input aria-label="Hasta" type="date" value={filtros.hasta ?? ''} onChange={(e) => cambiar('hasta', e.target.value)} className={CAMPO} />
        </label>
      </div>

      {alarmas > 0 && (
        <p role="status" className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {alarmas === 1 ? 'Hay 1 paralización sin calificar.' : `Hay ${alarmas} paralizaciones sin calificar.`} Lo urgente se
          avisa por WhatsApp: este panel es el registro.
        </p>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-[999_1_560px] overflow-x-auto rounded-xl border border-line bg-surface">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton />
            </div>
          ) : reportes.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate">No hay reportes con estos filtros.</p>
          ) : (
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="w-8 px-3 py-2.5"><span className="sr-only">Alarma</span></th>
                  <th className="px-2 py-2.5">Fecha</th>
                  <th className="px-2 py-2.5">Tipo</th>
                  <th className="px-2 py-2.5">Autor</th>
                  <th className="px-2 py-2.5">Actividad</th>
                  <th className="px-2 py-2.5">Naturaleza / motivo</th>
                  <th className="px-2 py-2.5">Punto en mapa</th>
                  <th className="px-2 py-2.5">Estado</th>
                  <th className="px-3 py-2.5">Enviado</th>
                </tr>
              </thead>
              <tbody>
                {reportes.map((r) => {
                  const activo = r.id === seleccionadoId;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSeleccionadoId(r.id)}
                      className={`cursor-pointer border-b border-line/60 transition last:border-0 ${
                        activo ? 'bg-accent shadow-[inset_3px_0_0_var(--color-brand-deep)]' : r.alarma ? 'bg-danger/5 hover:bg-danger/10' : 'hover:bg-accent/40'
                      }`}
                    >
                      <td className="px-3 py-2.5">{r.alarma && <IconoAlarma />}</td>
                      <td className="px-2 py-2.5 font-mono">{fechaCorta(r.fechaReporte)}</td>
                      <td className="px-2 py-2.5 font-medium text-ink">
                        <button type="button" onClick={() => setSeleccionadoId(r.id)} className="text-left hover:underline">
                          {TIPO_LABEL[r.tipo]}
                        </button>
                      </td>
                      <td className="px-2 py-2.5">{r.autor.nombre || r.autor.cuil}</td>
                      <td className="px-2 py-2.5">
                        {r.contrato.codigo} › {r.tarea.nombre}
                      </td>
                      <td className="px-2 py-2.5">{clasificacion(r)}</td>
                      <td className="px-2 py-2.5 text-slate">{punto(r)}</td>
                      <td className="px-2 py-2.5">
                        <StatusBadge estado={r.estado} />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate">{enviado(r.enviadoEn)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <aside className="min-w-0 flex-[1_1_360px] space-y-5 rounded-xl border border-line bg-surface p-4">
          {seleccionado ? (
            <>
              <DetalleReporte reporte={seleccionado} />
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-slate">Autor: </span>
                  {seleccionado.autor.nombre || seleccionado.autor.cuil}
                </p>
                {seleccionado.punto && (
                  <p>
                    <span className="text-slate">Punto: </span>
                    {seleccionado.punto.latitud}, {seleccionado.punto.longitud}
                    {seleccionado.punto.errorMetros != null ? ` · ±${Math.round(seleccionado.punto.errorMetros)} m` : ''}{' '}
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${seleccionado.punto.latitud}&mlon=${seleccionado.punto.longitud}#map=17/${seleccionado.punto.latitud}/${seleccionado.punto.longitud}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-brand-deep hover:underline"
                    >
                      ver en el mapa
                    </a>
                  </p>
                )}
                {seleccionado.calificadoPor && (
                  <p>
                    <span className="text-slate">Calificó: </span>
                    {seleccionado.calificadoPor.nombre || seleccionado.calificadoPor.cuil}
                  </p>
                )}
              </div>
              <div className="border-t border-line pt-4">
                <CalificarReporte key={`${seleccionado.id}-${seleccionado.estado}`} reporte={seleccionado} miCuil={perfil?.cuil} />
              </div>
            </>
          ) : (
            <p className="text-sm text-slate">Elegí un reporte de la lista para ver el detalle y calificarlo.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
