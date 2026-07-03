'use client';

import Link from 'next/link';
import { useSession } from '@/lib/auth/session';
import { navForRole } from '@/components/layout/nav';

export default function HomePage() {
  const { perfil } = useSession();
  if (!perfil) return null;

  const items = navForRole(perfil.rol.nombre);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral">
          Hola, {perfil.empleado.apellido_nombre}
        </h1>
        <p className="text-sm text-neutral/70">Rol: {perfil.rol.nombre}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-neutral/20 p-4 hover:border-brand"
          >
            <span className="font-medium text-neutral">{item.label}</span>
            <p className="text-xs text-neutral/60">En construcción</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
