'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { PillActivo } from '@/features/admin/pill-activo';
import { TipoNovedadEditRow } from '@/features/admin/tipo-novedad-edit-row';
import { useTiposNovedadAdmin, useCrearTipoNovedad, useToggleTipoNovedad } from '@/lib/api/admin';
import { Button } from '@/components/button';

export default function TiposNovedadAdminPage() {
  const { data, isLoading } = useTiposNovedadAdmin();
  const crear = useCrearTipoNovedad();
  const toggle = useToggleTipoNovedad();
  const [nombre, setNombre] = useState('');
  const [requiereHys, setRequiereHys] = useState(false);
  const [generaPlus, setGeneraPlus] = useState(false);

  function agregar() {
    if (!nombre.trim()) return;
    toast.promise(
      crear.mutateAsync({ nombre: nombre.trim(), requiereAprobacionHys: requiereHys, generaPlus }),
      { loading: 'Guardando…', success: 'Tipo creado', error: 'No se pudo crear' },
    );
    setNombre('');
    setRequiereHys(false);
    setGeneraPlus(false);
  }

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Admin" title="Tipos de novedad" />
      <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <input
          aria-label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre (ej. Ausencia)"
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <div className="flex flex-wrap gap-4 text-sm text-ink">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={requiereHys} onChange={(e) => setRequiereHys(e.target.checked)} />
            Requiere aprobación de HyS
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={generaPlus} onChange={(e) => setGeneraPlus(e.target.checked)} />
            Genera plus
          </label>
        </div>
        <Button variant="primary" disabled={crear.isPending} onClick={agregar}>
          Agregar tipo
        </Button>
      </div>
      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface divide-y divide-line">
          {(data ?? []).map((t) => (
            <TipoNovedadEditRow
              key={t.id}
              tipo={t}
              pill={
                <PillActivo
                  activo={t.activo}
                  disabled={toggle.isPending}
                  onToggle={() =>
                    toast.promise(toggle.mutateAsync({ id: t.id, activo: !t.activo }), {
                      loading: 'Actualizando…', success: 'Tipo actualizado', error: 'No se pudo actualizar',
                    })
                  }
                />
              }
            />
          ))}
          {(data ?? []).length === 0 && <div className="px-4 py-2.5 text-sm text-slate">Sin tipos de novedad.</div>}
        </div>
      )}
    </section>
  );
}
