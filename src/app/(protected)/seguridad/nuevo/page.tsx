'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { ReporteForm } from '@/features/seguridad/reporte-form';
import { TIPO_LABEL } from '@/features/seguridad/tipos';
import type { TipoReporte } from '@/lib/api/seguridad';

function esTipo(v: string | null): v is TipoReporte {
  return v != null && v in TIPO_LABEL;
}

/** `?tipo=inspeccion` (u otro tipo) llega preseleccionado; el formulario lo
 * descarta si este usuario no puede usarlo. */
function Formulario() {
  const router = useRouter();
  const tipo = useSearchParams().get('tipo');
  // Al terminar, Mis reportes resalta el recién enviado como recibo.
  return (
    <ReporteForm
      tipoInicial={esTipo(tipo) ? tipo : undefined}
      onListo={(id) => router.push(id != null ? `/seguridad?nuevo=${id}` : '/seguridad')}
    />
  );
}

/** Nuevo Reporte de Seguridad: lo usa cualquier rol, pensado para el celular. */
export default function NuevoReportePage() {
  return (
    <div className="space-y-5">
      <PageHeader area="seguridad" title="Nuevo reporte" />
      {/* useSearchParams necesita un Suspense para el prerender de Next. */}
      <Suspense>
        <Formulario />
      </Suspense>
    </div>
  );
}
