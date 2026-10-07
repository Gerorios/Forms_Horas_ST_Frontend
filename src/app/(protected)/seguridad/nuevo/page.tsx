'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { ReporteForm } from '@/features/seguridad/reporte-form';

/** Nuevo Reporte de Seguridad: lo usa cualquier rol, pensado para el celular. */
export default function NuevoReportePage() {
  const router = useRouter();
  return (
    <div className="space-y-5">
      <PageHeader area="seguridad" title="Nuevo reporte" />
      <ReporteForm onListo={() => router.push('/seguridad')} />
    </div>
  );
}
