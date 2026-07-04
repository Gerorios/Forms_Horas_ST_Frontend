'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { PillActivo } from '@/features/admin/pill-activo';
import { UsuarioForm } from '@/features/admin/usuario-form';
import { useUsuariosAdmin, useEditarUsuario } from '@/lib/api/admin';

export default function UsuariosAdminPage() {
  const { data, isLoading } = useUsuariosAdmin();
  const editar = useEditarUsuario();
  const [modo, setModo] = useState<null | 'individual'>(null);

  function cambiarActivo(cuil: string, activo: boolean) {
    toast.promise(editar.mutateAsync({ cuil, activo }), {
      loading: 'Actualizando…',
      success: 'Usuario actualizado',
      error: 'No se pudo actualizar',
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Admin"
        title="Usuarios"
        action={
          <button
            type="button"
            onClick={() => setModo((m) => (m === 'individual' ? null : 'individual'))}
            className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95"
          >
            {modo === 'individual' ? 'Cerrar' : 'Nuevo usuario'}
          </button>
        }
      />

      {modo === 'individual' && <UsuarioForm onCreado={() => setModo(null)} />}

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-4 py-2.5 font-medium">Empleado</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Rol</th>
                <th className="px-4 py-2.5 font-medium">Contratos</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((u) => (
                <tr key={u.cuil} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 text-ink">{u.empleado.apellido_nombre}</td>
                  <td className="px-4 py-2.5 text-slate">{u.email}</td>
                  <td className="px-4 py-2.5 text-ink">{u.rol.nombre}</td>
                  <td className="px-4 py-2.5 text-slate">{u.contratosHabilitados.map((c) => c.contrato.codigo).join(', ') || '—'}</td>
                  <td className="px-4 py-2.5">
                    <PillActivo activo={u.activo} disabled={editar.isPending} onToggle={() => cambiarActivo(u.cuil, !u.activo)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
