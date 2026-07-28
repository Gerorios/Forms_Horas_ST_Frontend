'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import {
  useCategoriasUocra,
  useCrearCategoriaUocra,
  useToggleCategoriaUocra,
  useTarifasCategoria,
  useCrearTarifaCategoria,
} from '@/lib/api/liquidacion';

export default function CategoriasUocraPage() {
  const { data: categorias, isLoading } = useCategoriasUocra();
  const { data: tarifas } = useTarifasCategoria();
  const crearCategoria = useCrearCategoriaUocra();
  const toggleCategoria = useToggleCategoriaUocra();
  const crearTarifa = useCrearTarifaCategoria();

  const [nombre, setNombre] = useState('');
  const [tarifaAbierta, setTarifaAbierta] = useState<number | null>(null);
  const [vigenteDesde, setVigenteDesde] = useState('');
  const [importeHora, setImporteHora] = useState('');

  function agregarCategoria() {
    if (!nombre.trim()) return;
    toast.promise(crearCategoria.mutateAsync({ nombre: nombre.trim() }), {
      loading: 'Guardando…',
      success: 'Categoría creada',
      error: 'No se pudo crear',
    });
    setNombre('');
  }

  function agregarTarifa(categoriaUocraId: number) {
    if (!vigenteDesde || !importeHora) return;
    toast.promise(
      crearTarifa.mutateAsync({ categoriaUocraId, vigenteDesde, importeHora: Number(importeHora) }),
      { loading: 'Guardando…', success: 'Tarifa cargada', error: 'No se pudo cargar' },
    );
    setVigenteDesde('');
    setImporteHora('');
    setTarifaAbierta(null);
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Categorías UOCRA" />

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
        <ul className="space-y-2">
          {(categorias ?? []).map((c) => {
            const tarifasCat = (tarifas ?? []).filter((t) => t.categoriaUocraId === c.id);
            return (
              <li key={c.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${c.activo ? 'text-ink' : 'text-slate line-through'}`}>{c.nombre}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTarifaAbierta(tarifaAbierta === c.id ? null : c.id)}
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-accent/50"
                    >
                      + Tarifa
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCategoria.mutate({ id: c.id, activo: !c.activo })}
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-accent/50"
                    >
                      {c.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>

                {tarifaAbierta === c.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md bg-accent/30 p-3">
                    <label className="flex flex-col text-xs font-medium text-slate">
                      Vigente desde
                      <input
                        aria-label="Vigente desde"
                        type="date"
                        value={vigenteDesde}
                        onChange={(e) => setVigenteDesde(e.target.value)}
                        className="mt-1 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                      />
                    </label>
                    <label className="flex flex-col text-xs font-medium text-slate">
                      Importe por hora
                      <input
                        aria-label="Importe por hora"
                        type="number"
                        step="0.01"
                        value={importeHora}
                        onChange={(e) => setImporteHora(e.target.value)}
                        className="mt-1 w-32 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={crearTarifa.isPending}
                      onClick={() => agregarTarifa(c.id)}
                      className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
                    >
                      Guardar
                    </button>
                  </div>
                )}

                {tarifasCat.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-slate">
                    {tarifasCat.map((t) => (
                      <li key={t.id}>
                        Desde {t.vigenteDesde.slice(0, 10)}: <span className="tabular-nums text-ink">${t.importeHora}</span>/hora
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
          {(categorias ?? []).length === 0 && <li className="text-sm text-slate">Sin categorías.</li>}
        </ul>
      )}
    </section>
  );
}
