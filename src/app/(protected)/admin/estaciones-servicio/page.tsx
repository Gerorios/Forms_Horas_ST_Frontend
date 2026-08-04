'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { PillActivo } from '@/features/admin/pill-activo';
import { EstacionEditRow } from '@/features/admin/estacion-edit-row';
import { useAdminEstacionesServicio, useCrearEstacionServicio, useToggleEstacionServicio } from '@/lib/api/admin';

export default function EstacionesServicioAdminPage() {
  const { data, isLoading } = useAdminEstacionesServicio();
  const crear = useCrearEstacionServicio();
  const toggle = useToggleEstacionServicio();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [localidad, setLocalidad] = useState('');

  function cerrarForm() {
    setMostrarForm(false);
    setNombre('');
    setLocalidad('');
  }

  function agregar() {
    if (!nombre.trim()) return;
    toast.promise(
      crear.mutateAsync({ nombre: nombre.trim(), localidad: localidad.trim() || undefined }),
      { loading: 'Guardando…', success: 'Estación creada', error: 'No se pudo crear' },
    );
    cerrarForm();
  }

  function cambiarActivo(id: number, activo: boolean) {
    toast.promise(toggle.mutateAsync({ id, activo }), {
      loading: 'Actualizando…',
      success: 'Estación actualizada',
      error: 'No se pudo actualizar',
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Admin"
        title="Estaciones de servicio"
        action={
          !mostrarForm && (
            <button
              type="button"
              onClick={() => setMostrarForm(true)}
              className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95"
            >
              Nueva estación
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
          <input
            aria-label="Localidad"
            value={localidad}
            onChange={(e) => setLocalidad(e.target.value)}
            placeholder="Localidad (opcional)"
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
          {(data ?? []).map((e) => (
            <EstacionEditRow
              key={e.id}
              estacion={e}
              pill={<PillActivo activo={e.activo ?? true} disabled={toggle.isPending} onToggle={() => cambiarActivo(e.id, !(e.activo ?? true))} />}
            />
          ))}
          {(data ?? []).length === 0 && <div className="px-4 py-2.5 text-sm text-slate">Sin estaciones de servicio.</div>}
        </div>
      )}
    </section>
  );
}
