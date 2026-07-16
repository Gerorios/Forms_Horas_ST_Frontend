'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { AltaMasiva } from '@/features/admin/alta-masiva';
import { PillActivo } from '@/features/admin/pill-activo';
import { ResetearPasswordDialog } from '@/features/admin/resetear-password-dialog';
import { UsuarioEditRow } from '@/features/admin/usuario-edit-row';
import { UsuarioForm } from '@/features/admin/usuario-form';
import { useUsuariosAdmin, useEditarUsuario, useRoles, useResetearPassword, type UsuarioAdmin } from '@/lib/api/admin';

function normalizar(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export default function UsuariosAdminPage() {
  const { data, isLoading } = useUsuariosAdmin();
  const { data: roles } = useRoles();
  const editar = useEditarUsuario();
  const resetear = useResetearPassword();
  const [reseteando, setReseteando] = useState<UsuarioAdmin | null>(null);
  const [modo, setModo] = useState<null | 'individual' | 'masiva'>(null);
  const [nombre, setNombre] = useState('');
  const [rolesFiltro, setRolesFiltro] = useState<number[]>([]);

  function cambiarActivo(cuil: string, activo: boolean) {
    toast.promise(editar.mutateAsync({ cuil, activo }), {
      loading: 'Actualizando…',
      success: 'Usuario actualizado',
      error: 'No se pudo actualizar',
    });
  }

  async function confirmarReset() {
    if (!reseteando) return;
    const promesa = resetear.mutateAsync(reseteando.cuil);
    toast.promise(promesa, {
      loading: 'Reseteando…',
      success: 'Contraseña reseteada',
      error: 'No se pudo resetear',
    });
    setReseteando(null);
    try {
      await promesa;
    } catch {
      // toast.promise ya avisó
    }
  }

  function toggleRolFiltro(id: number) {
    setRolesFiltro((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const filtrados = useMemo(() => {
    const nombreNorm = normalizar(nombre.trim());
    return (data ?? []).filter((u) => {
      const matchNombre = nombreNorm === '' || normalizar(u.empleado.apellido_nombre).includes(nombreNorm);
      const matchRol = rolesFiltro.length === 0 || rolesFiltro.includes(u.rolId);
      return matchNombre && matchRol;
    });
  }, [data, nombre, rolesFiltro]);

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Admin"
        title="Usuarios"
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => setModo((m) => (m === 'masiva' ? null : 'masiva'))}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-slate transition hover:bg-accent/60">
              Alta masiva
            </button>
            <button type="button" onClick={() => setModo((m) => (m === 'individual' ? null : 'individual'))}
              className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95">
              {modo === 'individual' ? 'Cerrar' : 'Nuevo usuario'}
            </button>
          </div>
        }
      />

      {modo === 'individual' && <UsuarioForm onCreado={() => setModo(null)} />}
      {modo === 'masiva' && <AltaMasiva onListo={() => {}} />}

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink sm:max-w-xs">
          Buscar por nombre
          <input
            aria-label="Buscar por nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del empleado"
            className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <div>
          <p className="text-sm font-medium text-ink">Rol</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(roles ?? []).map((r) => {
              const on = rolesFiltro.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleRolFiltro(r.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    on ? 'border-brand bg-accent font-medium text-ink' : 'border-line text-slate hover:border-brand/50'
                  }`}
                >
                  {r.nombre}
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
                <th className="px-4 py-2.5 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <UsuarioEditRow
                  key={u.cuil}
                  usuario={u}
                  onResetearPassword={() => setReseteando(u)}
                  estado={
                    <PillActivo
                      activo={u.activo}
                      disabled={editar.isPending}
                      onToggle={() => cambiarActivo(u.cuil, !u.activo)}
                    />
                  }
                />
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-sm text-slate">
                    No hay usuarios que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {reseteando && (
        <ResetearPasswordDialog
          apellidoNombre={reseteando.empleado.apellido_nombre}
          cuil={reseteando.cuil}
          onConfirm={confirmarReset}
          onCancel={() => setReseteando(null)}
        />
      )}
    </section>
  );
}
