'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { BarraFiltros, FiltroBusqueda, MultiFiltro } from '@/components/ui/barra-filtros';
import { opcionesFacetadas, contieneTexto } from '@/lib/facetado';
import { AltaMasiva } from '@/features/admin/alta-masiva';
import { PillActivo } from '@/features/admin/pill-activo';
import { ResetearPasswordDialog } from '@/features/admin/resetear-password-dialog';
import { UsuarioEditRow } from '@/features/admin/usuario-edit-row';
import { UsuarioForm } from '@/features/admin/usuario-form';
import { useUsuariosAdmin, useEditarUsuario, useRoles, useResetearPassword, type UsuarioAdmin } from '@/lib/api/admin';

export default function UsuariosAdminPage() {
  const { data, isLoading } = useUsuariosAdmin();
  const { data: roles } = useRoles();
  const editar = useEditarUsuario();
  const resetear = useResetearPassword();
  const [reseteando, setReseteando] = useState<UsuarioAdmin | null>(null);
  const [modo, setModo] = useState<null | 'individual' | 'masiva'>(null);
  const [nombre, setNombre] = useState('');
  const [rolesFiltro, setRolesFiltro] = useState<string[]>([]);

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

  const filtrados = useMemo(() => {
    return (data ?? []).filter((u) => {
      const matchNombre = contieneTexto(u.empleado.apellido_nombre, nombre);
      const matchRol = rolesFiltro.length === 0 || rolesFiltro.includes(String(u.rolId));
      return matchNombre && matchRol;
    });
  }, [data, nombre, rolesFiltro]);

  // Facetado: cuenta cuántos usuarios (ya filtrados por nombre) tiene cada
  // rol, sobre el catálogo completo de roles (para que un rol sin usuarios
  // siga apareciendo tildable en 0).
  const opcionesRol = useMemo(() => {
    const candidatos = (data ?? []).filter((u) => contieneTexto(u.empleado.apellido_nombre, nombre));
    const counts = opcionesFacetadas(candidatos, (u) => String(u.rolId), rolesFiltro);
    const countPorId = new Map(counts.map((o) => [o.value, o.count]));
    return (roles ?? []).map((r) => ({
      value: String(r.id),
      label: r.nombre,
      count: countPorId.get(String(r.id)) ?? 0,
    }));
  }, [data, nombre, rolesFiltro, roles]);

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

      <BarraFiltros
        hayFiltros={nombre !== '' || rolesFiltro.length > 0}
        onLimpiar={() => {
          setNombre('');
          setRolesFiltro([]);
        }}
      >
        <FiltroBusqueda
          label="Buscar por nombre"
          ariaLabel="Buscar por nombre"
          value={nombre}
          onChange={setNombre}
          placeholder="Nombre del empleado"
        />
        <MultiFiltro
          label="Rol"
          ariaLabel="Filtrar por rol"
          opciones={opcionesRol}
          seleccionados={rolesFiltro}
          onChange={setRolesFiltro}
        />
      </BarraFiltros>

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
