'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { BarraFiltros } from '@/components/ui/barra-filtros';
import { QuincenaCampos } from '@/features/mis-registros/quincena-select';
import {
  abrirAdjuntoNovedad,
  useNovedades,
  useReabrirNovedad,
  useResolverHys,
  useResumenAusencias,
} from '@/lib/api/novedades';
import { useSession } from '@/lib/auth/session';
import { quincenaDeFecha, type Quincena } from '@/lib/quincena';
import type { EstadoHys, ResumenAusenciaOperario } from '@/types/domain';

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

  const puedeGestionar = perfil?.rol.nombre === 'HyS' || perfil?.rol.nombre === 'Admin';
  const resumen = useResumenAusencias(periodo);

  const [dialogo, setDialogo] = useState<{ id: number; estadoHys: 'aprobada' | 'desaprobada' } | null>(null);

  // Esta pantalla es solo para novedades de tipo "Ausencia" (el resto de los
  // tipos de novedad se gestionan desde /novedades).
  const ausencias = useMemo(
    () => (data ?? []).filter((n) => n.tipoNovedad.nombre === 'Ausencia'),
    [data],
  );
  const filtradas = useMemo(() => ausencias.filter((n) => n.estadoHys === estado), [ausencias, estado]);

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

  async function verCertificado(id: number) {
    try {
      await abrirAdjuntoNovedad(id);
    } catch {
      toast.error('No se pudo abrir el certificado');
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader eyebrow="Higiene y Seguridad" title="Ausencias" />

      <div className="flex gap-1 border-b border-line">
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
        <div className="rounded-xl border border-line bg-surface divide-y divide-line">
          {filtradas.map((n) => (
            <div key={n.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <span className="font-medium text-ink">{n.operario.apellido_nombre}</span>
              <span className="tabular-nums text-slate">
                {n.fechaInicio.slice(0, 10)}
                {n.fechaFin ? ` → ${n.fechaFin.slice(0, 10)}` : ''}
              </span>
              {n.justificacionTexto && <span className="text-slate">{n.justificacionTexto}</span>}
              {n.descargoHys && <span className="text-slate">Descargo: {n.descargoHys}</span>}
              <StatusBadge estado={n.estadoHys} />
              {n.adjuntoUrl && (
                <button
                  type="button"
                  onClick={() => verCertificado(n.id)}
                  className="text-xs font-medium text-brand-deep underline transition hover:no-underline"
                >
                  Ver certificado
                </button>
              )}
              <span className="ml-auto flex gap-2">
                {estado === 'pendiente' && (
                  <>
                    <button
                      type="button"
                      disabled={resolver.isPending}
                      onClick={() => setDialogo({ id: n.id, estadoHys: 'aprobada' })}
                      className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
                    >
                      Justificar
                    </button>
                    <button
                      type="button"
                      disabled={resolver.isPending}
                      onClick={() => setDialogo({ id: n.id, estadoHys: 'desaprobada' })}
                      className="rounded-md border border-danger px-3 py-1 text-xs text-danger transition hover:bg-danger/10 disabled:opacity-50"
                    >
                      No justificar
                    </button>
                  </>
                )}
                {estado !== 'pendiente' && puedeGestionar && (
                  <button
                    type="button"
                    disabled={reabrir.isPending}
                    onClick={() => handleReabrir(n.id, n.operario.apellido_nombre)}
                    className="rounded-md border border-line px-3 py-1 text-xs font-medium text-ink transition hover:bg-accent/60 disabled:opacity-50"
                  >
                    Reabrir
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
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
