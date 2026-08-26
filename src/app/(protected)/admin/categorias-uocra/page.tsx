'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { useCategoriasUocra, useCrearCategoriaUocra, useToggleCategoriaUocra, mensajeDeError } from '@/lib/api/liquidacion';
import { Button } from '@/components/button';

/** ABM del catálogo de categorías UOCRA. Vivía en Liquidación; se movió a
 * Admin (decisión 2026-08-12): el Liquidador usa las categorías (perfiles,
 * tarifas) pero no administra el catálogo. */
export default function CategoriasUocraAdminPage() {
  const { data: categorias, isLoading } = useCategoriasUocra();
  const crearCategoria = useCrearCategoriaUocra();
  const toggleCategoria = useToggleCategoriaUocra();

  const [nombre, setNombre] = useState('');

  function agregarCategoria() {
    if (!nombre.trim()) return;
    toast.promise(crearCategoria.mutateAsync({ nombre: nombre.trim() }), {
      loading: 'Guardando…',
      success: 'Categoría creada',
      error: (e) => mensajeDeError(e, 'No se pudo crear la categoría'),
    });
    setNombre('');
  }

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Admin" title="Categorías UOCRA" />
      <p className="text-sm text-slate">
        Solo el catálogo de categorías. Los precios los carga el Liquidador desde{' '}
        <span className="font-medium text-ink">Liquidación → Tarifas</span>, en la ronda mensual.
      </p>

      <div className="flex gap-2">
        <input
          aria-label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nueva categoría"
          className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <Button variant="primary" disabled={crearCategoria.isPending} onClick={agregarCategoria}>
          Agregar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-line bg-surface divide-y divide-line">
          {(categorias ?? []).map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className={c.activo ? 'text-ink' : 'text-slate line-through'}>{c.nombre}</span>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => toggleCategoria.mutate({ id: c.id, activo: !c.activo })}
              >
                {c.activo ? 'Desactivar' : 'Activar'}
              </Button>
            </li>
          ))}
          {(categorias ?? []).length === 0 && <li className="px-4 py-2.5 text-sm text-slate">Sin categorías.</li>}
        </ul>
      )}
    </section>
  );
}
