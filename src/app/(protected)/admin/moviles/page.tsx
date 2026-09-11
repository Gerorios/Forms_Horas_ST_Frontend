'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { PillActivo } from '@/features/admin/pill-activo';
import { MovilEditRow } from '@/features/admin/movil-edit-row';
import { useMovilesAdmin, useToggleMovil } from '@/lib/api/admin';
import { Button } from '@/components/button';
import { BarraFiltros, FiltroBusqueda } from '@/components/ui/barra-filtros';
import { Paginador, paginar } from '@/components/paginador';
import { CrearMovilDialog } from '@/features/admin/crear-movil-dialog';
import { coincideMovil } from '@/lib/moviles';

// Mismo tamaño de página que /novedades y /ausencias.
const POR_PAGINA = 20;

export default function MovilesAdminPage() {
  const { data, isLoading } = useMovilesAdmin();
  const toggle = useToggleMovil();
  const [creando, setCreando] = useState(false);
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

  function cambiarActivo(id: number, activo: boolean) {
    toast.promise(toggle.mutateAsync({ id, activo }), {
      loading: 'Actualizando…',
      success: 'Móvil actualizado',
      error: 'No se pudo actualizar',
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Admin"
        title="Móviles"
        action={
          <Button variant="primary" onClick={() => setCreando(true)}>
            + Añadir móvil
          </Button>
        }
      />

      {creando && <CrearMovilDialog onClose={() => setCreando(false)} />}

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
