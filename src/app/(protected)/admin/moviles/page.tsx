'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { PillActivo } from '@/features/admin/pill-activo';
import { MovilEditRow } from '@/features/admin/movil-edit-row';
import { useMovilesAdmin, useCrearMovil, useCrearMovilesMasivo, useToggleMovil } from '@/lib/api/admin';
import { Button } from '@/components/button';
import { BarraFiltros, FiltroBusqueda } from '@/components/ui/barra-filtros';
import { Paginador, paginar } from '@/components/paginador';
import { coincideMovil } from '@/lib/moviles';

// Mismo tamaño de página que /novedades y /ausencias.
const POR_PAGINA = 20;

/** Separa por salto de línea o coma (CSV en una fila o una lista, cualquiera
 * de las dos), recorta espacios y saca vacíos/duplicados. */
function parsearIdentificadores(texto: string): string[] {
  const partes = texto
    .split(/[\n,]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return [...new Set(partes)];
}

export default function MovilesAdminPage() {
  const { data, isLoading } = useMovilesAdmin();
  const crear = useCrearMovil();
  const crearMasivo = useCrearMovilesMasivo();
  const toggle = useToggleMovil();
  const [identificador, setIdentificador] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [listado, setListado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  /** Buscar vuelve a la página 1: quedarse en la 3 después de filtrar mostraba
   * una lista vacía sin explicación. Se envuelve el setter en vez de usar un
   * useEffect, que además dispara react-hooks/set-state-in-effect. */
  function buscar(v: string) {
    setBusqueda(v);
    setPagina(1);
  }

  const filtrados = useMemo(
    () => (data ?? []).filter((m) => coincideMovil(m, busqueda)),
    [data, busqueda],
  );
  // `paginar` devuelve la página "segura": si la lista se achicó y la página
  // actual quedó fuera de rango, muestra la última válida en vez de vacío.
  const { enPagina, paginaSegura, totalPaginas } = paginar(filtrados, pagina, POR_PAGINA);
  const noHayMoviles = (data ?? []).length === 0;

  function agregar() {
    if (!identificador.trim()) return;
    toast.promise(
      crear.mutateAsync({ identificador: identificador.trim(), descripcion: descripcion.trim() || undefined }),
      { loading: 'Guardando…', success: 'Móvil creado', error: 'No se pudo crear' },
    );
    setIdentificador('');
    setDescripcion('');
  }

  async function cargarListado() {
    const identificadores = parsearIdentificadores(listado);
    if (identificadores.length === 0) return;
    try {
      const { creados, omitidos } = await crearMasivo.mutateAsync(identificadores);
      toast.success(
        omitidos.length > 0
          ? `${creados.length} móvil(es) cargado(s), ${omitidos.length} ya existían (omitidos)`
          : `${creados.length} móvil(es) cargado(s)`,
      );
      setListado('');
    } catch {
      toast.error('No se pudo cargar el listado');
    }
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
        <Button variant="primary" disabled={crear.isPending} onClick={agregar}>
          Agregar
        </Button>
      </div>

      <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
        <p className="text-sm font-medium text-ink">Cargar listado (CSV o uno por línea)</p>
        <textarea
          aria-label="Listado de identificadores"
          rows={4}
          value={listado}
          onChange={(e) => setListado(e.target.value)}
          placeholder={'M-01\nM-02\nM-03  (o separados por coma: M-01, M-02, M-03)'}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            disabled={crearMasivo.isPending || parsearIdentificadores(listado).length === 0}
            onClick={cargarListado}
          >
            {crearMasivo.isPending ? 'Cargando…' : 'Cargar listado'}
          </Button>
          {listado.trim() !== '' && (
            <span className="text-xs text-slate">
              {parsearIdentificadores(listado).length} identificador(es) detectado(s) — se omiten los que ya existan.
            </span>
          )}
        </div>
      </div>

      <BarraFiltros hayFiltros={busqueda !== ''} onLimpiar={() => buscar('')}>
        <FiltroBusqueda
          label="Buscar"
          ariaLabel="Buscar móvil"
          value={busqueda}
          onChange={buscar}
          placeholder="Patente o descripción (ej. AA615NF, Hilux)"
        />
      </BarraFiltros>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface divide-y divide-line">
          {enPagina.map((m) => (
            <MovilEditRow
              key={m.id}
              movil={m}
              pill={<PillActivo activo={m.activo} disabled={toggle.isPending} onToggle={() => cambiarActivo(m.id, !m.activo)} />}
            />
          ))}
          {/* "Sin móviles" es que no hay ninguno cargado; si hay pero la
              búsqueda no pegó, conviene decir qué se buscó. */}
          {noHayMoviles && <div className="px-4 py-2.5 text-sm text-slate">Sin móviles.</div>}
          {!noHayMoviles && filtrados.length === 0 && (
            <div className="px-4 py-2.5 text-sm text-slate">
              Ningún móvil coincide con «{busqueda.trim()}»
            </div>
          )}
          <Paginador
            pagina={paginaSegura}
            totalPaginas={totalPaginas}
            total={filtrados.length}
            singular="móvil"
            plural="móviles"
            onChange={setPagina}
          />
        </div>
      )}
    </section>
  );
}
