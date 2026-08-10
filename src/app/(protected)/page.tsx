'use client';

import Link from 'next/link';
import { useSession } from '@/lib/auth/session';
import { navForRole } from '@/components/layout/nav';
import { PageHeader } from '@/components/page-header';

const DESCRIPCION: Record<string, string> = {
  '/reporte': 'Cargar las horas trabajadas del día por operario, tarea y contrato.',
  '/mis-registros': 'Consultar tus horas registradas, por quincena.',
  '/combustible': 'Registrar y consultar cargas de combustible con foto del ticket. Módulo en construcción.',
  '/aprobaciones': 'Revisar y aprobar las horas pendientes de tus contratos.',
  '/control-general': 'Tablero de la quincena: horas totales, histórico, ranking, detalle diario y empleados sin carga.',
  '/novedades': 'Cargar y ver novedades: ausencias, accidentes, francos.',
  '/ausencias': 'Aprobar o rechazar las ausencias que requieren Higiene y Seguridad.',
  '/admin': 'Administrar catálogos, usuarios y contratos.',
  '/liquidacion': 'Total a cobrar por empleado y quincena: horas, categoría, extras y plus.',
  '/km-por-tantos': 'Cargar los km relevados de cada quincena para el personal "por tantos".',
};

export default function HomePage() {
  const { perfil } = useSession();
  if (!perfil) return null;

  const items = navForRole(perfil);
  const nombre = perfil.empleado.apellido_nombre;

  return (
    <section className="space-y-6">
      <PageHeader title={`Hola, ${nombre}`} />

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-xl border border-line bg-surface p-5 transition hover:border-brand hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-base font-semibold text-ink">{item.label}</span>
              <span className="text-slate transition group-hover:translate-x-0.5 group-hover:text-brand-deep">
                →
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate">{DESCRIPCION[item.href] ?? ''}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
