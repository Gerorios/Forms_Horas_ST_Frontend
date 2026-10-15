'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { BlockSkeleton } from '@/components/skeleton';
import { useSession } from '@/lib/auth/session';
import { useReporte } from '@/lib/api/seguridad';
import { ReporteForm } from '@/features/seguridad/reporte-form';
import { DetalleReporte } from '@/features/seguridad/detalle-reporte';
import { ErrorCarga } from '@/features/seguridad/error-carga';
import { FOCO_VISIBLE } from '@/features/seguridad/tipos';

/** 403/404: el reporte no existe o no es tuyo. Cualquier otro error es de
 * conexión y se puede reintentar. */
function noEncontrado(error: unknown): boolean {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return status === 403 || status === 404;
}

/** Un reporte propio: si está pendiente, el autor lo edita; si no, lo ve. */
export default function ReportePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const idValido = Number.isInteger(id) && id > 0;
  const router = useRouter();
  const { perfil } = useSession();
  const { data: reporte, isLoading, isError, error, refetch } = useReporte(idValido ? id : null);

  const editable = reporte != null && reporte.estado === 'pendiente' && reporte.autor.cuil === perfil?.cuil;

  return (
    <div className="space-y-5">
      <PageHeader
        area="seguridad"
        title={editable ? 'Editar reporte' : 'Reporte'}
        action={
          <Link href="/seguridad" className={`inline-flex min-h-11 items-center text-sm font-medium text-brand-deep hover:underline ${FOCO_VISIBLE}`}>
            Volver a mis reportes
          </Link>
        }
      />
      {!idValido || (isError && noEncontrado(error)) ? (
        <p className="mx-auto max-w-xl text-sm text-slate">No se encontró el reporte, o no es tuyo.</p>
      ) : isError ? (
        <div className="mx-auto max-w-xl">
          <ErrorCarga que="el reporte" onReintentar={() => void refetch()} />
        </div>
      ) : isLoading || !reporte ? (
        <div className="mx-auto max-w-xl rounded-xl border border-line bg-surface p-4">
          <BlockSkeleton lines={6} />
        </div>
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
