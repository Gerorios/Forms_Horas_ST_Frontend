'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { PillActivo } from '@/features/admin/pill-activo';
import { useContratosAdmin, useCrearContrato, useEditarContrato } from '@/lib/api/admin';

export default function ContratosAdminPage() {
  const { data, isLoading } = useContratosAdmin();
  const crear = useCrearContrato();
  const editar = useEditarContrato();
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');

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
          aria-label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del contrato"
          className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="button"
          disabled={crear.isPending}
          onClick={agregar}
          className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
        >
          Agregar
        </button>
      </div>
      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface divide-y divide-line">
          {(data ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="font-medium text-ink">{c.codigo}</span>
              <span className="text-slate">{c.nombre}</span>
              {c.jefeContrato && <span className="text-xs text-slate">jefe: {c.jefeContrato.email}</span>}
              <span className="ml-auto">
                <PillActivo activo={c.activo} disabled={editar.isPending} onToggle={() => cambiarActivo(c.id, !c.activo)} />
              </span>
            </div>
          ))}
          {(data ?? []).length === 0 && <div className="px-4 py-2.5 text-sm text-slate">Sin contratos.</div>}
        </div>
      )}
    </section>
  );
}
