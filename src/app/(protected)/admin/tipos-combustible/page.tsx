'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { PillActivo } from '@/features/admin/pill-activo';
import { TipoCombustibleEditRow } from '@/features/admin/tipo-combustible-edit-row';
import { useAdminTiposCombustible, useCrearTipoCombustible, useToggleTipoCombustible } from '@/lib/api/admin';

export default function TiposCombustibleAdminPage() {
  const { data, isLoading } = useAdminTiposCombustible();
  const crear = useCrearTipoCombustible();
  const toggle = useToggleTipoCombustible();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');

  function cerrarForm() {
    setMostrarForm(false);
    setNombre('');
  }

  function agregar() {
    if (!nombre.trim()) return;
    toast.promise(
      crear.mutateAsync({ nombre: nombre.trim() }),
      { loading: 'Guardando…', success: 'Tipo de combustible creado', error: 'No se pudo crear' },
    );
    cerrarForm();
  }

  function cambiarActivo(id: number, activo: boolean) {
    toast.promise(toggle.mutateAsync({ id, activo }), {
      loading: 'Actualizando…',
      success: 'Tipo de combustible actualizado',
      error: 'No se pudo actualizar',
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Admin"
        title="Tipos de combustible"
        action={
          !mostrarForm && (
            <button
              type="button"
              onClick={() => setMostrarForm(true)}
              className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95"
            >
              Nuevo tipo
            </button>
          )
        }
      />

      {mostrarForm && (
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre"
            className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <button
            type="button"
            disabled={crear.isPending || !nombre.trim()}
            onClick={agregar}
            className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
          >
            {crear.isPending ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={cerrarForm}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-slate transition hover:bg-accent/60"
          >
            Cancelar
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface divide-y divide-line">
          {(data ?? []).map((t) => (
            <TipoCombustibleEditRow
              key={t.id}
              tipo={t}
              pill={<PillActivo activo={t.activo ?? true} disabled={toggle.isPending} onToggle={() => cambiarActivo(t.id, !(t.activo ?? true))} />}
            />
          ))}
          {(data ?? []).length === 0 && <div className="px-4 py-2.5 text-sm text-slate">Sin tipos de combustible.</div>}
        </div>
      )}
    </section>
  );
}
