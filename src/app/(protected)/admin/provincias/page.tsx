'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { ProvinciaEditRow } from '@/features/admin/provincia-edit-row';
import { useProvinciasAdmin, useCrearProvincia } from '@/lib/api/admin';

export default function ProvinciasAdminPage() {
  const { data, isLoading } = useProvinciasAdmin();
  const crear = useCrearProvincia();
  const [nombre, setNombre] = useState('');

  function agregar() {
    if (!nombre.trim()) return;
    toast.promise(crear.mutateAsync({ nombre: nombre.trim() }), {
      loading: 'Guardando…',
      success: 'Provincia creada',
      error: 'No se pudo crear',
    });
    setNombre('');
  }

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Admin" title="Provincias" />
      <div className="flex gap-2">
        <input
          aria-label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nueva provincia"
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
        <ul className="overflow-hidden rounded-xl border border-line bg-surface divide-y divide-line">
          {(data ?? []).map((p) => (
            <ProvinciaEditRow key={p.id} provincia={p} />
          ))}
          {(data ?? []).length === 0 && <li className="px-4 py-2.5 text-sm text-slate">Sin provincias.</li>}
        </ul>
      )}
    </section>
  );
}
