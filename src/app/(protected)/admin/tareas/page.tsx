'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { PillActivo } from '@/features/admin/pill-activo';
import { TareaEditRow } from '@/features/admin/tarea-edit-row';
import { useContratosAdmin, useTareasAdmin, useCrearTarea, useToggleTarea } from '@/lib/api/admin';
import { Button } from '@/components/button';

export default function TareasAdminPage() {
  const { data: contratos } = useContratosAdmin();
  const [contratoId, setContratoId] = useState<number | null>(null);
  const { data: tareas, isLoading } = useTareasAdmin(contratoId);
  const crear = useCrearTarea();
  const toggle = useToggleTarea();
  const [nombre, setNombre] = useState('');

  function agregar() {
    if (contratoId == null || !nombre.trim()) return;
    toast.promise(crear.mutateAsync({ contratoId, nombre: nombre.trim() }), {
      loading: 'Guardando…',
      success: 'Tarea creada',
      error: 'No se pudo crear',
    });
    setNombre('');
  }

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Admin" title="Tareas" />
      <label className="flex flex-col text-sm font-medium text-ink sm:max-w-xs">
        Contrato
        <select
          aria-label="Contrato"
          value={contratoId ?? ''}
          onChange={(e) => setContratoId(e.target.value ? Number(e.target.value) : null)}
          className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Elegí un contrato…</option>
          {(contratos ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
          ))}
        </select>
      </label>

      {contratoId != null && (
        <>
          <div className="flex gap-2">
            <input
              aria-label="Tarea"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nueva tarea (ej. Excavación)"
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
              {(tareas ?? []).map((t) => (
                <TareaEditRow
                  key={t.id}
                  tarea={t}
                  contratos={contratos ?? []}
                  pill={
                    <PillActivo
                      activo={t.activo}
                      disabled={toggle.isPending}
                      onToggle={() =>
                        toast.promise(toggle.mutateAsync({ id: t.id, activo: !t.activo }), {
                          loading: 'Actualizando…', success: 'Tarea actualizada', error: 'No se pudo actualizar',
                        })
                      }
                    />
                  }
                />
              ))}
              {(tareas ?? []).length === 0 && <div className="px-4 py-2.5 text-sm text-slate">Este contrato no tiene tareas.</div>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
