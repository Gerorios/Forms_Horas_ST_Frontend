'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';
import { ADMIN_NAV } from '@/features/admin/admin-nav';
import { SubNav } from '@/components/sub-nav';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { perfil } = useSession();
  const router = useRouter();
  const esAdmin = perfil?.rol?.nombre === 'Admin';

  useEffect(() => {
    if (perfil && !esAdmin) router.replace('/403');
  }, [perfil, esAdmin, router]);

  if (!perfil || !esAdmin) return null;

  return (
    <div className="space-y-5">
      <SubNav items={ADMIN_NAV} ariaLabel="Secciones de administración" />
      {children}
    </div>
  );
}
