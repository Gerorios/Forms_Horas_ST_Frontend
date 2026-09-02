'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth/session';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/button';
import { useHistorialCargas, useDeshacerCarga, type HistorialCargaCert } from '@/lib/api/certificaciones';

// Pantalla "Historial" del módulo Certificaciones (Task 7 etapa 4) — visible
// para TODOS los niveles (`certificaciones-nav.ts` no la gatea): admin y
// lectura ven las últimas 100 cargas de todo el módulo, carga ve únicamente
// las propias (50) — el recorte lo hace el backend, acá se muestra tal cual
// llega. El botón "Deshacer" sí se gatea a nivel admin, mismo patrón de
// `return null` que el resto de gates de la app, pero acá es por-fila (no
// oculta la página entera).

const CONTRATO_CHIP =
  'inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand ring-1 ring-inset ring-brand/25';
const BADGE_OK =
  'inline-flex items-center rounded-full bg-approved/10 px-2 py-0.5 text-xs font-medium text-approved ring-1 ring-inset ring-approved/25';
const BADGE_WARN =
  'inline-flex items-center rounded-full bg-warn/10 px-2 py-0.5 text-xs font-medium text-warn ring-1 ring-inset ring-warn/25';

function mensajeError(e: unknown, fallback: string): string {
  return String((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback);
}

/** "K6,K11" → ['K6', 'K11'] — tolera espacios y entradas vacías. */
function contratosDe(csv: string): string[] {
  return csv
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c !== '');
}

function ConfirmarDeshacerModal({
  carga,
  onCancel,
  onConfirmar,
  deshaciendo,
}: {
  carga: HistorialCargaCert;
  onCancel: () => void;
  onConfirmar: () => void;
  deshaciendo: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-surface p-6 shadow-lg">
        <h3 className="font-display font-semibold text-ink">Deshacer carga</h3>
        <p className="text-sm text-slate">
          Borra las {carga.filas_cargadas} filas de certificaciones de este archivo y período. No se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger-solid" disabled={deshaciendo} onClick={onConfirmar}>
            {deshaciendo ? 'Deshaciendo…' : 'Deshacer carga'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function HistorialCargasPage() {
  const { perfil } = useSession();
  const esAdmin = perfil?.cert?.nivel === 'admin';

  const { data: historial, isLoading } = useHistorialCargas();
  const deshacer = useDeshacerCarga();

  const [cargaADeshacer, setCargaADeshacer] = useState<HistorialCargaCert | null>(null);

  const filas = historial ?? [];

  function confirmarDeshacer() {
    if (!cargaADeshacer) return;
    const promesa = deshacer.mutateAsync(cargaADeshacer.id);
    toast.promise(promesa, {
      loading: 'Deshaciendo carga…',
      success: (r) => `Carga deshecha: ${r.filasBorradas} fila${r.filasBorradas === 1 ? '' : 's'} borrada${r.filasBorradas === 1 ? '' : 's'}`,
      error: (e: unknown) => mensajeError(e, 'No se pudo deshacer la carga'),
    });
    promesa.then(() => setCargaADeshacer(null)).catch(() => {});
  }

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Certificaciones" title="Historial" />

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-sm" aria-label="Historial de cargas">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-3 py-2.5 font-medium">Usuario</th>
                <th className="px-3 py-2.5 font-medium">Archivo</th>
                <th className="px-3 py-2.5 font-medium">Contratos</th>
                <th className="px-3 py-2.5 font-medium">Período</th>
                <th className="px-3 py-2.5 text-right font-medium">Filas</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
                <th className="px-3 py-2.5 font-medium">Fecha</th>
                {esAdmin && <th className="px-3 py-2.5 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {filas.map((c) => (
                <tr key={c.id} className="border-b border-line text-ink last:border-0">
                  <td className="px-3 py-2.5">{c.usuario_nombre}</td>
                  <td className="max-w-[160px] truncate px-3 py-2.5" title={c.archivo_nombre}>
                    {c.archivo_nombre}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {contratosDe(c.contrato ?? '').map((k) => (
                        <span key={k} className={CONTRATO_CHIP}>
                          {k}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">{c.periodo ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {c.filas_cargadas}
                    {c.filas_error > 0 && <span className="ml-1 text-xs text-warn">{c.filas_error} err</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {c.estado === 'ok' ? <span className={BADGE_OK}>OK</span> : <span className={BADGE_WARN}>Parcial</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate">{c.cargado_en}</td>
                  {esAdmin && (
                    <td className="px-3 py-2.5 text-right">
                      <Button variant="ghost" size="xs" onClick={() => setCargaADeshacer(c)}>
                        Deshacer
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={esAdmin ? 8 : 7} className="px-3 py-3 text-sm text-slate">
                    Sin cargas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {cargaADeshacer && (
        <ConfirmarDeshacerModal
          carga={cargaADeshacer}
          onCancel={() => setCargaADeshacer(null)}
          onConfirmar={confirmarDeshacer}
          deshaciendo={deshacer.isPending}
        />
      )}
    </section>
  );
}
