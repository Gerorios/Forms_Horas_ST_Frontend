'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { useSession } from '@/lib/auth/session';
import { useReporte } from '@/lib/api/seguridad';
import { ReporteForm } from '@/features/seguridad/reporte-form';
import { DetalleReporte } from '@/features/seguridad/detalle-reporte';

/** Un reporte propio: si está pendiente, el autor lo edita; si no, lo ve. */
export default function ReportePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const idValido = Number.isInteger(id) && id > 0;
  const router = useRouter();
  const { perfil } = useSession();
  const { data: reporte, isLoading, isError } = useReporte(idValido ? id : null);

  const editable = reporte != null && reporte.estado === 'pendiente' && reporte.autor.cuil === perfil?.cuil;

  return (
    <div className="space-y-5">
      <PageHeader
        area="seguridad"
        title={editable ? 'Editar reporte' : 'Reporte'}
        action={
          <Link href="/seguridad" className="text-sm font-medium text-brand-deep hover:underline">
            Volver a mis reportes
          </Link>
        }
      />
      {!idValido || isError ? (
        <p className="text-sm text-slate">No se encontró el reporte.</p>
      ) : isLoading || !reporte ? (
        <p className="text-sm text-slate">Cargando…</p>
      ) : editable ? (
        <ReporteForm inicial={reporte} onListo={() => router.push('/seguridad')} />
      ) : (
        <div className="mx-auto max-w-xl rounded-xl border border-line bg-surface p-4">
          <DetalleReporte reporte={reporte} />
        </div>
      )}
    </div>
  );
}
