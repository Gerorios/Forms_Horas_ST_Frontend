'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { useCategoriasUocra, useCrearCategoriaUocra, useToggleCategoriaUocra } from '@/lib/api/liquidacion';

export default function CategoriasUocraPage() {
  const { data: categorias, isLoading } = useCategoriasUocra();
  const crearCategoria = useCrearCategoriaUocra();
  const toggleCategoria = useToggleCategoriaUocra();

  const [nombre, setNombre] = useState('');

  function agregarCategoria() {
    if (!nombre.trim()) return;
    toast.promise(crearCategoria.mutateAsync({ nombre: nombre.trim() }), {
      loading: 'Guardando…',
      success: 'Categoría creada',
      error: 'No se pudo crear',
    });
    setNombre('');
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Categorías UOCRA" />
      <p className="text-sm text-slate">
        Solo el catálogo de categorías. Los precios se cargan desde{' '}
        <span className="font-medium text-ink">Tarifas</span>, en la ronda mensual.
      </p>

      <div className="flex gap-2">
        <input
          aria-label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nueva categoría"
          className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="button"
          disabled={crearCategoria.isPending}
          onClick={agregarCategoria}
          className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
        >
          Agregar
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-line bg-surface divide-y divide-line">
          {(categorias ?? []).map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className={c.activo ? 'text-ink' : 'text-slate line-through'}>{c.nombre}</span>
              <button
                type="button"
                onClick={() => toggleCategoria.mutate({ id: c.id, activo: !c.activo })}
                className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-accent/50"
              >
                {c.activo ? 'Desactivar' : 'Activar'}
              </button>
            </li>
          ))}
          {(categorias ?? []).length === 0 && <li className="px-4 py-2.5 text-sm text-slate">Sin categorías.</li>}
        </ul>
      )}
    </section>
  );
}
