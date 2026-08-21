'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { BarraFiltros } from '@/components/ui/barra-filtros';
import { QuincenaCampos } from '@/features/mis-registros/quincena-select';
import { EditarNovedadDialog } from '@/features/novedades/editar-novedad-dialog';
import { AnularNovedadDialog } from '@/features/novedades/anular-novedad-dialog';
import { DetalleNovedadDialog } from '@/features/novedades/detalle-novedad-dialog';
import {
  useActualizarNovedad,
  useAnularNovedad,
  useNovedades,
  useReabrirNovedad,
  useResolverHys,
  useResumenAusencias,
} from '@/lib/api/novedades';
import { useSession } from '@/lib/auth/session';
import { quincenaDeFecha, type Quincena } from '@/lib/quincena';
import type { EstadoHys, Novedad, ResumenAusenciaOperario } from '@/types/domain';

const TABS: { value: EstadoHys; label: string }[] = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aprobada', label: 'Justificadas' },
  { value: 'desaprobada', label: 'Injustificadas' },
];

const ACCION: Record<
  'aprobada' | 'desaprobada',
  { titulo: string; boton: string; cargando: string; exito: string }
> = {
  aprobada: {
    titulo: 'Justificar ausencia',
    boton: 'Justificar',
    cargando: 'Justificando…',
    exito: 'Ausencia justificada',
  },
  desaprobada: {
    titulo: 'No justificar ausencia',
    boton: 'No justificar',
    cargando: 'Marcando como injustificada…',
    exito: 'Ausencia marcada como injustificada',
  },
};

/** Confirmación con descargo — mismo patrón que DesaprobarDialog, salvo que
 * acá el descargo es opcional para AMBAS acciones (justificar o no). */
function ResolverDialog({
  estadoHys,
  onConfirm,
  onCancel,
  confirmando,
}: {
  estadoHys: 'aprobada' | 'desaprobada';
  onConfirm: (descargoHys: string) => void;
  onCancel: () => void;
  confirmando: boolean;
}) {
  const [descargo, setDescargo] = useState('');
  const info = ACCION[estadoHys];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl border border-line bg-surface p-6 shadow-lg">
        <h3 className="font-display font-semibold text-ink">{info.titulo}</h3>
        <label className="flex flex-col gap-1 text-sm text-ink">
          Descargo (opcional)
          <textarea
            aria-label="Descargo"
            value={descargo}
            onChange={(e) => setDescargo(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            rows={3}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-2 text-sm text-slate hover:bg-accent/60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={confirmando}
            onClick={() => onConfirm(descargo.trim())}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
          >
            {info.boton}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Ícono de clip: reemplaza el link "Ver certificado" en la fila (queda para
 * el detalle) — de un vistazo se ve si hay adjunto sin sumar ancho variable. */
function IconoClip() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function nombreArchivoCsv(periodo: Quincena) {
  return `ausencias_${periodo.anio}-${String(periodo.mes).padStart(2, '0')}_q${periodo.parte}.csv`;
}

function celdaCsv(valor: string) {
  return `"${valor.replace(/"/g, '""')}"`;
}

/** Genera el CSV en el cliente (sin dependencias nuevas) y dispara la
 * descarga con un <a download> temporal. */
function descargarResumenCsv(filas: ResumenAusenciaOperario[], periodo: Quincena) {
  const header = ['CUIL', 'Legajo', 'Apellido y nombre', 'Días justificados', 'Días injustificados', 'Días pendientes'];
  const cuerpo = filas.map((f) => [
    f.operarioCuil,
    String(f.legajo),
    f.apellidoNombre,
    String(f.diasJustificados),
    String(f.diasInjustificados),
    String(f.diasPendientes),
  ]);
  const csv = [header, ...cuerpo].map((fila) => fila.map(celdaCsv).join(';')).join('\n');
  // BOM UTF-8 para que Excel abra las tildes bien.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivoCsv(periodo);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AusenciasPage() {
  const { perfil } = useSession();
  const [estado, setEstado] = useState<EstadoHys>('pendiente');
  const [periodo, setPeriodo] = useState<Quincena>(() => quincenaDeFecha(new Date()));

  const { data, isLoading } = useNovedades(periodo);
  const resolver = useResolverHys();
  const reabrir = useReabrirNovedad();
  const actualizar = useActualizarNovedad();
  const anular = useAnularNovedad();

  const puedeGestionar = perfil?.rol.nombre === 'HyS' || perfil?.rol.nombre === 'Admin';
  const resumen = useResumenAusencias(periodo);

  const [dialogo, setDialogo] = useState<{ id: number; estadoHys: 'aprobada' | 'desaprobada' } | null>(null);
  const [editando, setEditando] = useState<Novedad | null>(null);
  const [anulando, setAnulando] = useState<Novedad | null>(null);
  const [detalle, setDetalle] = useState<Novedad | null>(null);
  const [verAnuladas, setVerAnuladas] = useState(false);

  // Esta pantalla es solo para novedades de tipo "Ausencia" (el resto de los
  // tipos de novedad se gestionan desde /novedades). Las anuladas no entran
  // acá: vigencia (`estado`) es un eje distinto de la resolución de HyS
  // (`estadoHys`, usado para las pestañas) y se manejan aparte, ver abajo.
  const ausencias = useMemo(
    () => (data ?? []).filter((n) => n.tipoNovedad.nombre === 'Ausencia' && n.estado === 'activa'),
    [data],
  );
  const filtradas = useMemo(() => ausencias.filter((n) => n.estadoHys === estado), [ausencias, estado]);

  const ausenciasAnuladas = useMemo(
    () => (data ?? []).filter((n) => n.tipoNovedad.nombre === 'Ausencia' && n.estado === 'anulada'),
    [data],
  );

  function confirmarResolucion(descargoHys: string) {
    if (!dialogo) return;
    const { id, estadoHys } = dialogo;
    const info = ACCION[estadoHys];
    const promesa = resolver.mutateAsync({ id, estadoHys, descargoHys: descargoHys || undefined });
    toast.promise(promesa, {
      loading: info.cargando,
      success: info.exito,
      error: 'No se pudo resolver',
    });
    promesa.then(() => setDialogo(null)).catch(() => {});
  }

  function handleReabrir(id: number, nombre: string) {
    toast.promise(reabrir.mutateAsync(id), {
      loading: 'Reabriendo…',
      success: `Ausencia de ${nombre} reabierta`,
      error: 'No se pudo reabrir',
    });
  }

  // Justificar/No justificar/Reabrir se disparan desde el diálogo de detalle
  // (mismo patrón que Editar/Anular en /novedades): se cierra el detalle y se
  // abre el diálogo correspondiente, en vez de anidarlos uno sobre otro.
  function abrirJustificar() {
    if (!detalle) return;
    setDetalle(null);
    setDialogo({ id: detalle.id, estadoHys: 'aprobada' });
  }
  function abrirNoJustificar() {
    if (!detalle) return;
    setDetalle(null);
    setDialogo({ id: detalle.id, estadoHys: 'desaprobada' });
  }
  function reabrirDesdeDetalle() {
    if (!detalle) return;
    handleReabrir(detalle.id, detalle.operario.apellido_nombre);
    setDetalle(null);
  }

  function guardarEdicion(form: FormData) {
    if (!editando) return;
    const promesa = actualizar.mutateAsync({ id: editando.id, form });
    toast.promise(promesa, {
      loading: 'Guardando cambios…',
      success: 'Ausencia actualizada',
      error: 'No se pudo actualizar la ausencia',
    });
    promesa.then(() => setEditando(null)).catch(() => {});
  }

  function confirmarAnulacion(motivo: string) {
    if (!anulando) return;
    const promesa = anular.mutateAsync({ id: anulando.id, motivo });
    toast.promise(promesa, {
      loading: 'Anulando…',
      success: 'Ausencia anulada',
      error: 'No se pudo anular',
    });
    promesa.then(() => setAnulando(null)).catch(() => {});
  }

  return (
    <section className="space-y-4">
      <PageHeader eyebrow="Higiene y Seguridad" title="Ausencias" />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setEstado(t.value)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                estado === t.value
                  ? 'border-brand font-medium text-ink'
                  : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="mb-2 flex items-center gap-1.5 text-sm text-slate">
          <input type="checkbox" checked={verAnuladas} onChange={(e) => setVerAnuladas(e.target.checked)} />
          Ver anuladas
        </label>
      </div>

      <BarraFiltros hayFiltros={false} onLimpiar={() => {}}>
        <QuincenaCampos value={periodo} onChange={setPeriodo} />
        {puedeGestionar && (
          <button
            type="button"
            onClick={() => {
              // Nunca bajar un CSV vacío en silencio: si la consulta falló o no
              // hay datos, el usuario tiene que enterarse (revisión 2026-08-19).
              if (resumen.isError) {
                toast.error('No se pudo traer el resumen. Probá de nuevo en un momento.');
                return;
              }
              if (!resumen.data?.length) {
                toast.error('No hay ausencias en esta quincena para exportar.');
                return;
              }
              descargarResumenCsv(resumen.data, periodo);
            }}
            disabled={resumen.isLoading}
            className="ml-auto rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-accent/60 disabled:opacity-50"
          >
            Exportar
          </button>
        )}
      </BarraFiltros>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
          Sin ausencias en este estado.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-accent/20 text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-4 py-2.5 font-medium">Operario</th>
                <th className="px-4 py-2.5 font-medium">Período</th>
                <th className="px-4 py-2.5 font-medium"></th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((n) => (
                <tr
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetalle(n)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setDetalle(n);
                    }
                  }}
                  className="cursor-pointer border-b border-line text-ink transition last:border-0 hover:bg-accent/30"
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{n.operario.apellido_nombre}</div>
                    <div className="text-xs tabular-nums text-slate">Legajo {n.operario.legajo}</div>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate">
                    {n.fechaInicio.slice(0, 10)}
                    {n.fechaFin ? ` → ${n.fechaFin.slice(0, 10)}` : ''}
                  </td>
                  <td className="px-4 py-2.5 text-brand-deep">{n.adjuntoUrl && <IconoClip />}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge estado={n.estadoHys} />
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetalle(n);
                      }}
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-accent/60"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {verAnuladas && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate">Ausencias anuladas</p>
          {ausenciasAnuladas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-surface p-4 text-center text-sm text-slate">
              Sin ausencias anuladas.
            </p>
          ) : (
            <div className="rounded-xl border border-line bg-surface opacity-70 divide-y divide-line">
              {ausenciasAnuladas.map((n) => (
                <div key={n.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  <span className="font-medium text-ink">{n.operario.apellido_nombre}</span>
                  <span className="tabular-nums text-slate">
                    {n.fechaInicio.slice(0, 10)}
                    {n.fechaFin ? ` → ${n.fechaFin.slice(0, 10)}` : ''}
                  </span>
                  <StatusBadge estado="anulada" />
                  {n.motivoAnulacion && <span className="text-slate">Motivo: {n.motivoAnulacion}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {detalle && (
        <DetalleNovedadDialog
          novedad={detalle}
          onClose={() => setDetalle(null)}
          puedeActuar={puedeGestionar}
          onEditar={() => {
            setDetalle(null);
            setEditando(detalle);
          }}
          onAnular={() => {
            setDetalle(null);
            setAnulando(detalle);
          }}
          accionesHys={{
            puedeGestionar,
            onJustificar: abrirJustificar,
            onNoJustificar: abrirNoJustificar,
            onReabrir: reabrirDesdeDetalle,
            resolviendo: resolver.isPending,
            reabriendo: reabrir.isPending,
          }}
        />
      )}

      {editando && (
        <EditarNovedadDialog
          novedad={editando}
          onCancel={() => setEditando(null)}
          onGuardar={guardarEdicion}
          guardando={actualizar.isPending}
        />
      )}

      {anulando && (
        <AnularNovedadDialog
          onCancel={() => setAnulando(null)}
          onConfirmar={confirmarAnulacion}
          anulando={anular.isPending}
        />
      )}

      {dialogo && (
        <ResolverDialog
          estadoHys={dialogo.estadoHys}
          confirmando={resolver.isPending}
          onConfirm={confirmarResolucion}
          onCancel={() => setDialogo(null)}
        />
      )}
    </section>
  );
}
