'use client';

import { PageHeader } from '@/components/page-header';
import { CatalogoSeguridadAdmin } from '@/features/seguridad/catalogo-seguridad-admin';

/** Catálogos de Autogestión de la Seguridad (ADR-027): los mantiene solo Admin
 * para que la clasificación no cambie sin control. */
export default function CatalogosSeguridadPage() {
  return (
    <div className="space-y-8">
      <PageHeader area="administracion" title="Catálogos de seguridad" />
      <CatalogoSeguridadAdmin
        catalogo="naturalezas"
        titulo="Naturalezas del riesgo"
        ayuda="Clasificación de los avisos de riesgo, incidentes e inspecciones. Una por reporte."
      />
      <CatalogoSeguridadAdmin
        catalogo="motivos"
        titulo="Motivos de paralización"
        ayuda="Por qué se detuvo una tarea; solo los usa la paralización de trabajos."
      />
    </div>
  );
}
