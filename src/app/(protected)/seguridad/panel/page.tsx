'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { TableSkeleton } from '@/components/skeleton';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSession } from '@/lib/auth/session';
import { usePanelReportes, type EstadoReporte, type FiltrosPanel, type ReporteSeguridad, type TipoReporte } from '@/lib/api/seguridad';
import { DetalleReporte } from '@/features/seguridad/detalle-reporte';
import { CalificarReporte, teclaEsParaUnCampo, type AtajosCalificar } from '@/features/seguridad/calificar-reporte';
import { ReporteForm } from '@/features/seguridad/reporte-form';
import { ConfirmarDialog } from '@/features/seguridad/confirmar-dialog';
import { ErrorCarga } from '@/features/seguridad/error-carga';
import { ORIGEN_PUNTO_LABEL, urlMapa } from '@/features/seguridad/boton-ubicacion';
import { filtrosDeUrl, filtrosSonLosDeSiempre, siguientePendiente, urlDeFiltros } from '@/features/seguridad/panel-filtros';
import { FOCO_VISIBLE, TIPO_LABEL, fechaCorta, signo } from '@/features/seguridad/tipos';

const ESTADOS: { valor: EstadoReporte | 'todos'; label: string }[] = [
  { valor: 'pendiente', label: 'Pendientes' },
  { valor: 'aprobado', label: 'Aprobados' },
  { valor: 'desaprobado', label: 'Desaprobados' },
  { valor: 'anulado', label: 'Anulados' },
  { valor: 'todos', label: 'Todos' },
];

const CAMPO = `min-h-11 rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-brand-deep ${FOCO_VISIBLE}`;

/** "07/10/26 11:42": con año, porque el rango por defecto es el año entero. */
function enviado(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function clasificacion(r: ReporteSeguridad) {
  return r.naturaleza?.nombre ?? r.motivoParalizacion?.nombre ?? null;
}

/**
 * HyS corrige un reporte ajeno (ADR-027, revisión 2026-10-08): el mismo
 * formulario, en modo corrección, sobre `ui/dialog` (Esc, foco, aria-modal).
 * Cerrar con cambios sin guardar pregunta; guardar un reporte APROBADO avisa
 * de quién se recalculan los puntos antes de mandar.
 */
function CorregirDialog({ reporte, onCerrar }: { reporte: ReporteSeguridad; onCerrar: () => void }) {
  const [sucio, setSucio] = useState(false);
  const [preguntandoCierre, setPreguntandoCierre] = useState(false);
  const [confirmandoGuardar, setConfirmandoGuardar] = useState(false);
  const permitirEnvio = useRef(false);
  const formulario = useRef<HTMLFormElement | null>(null);
  const aprobado = reporte.estado === 'aprobado' && reporte.puntaje != null;
  const afectados =
    reporte.tipo === 'inspeccion' ? reporte.involucrados.map((i) => i.nombre || i.cuil) : [reporte.autor.nombre || reporte.autor.cuil];

  function intentarCerrar() {
    if (sucio) setPreguntandoCierre(true);
    else onCerrar();
  }

  return (
    <>
      <Dialog open onOpenChange={(abierto) => !abierto && intentarCerrar()}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-sand p-4 sm:max-w-2xl sm:p-6"
        >
          <div
            className="space-y-4"
            onChangeCapture={() => setSucio(true)}
            onInputCapture={() => setSucio(true)}
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest('[role="radio"]')) setSucio(true);
            }}
            onSubmitCapture={(e) => {
              // Un aprobado mueve puntos al guardar: se confirma antes de que
              // el formulario lo mande, y después se reenvía tal cual.
              if (aprobado && !permitirEnvio.current) {
                e.preventDefault();
                e.stopPropagation();
                formulario.current = e.target as HTMLFormElement;
                setConfirmandoGuardar(true);
              }
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <DialogHeader>
                <DialogTitle className="font-display text-lg font-semibold text-ink">Corregir reporte #{reporte.id}</DialogTitle>
                <DialogDescription className="text-sm text-slate">
                  Lo cargó {reporte.autor.nombre || reporte.autor.cuil}. Queda registrado qué cambiaste.
                </DialogDescription>
              </DialogHeader>
              <Button variant="ghost" onClick={intentarCerrar} className="min-h-11">
                Cerrar
              </Button>
            </div>
            {aprobado && (
              <p role="note" className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-ink">
                Está aprobado ({reporte.tipo === 'inspeccion' ? `−${reporte.puntaje}` : signo(reporte.puntaje!)}): si cambiás el tipo o las
                personas, al guardar se recalculan los puntos.
              </p>
            )}
            <ReporteForm inicial={reporte} modo="correccion" onListo={onCerrar} />
            {/* Anidadas en el diálogo: base-ui las apila sin pelear por el foco. */}
            {preguntandoCierre && (
        <ConfirmarDialog
          titulo="¿Cerrar sin guardar?"
          detalle="Los cambios que hiciste en la corrección se pierden."
          verbo="Cerrar sin guardar"
          variante="danger-solid"
          onCancelar={() => setPreguntandoCierre(false)}
          onConfirmar={() => {
            setPreguntandoCierre(false);
            onCerrar();
          }}
        />
      )}
      {confirmandoGuardar && (
        <ConfirmarDialog
          titulo="Se recalculan los puntos"
          detalle={
            reporte.tipo === 'inspeccion'
              ? `Está aprobada con −${reporte.puntaje}. Si cambiaste el tipo o las personas observadas, sus puntos se recalculan al guardar.`
              : `Está aprobado con +${reporte.puntaje}. Si lo pasás a inspección o cambiás datos que mueven puntos, se recalculan al guardar.`
          }
          afectados={afectados}
          verbo="Guardar corrección"
          onCancelar={() => setConfirmandoGuardar(false)}
          onConfirmar={() => {
            setConfirmandoGuardar(false);
            permitirEnvio.current = true;
            formulario.current?.requestSubmit();
            permitirEnvio.current = false;
          }}
        />
      )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function IconoAlarma() {
  return (
    <svg role="img" aria-label="Alarma: paralización sin calificar" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-danger">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function IconoPunto({ r }: { r: ReporteSeguridad }) {
  if (!r.punto) return null;
  const origen = ORIGEN_PUNTO_LABEL[r.punto.origen];
  const error = r.punto.errorMetros != null ? `, ±${Math.round(r.punto.errorMetros)} m` : '';
  return (
    <svg role="img" aria-label={`Con punto en el mapa (${origen}${error})`} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate">
      <title>{`Punto en el mapa: ${origen}${error}`}</title>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/** Panel de reportes de HyS y Admin: la bandeja para calificar. Las
 * paralizaciones pendientes (la única alarma) van arriba de todo; el backend
 * ya las ordena así. */
export default function PanelReportesPage() {
  const { perfil } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filtros = useMemo(() => filtrosDeUrl(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [corrigiendo, setCorrigiendo] = useState<ReporteSeguridad | null>(null);
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  const { data, isLoading, isError, refetch, isFetching } = usePanelReportes(filtros);
  // La cola completa de pendientes, para el contador del chip y la alarma
  // aunque se esté mirando otro estado (si el filtro ya es "pendientes", es la
  // misma consulta y react-query no la repite).
  const { data: pendientesData } = usePanelReportes({ estado: 'pendiente' });
  const reportes = useMemo(() => data ?? [], [data]);
  // Se guarda el id: al calificar, la lista se refresca y el detalle tiene que
  // mostrar el estado nuevo (mismo criterio que /novedades).
  const seleccionado = reportes.find((r) => r.id === seleccionadoId) ?? null;
  const cantidadPendientes = pendientesData?.length;
  const alarmas = (pendientesData ?? reportes).filter((r) => r.alarma).length;
  const filaActiva = useRef<HTMLTableRowElement | null>(null);
  const calificador = useRef<AtajosCalificar>(null);
  const filas = useRef<Map<number, HTMLTableRowElement>>(new Map());

  function cambiar<K extends keyof FiltrosPanel>(clave: K, valor: FiltrosPanel[K]) {
    const nuevos = { ...filtros, [clave]: valor || undefined };
    router.replace(`${pathname}${urlDeFiltros(nuevos)}`, { scroll: false });
  }

  /** Después de calificar o reabrir: el siguiente pendiente, sin buscarlo. */
  const pasarAlSiguiente = useCallback(() => {
    if (seleccionadoId == null) return;
    setSeleccionadoId(siguientePendiente(reportes, seleccionadoId));
  }, [reportes, seleccionadoId]);

  /** ↑/↓ (e Inicio/Fin) recorren la lista SOLO con el foco en una fila: en el
   * resto de la página las flechas siguen scrolleando, y en la escala de
   * puntaje eligen el puntaje. */
  function teclaEnLista(e: ReactKeyboardEvent<HTMLTableRowElement>, id: number) {
    if (reportes.length === 0) return;
    const i = reportes.findIndex((r) => r.id === id);
    const j =
      e.key === 'ArrowDown'
        ? Math.min(reportes.length - 1, i + 1)
        : e.key === 'ArrowUp'
          ? Math.max(0, i - 1)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? reportes.length - 1
              : null;
    if (j == null) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setSeleccionadoId(id);
      }
      return;
    }
    e.preventDefault();
    const destino = reportes[j].id;
    setSeleccionadoId(destino);
    filas.current.get(destino)?.focus();
  }

  /** 0–9 y A solo con el foco dentro del panel (lista o detalle), nunca en
   * un campo de texto ni detrás de un diálogo. */
  function atajosDelPanel(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (seleccionadoId == null || teclaEsParaUnCampo(e.nativeEvent)) return;
    if (calificador.current?.tecla(e.key)) e.preventDefault();
  }

  useEffect(() => {
    filaActiva.current?.scrollIntoView({ block: 'nearest' });
  }, [seleccionadoId]);

  // El id de la fila que recibe el Tab: la elegida, o la primera.
  const filaEnfocable = seleccionado?.id ?? reportes[0]?.id ?? null;

  const estadoActivo = filtros.estado ?? 'todos';

  return (
    <div className="space-y-5">
      <PageHeader
        area="seguridad"
        title="Panel de reportes"
        action={
          <Link
            href={perfil?.rol.nombre === 'HyS' ? '/seguridad/nuevo?tipo=inspeccion' : '/seguridad/nuevo'}
            className={`inline-flex min-h-11 items-center rounded-md bg-brand px-4 text-sm font-semibold text-ink hover:brightness-95 ${FOCO_VISIBLE}`}
          >
            {perfil?.rol.nombre === 'HyS' ? 'Nueva inspección' : 'Nuevo reporte'}
          </Link>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Estado">
          {ESTADOS.map((e) => {
            const activo = estadoActivo === e.valor;
            return (
              <button
                key={e.label}
                type="button"
                aria-pressed={activo}
                onClick={() => cambiar('estado', e.valor === 'todos' ? undefined : e.valor)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-sm transition ${FOCO_VISIBLE} ${
                  activo ? 'bg-graphite font-semibold text-white' : 'border border-line bg-surface text-ink hover:bg-accent/60'
                }`}
              >
                {e.label}
                {e.valor === 'pendiente' && cantidadPendientes != null && (
                  <span
                    aria-label={`${cantidadPendientes} sin calificar`}
                    className={`min-w-6 rounded-full px-1.5 text-center font-mono text-xs tabular-nums ${
                      activo ? 'bg-white/20 text-white' : cantidadPendientes > 0 ? 'bg-warn/15 text-ink' : 'bg-line text-slate'
                    }`}
                  >
                    {cantidadPendientes}
                  </span>
                )}
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
        {!filtrosSonLosDeSiempre(filtros) && (
          <Button variant="ghost" className="min-h-11 text-ink" onClick={() => router.replace(pathname, { scroll: false })}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {alarmas > 0 && (
        <p role="status" className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {alarmas === 1 ? 'Hay 1 paralización sin calificar.' : `Hay ${alarmas} paralizaciones sin calificar.`} Lo urgente se
          avisa por WhatsApp: este panel es el registro.
        </p>
      )}

      {/* Dos columnas desde 1024 px: el detalle no se va debajo de la tabla en
          una notebook (240 px de menú + tabla + detalle de 300–380 px). */}
      <div
        className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]"
        onKeyDown={atajosDelPanel}
      >
        <div className="min-w-0 space-y-2">
          {isError ? (
            <ErrorCarga que="los reportes" onReintentar={() => refetch()} reintentando={isFetching} />
          ) : isLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : reportes.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-slate">
              {estadoActivo === 'pendiente' ? 'No hay reportes pendientes con estos filtros. Todo calificado.' : 'No hay reportes con estos filtros.'}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full text-sm" role="grid" aria-label="Reportes" aria-readonly="true">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-slate">
                    <th className="w-8 px-3 py-2.5 font-medium">
                      <span className="sr-only">Alarma</span>
                    </th>
                    <th className="px-2 py-2.5 font-medium">Fecha</th>
                    <th className="px-2 py-2.5 font-medium">Reporte</th>
                    <th className="px-2 py-2.5 font-medium">Autor</th>
                    <th className="px-2 py-2.5 font-medium">Actividad</th>
                    <th className="px-3 py-2.5 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {reportes.map((r) => {
                    const activo = r.id === seleccionadoId;
                    return (
                      <tr
                        key={r.id}
                        ref={(el) => {
                          if (el) filas.current.set(r.id, el);
                          else filas.current.delete(r.id);
                          if (activo) filaActiva.current = el;
                        }}
                        aria-selected={activo}
                        tabIndex={r.id === filaEnfocable ? 0 : -1}
                        onClick={() => setSeleccionadoId(r.id)}
                        onKeyDown={(e) => teclaEnLista(e, r.id)}
                        className={`cursor-pointer border-b border-line/60 align-top transition last:border-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-deep ${
                          activo ? 'bg-accent shadow-[inset_3px_0_0_var(--color-brand-deep)]' : r.alarma ? 'bg-danger/5 hover:bg-danger/10' : 'hover:bg-accent/40'
                        }`}
                      >
                        <td className="px-3 py-2.5">{r.alarma && <IconoAlarma />}</td>
                        <td className="whitespace-nowrap px-2 py-2.5">
                          <span className="font-mono tabular-nums text-ink">{fechaCorta(r.fechaReporte)}</span>
                          <span className="block text-xs text-slate">enviado {enviado(r.enviadoEn)}</span>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className="font-medium text-ink">{TIPO_LABEL[r.tipo]}</span>
                          <span className="flex items-center gap-1.5 text-xs text-slate">
                            {clasificacion(r) ?? 'Sin clasificación'}
                            <IconoPunto r={r} />
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-ink">{r.autor.nombre || r.autor.cuil}</td>
                        <td className="px-2 py-2.5 text-ink">
                          {r.contrato.codigo} <span className="text-slate">›</span> {r.tarea.nombre}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge estado={r.estado} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-slate">
            Teclado: con el foco en la lista, <kbd className="font-mono text-ink">↑</kbd> <kbd className="font-mono text-ink">↓</kbd>{' '}
            cambian de reporte · con un reporte elegido, <kbd className="font-mono text-ink">0</kbd>–
            <kbd className="font-mono text-ink">9</kbd> eligen el puntaje (<kbd className="font-mono text-ink">1</kbd>{' '}
            <kbd className="font-mono text-ink">0</kbd> para el 10) y <kbd className="font-mono text-ink">A</kbd> aprueba (se puede
            deshacer).
          </p>
        </div>

        <aside
          aria-label="Detalle del reporte"
          className="min-w-0 space-y-5 rounded-xl border border-line bg-surface p-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto"
        >
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
                    <span className="font-mono tabular-nums">
                      {seleccionado.punto.latitud.toFixed(5)}, {seleccionado.punto.longitud.toFixed(5)}
                    </span>
                    {seleccionado.punto.errorMetros != null ? ` · ±${Math.round(seleccionado.punto.errorMetros)} m` : ''}
                    {` (${ORIGEN_PUNTO_LABEL[seleccionado.punto.origen]}) `}
                    <a href={urlMapa(seleccionado.punto)} target="_blank" rel="noreferrer" className={`font-medium text-brand-deep underline-offset-2 hover:underline ${FOCO_VISIBLE}`}>
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
              {seleccionado.estado !== 'anulado' && (
                <Button variant="secondary" onClick={() => setCorrigiendo(seleccionado)} className="min-h-11 w-full">
                  Corregir tipo o datos del reporte
                </Button>
              )}
              <div className="border-t border-line pt-4">
                <CalificarReporte
                  key={`${seleccionado.id}-${seleccionado.estado}`}
                  ref={calificador}
                  reporte={seleccionado}
                  miCuil={perfil?.cuil}
                  onHecho={pasarAlSiguiente}
                  onDeshecho={(id) => setSeleccionadoId(id)}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-slate">Elegí un reporte de la lista para ver el detalle y calificarlo.</p>
          )}
        </aside>
      </div>
      {corrigiendo && <CorregirDialog reporte={corrigiendo} onCerrar={() => setCorrigiendo(null)} />}
    </div>
  );
}
