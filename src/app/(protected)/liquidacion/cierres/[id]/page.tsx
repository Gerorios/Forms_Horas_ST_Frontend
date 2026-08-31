'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/button';
import { useCierre, descargarExcelCierre, mensajeDeError } from '@/lib/api/liquidacion';
import { CierreDetalleTabla } from '@/features/liquidacion/cierre-detalle-tabla';
import { formatMoney, nombreQuincena } from '@/features/liquidacion/formato';

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Página dedicada del detalle congelado de un cierre — antes era un dialog
 * con una tabla de 19 columnas que no entraba en pantalla (feedback QA
 * 2026-08-31): la cabecera del snapshot va en una tarjeta y la tabla usa el
 * mismo patrón de fila expandible que el detalle vivo de quincena. */
export default function CierreDetallePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const idValido = Number.isInteger(id) && id > 0;
  const { data, isLoading } = useCierre(idValido ? id : null);
  const [descargando, setDescargando] = useState<'excel' | 'b' | null>(null);

  async function descargar(porTantos: boolean) {
    setDescargando(porTantos ? 'b' : 'excel');
    try {
      await descargarExcelCierre(id, porTantos);
    } catch (e) {
      toast.error(mensajeDeError(e, 'No se pudo descargar el Excel'));
    } finally {
      setDescargando(null);
    }
  }

  if (!idValido) {
    return (
      <section className="space-y-5">
        <PageHeader eyebrow="Liquidador" title="Cierre inválido" />
        <p className="text-slate">
          Cierre inválido —{' '}
          <Link href="/liquidacion/cierres" className="underline">
            volvé a la lista de cierres
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Liquidador"
        title={data ? `${nombreQuincena(data.quincena, data.mes, data.anio)} — v${data.version}` : 'Detalle del cierre'}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={!data || descargando === 'excel'} onClick={() => descargar(false)}>
              {descargando === 'excel' ? 'Descargando…' : 'Excel'}
            </Button>
            <Button variant="secondary" size="sm" disabled={!data || descargando === 'b'} onClick={() => descargar(true)}>
              {descargando === 'b' ? 'Descargando…' : 'Por tantos B'}
            </Button>
          </div>
        }
      />

      <p className="text-sm">
        <Link href="/liquidacion/cierres" className="text-slate underline hover:text-ink">
          ← Volver a cierres
        </Link>
      </p>

      {isLoading || !data ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <>
          <div className="rounded-xl border border-line bg-surface p-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate">Cerrado por</dt>
                <dd className="text-sm text-ink">{data.cerradoPor.nombre}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate">Fecha</dt>
                <dd className="text-sm text-ink">{formatFechaHora(data.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate">Empleados</dt>
                <dd className="text-sm tabular-nums text-ink">{data.totales.empleados}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate">Total Norte / Sur</dt>
                <dd className="text-sm tabular-nums text-ink">
                  {formatMoney(data.totales.norte)} / {formatMoney(data.totales.sur)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate">Total</dt>
                <dd className="text-sm font-medium tabular-nums text-ink">{formatMoney(data.totales.total)}</dd>
              </div>
            </dl>
            {data.nota && (
              <p className="mt-3 text-sm italic text-slate">
                Nota: <span>{data.nota}</span>
              </p>
            )}
            {data.salvedades.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-warn">
                  Salvedades del cierre
                </p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-ink">
                  {data.salvedades.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="text-xs text-slate">
            Tabla congelada al momento del cierre, solo lectura — tocá una fila para ver el resto de los datos.
          </p>

          <CierreDetalleTabla filas={data.detalle} />
        </>
      )}
    </section>
  );
}
