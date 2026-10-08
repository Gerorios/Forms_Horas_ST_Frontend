'use client';

import { PageHeader } from '@/components/page-header';
import { CardsSkeleton } from '@/components/skeleton';
import { useLanzamientos } from '@/lib/api/lanzamientos';
import { ErrorCarga } from '@/features/seguridad/error-carga';
import { LanzamientoCard } from '@/features/admin/lanzamiento-card';

/**
 * Lanzamientos (ADR-028): los módulos nuevos salen primero en prueba interna
 * (Admin + piloto) y Admin los lanza para todos cuando están listos, sin
 * deploy. Los módulos que no figuran acá se ven como siempre.
 */
export default function LanzamientosPage() {
  const { data, isLoading, isError, isFetching, refetch } = useLanzamientos();
  return (
    <div className="space-y-5">
      <PageHeader area="administracion" title="Lanzamientos" />
      <p className="max-w-3xl text-sm text-slate">
        Un módulo nuevo sale primero en <strong className="text-ink">prueba interna</strong>: lo ven Admin y el piloto que
        elijas (roles enteros o personas sueltas). Cuando esté listo, lo lanzás para todos desde acá, sin deploy. Los cambios
        se ven cuando cada persona vuelve a entrar o recarga la página.
      </p>
      {isError ? (
        <ErrorCarga que="los lanzamientos" onReintentar={() => void refetch()} reintentando={isFetching} />
      ) : isLoading || !data ? (
        <CardsSkeleton count={1} />
      ) : data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-slate">
          No hay módulos en lanzamiento: todos se ven según el rol, como siempre.
        </p>
      ) : (
        data.map((l) => <LanzamientoCard key={`${l.modulo}-${l.actualizadoEn}`} l={l} />)
      )}
    </div>
  );
}
