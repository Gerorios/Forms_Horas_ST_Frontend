'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { PillActivo } from '@/features/admin/pill-activo';
import { MovilEditRow } from '@/features/admin/movil-edit-row';
import { useMovilesAdmin, useCrearMovil, useToggleMovil } from '@/lib/api/admin';

export default function MovilesAdminPage() {
  const { data, isLoading } = useMovilesAdmin();
  const crear = useCrearMovil();
  const toggle = useToggleMovil();
  const [identificador, setIdentificador] = useState('');
  const [descripcion, setDescripcion] = useState('');

  function agregar() {
    if (!identificador.trim()) return;
    toast.promise(
      crear.mutateAsync({ identificador: identificador.trim(), descripcion: descripcion.trim() || undefined }),
      { loading: 'Guardando…', success: 'Móvil creado', error: 'No se pudo crear' },
    );
    setIdentificador('');
    setDescripcion('');
  }

  function cambiarActivo(id: number, activo: boolean) {
    toast.promise(toggle.mutateAsync({ id, activo }), {
      loading: 'Actualizando…',
      success: 'Móvil actualizado',
      error: 'No se pudo actualizar',
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Admin" title="Móviles" />
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Identificador"
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
          placeholder="Identificador (interno/patente)"
          className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <input
          aria-label="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción (opcional)"
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
          {(data ?? []).map((m) => (
            <MovilEditRow
              key={m.id}
              movil={m}
              pill={<PillActivo activo={m.activo} disabled={toggle.isPending} onToggle={() => cambiarActivo(m.id, !m.activo)} />}
            />
          ))}
          {(data ?? []).length === 0 && <div className="px-4 py-2.5 text-sm text-slate">Sin móviles.</div>}
        </div>
      )}
    </section>
  );
}
