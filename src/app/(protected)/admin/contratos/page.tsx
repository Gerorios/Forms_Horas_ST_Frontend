'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { ContratoEditRow } from '@/features/admin/contrato-edit-row';
import { PillActivo } from '@/features/admin/pill-activo';
import { useContratosAdmin, useCrearContrato, useEditarContrato, useUsuariosAdmin } from '@/lib/api/admin';
import { Button } from '@/components/button';

export default function ContratosAdminPage() {
  const { data, isLoading } = useContratosAdmin();
  const { data: usuarios } = useUsuariosAdmin();
  const crear = useCrearContrato();
  const editar = useEditarContrato();
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');

  const jefes = (usuarios ?? []).filter((u) => u.rol.nombre === 'JefeContrato');

  function agregar() {
    if (!codigo.trim() || !nombre.trim()) return;
    toast.promise(crear.mutateAsync({ codigo: codigo.trim(), nombre: nombre.trim() }), {
      loading: 'Guardando…',
      success: 'Contrato creado',
      error: 'No se pudo crear',
    });
    setCodigo('');
    setNombre('');
  }

  function cambiarActivo(id: number, activo: boolean) {
    toast.promise(editar.mutateAsync({ id, activo }), {
      loading: 'Actualizando…',
      success: 'Contrato actualizado',
      error: 'No se pudo actualizar',
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Admin" title="Contratos" />
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Código"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Código (ej. K5)"
          className="w-32 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <input
          aria-label="Nombre del contrato"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del contrato"
          className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <Button variant="primary" disabled={crear.isPending} onClick={agregar}>
          Agregar
        </Button>
      </div>
      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface divide-y divide-line">
          {(data ?? []).map((c) => (
            <ContratoEditRow
              key={c.id}
              contrato={c}
              jefes={jefes}
              pill={
                <PillActivo
                  activo={c.activo}
                  disabled={editar.isPending}
                  onToggle={() => cambiarActivo(c.id, !c.activo)}
                />
              }
            />
          ))}
          {(data ?? []).length === 0 && <div className="px-4 py-2.5 text-sm text-slate">Sin contratos.</div>}
        </div>
      )}
    </section>
  );
}
