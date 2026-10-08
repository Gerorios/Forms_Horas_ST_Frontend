import type { EstadoReporte, FiltrosPanel, ReporteSeguridad, TipoReporte } from '@/lib/api/seguridad';

/**
 * Filtros del panel de HyS en la dirección de la página, para que sobrevivan
 * a recargar y se puedan compartir. Sin `estado` en la URL = Pendientes (la
 * bandeja); `estado=todos` = sin filtro.
 */
export function filtrosDeUrl(p: URLSearchParams): FiltrosPanel {
  const estado = p.get('estado');
  return {
    ...(estado === 'todos' ? {} : { estado: (estado as EstadoReporte) || 'pendiente' }),
    ...(p.get('tipo') ? { tipo: p.get('tipo') as TipoReporte } : {}),
    ...(p.get('desde') ? { desde: p.get('desde')! } : {}),
    ...(p.get('hasta') ? { hasta: p.get('hasta')! } : {}),
  };
}

export function urlDeFiltros(f: FiltrosPanel): string {
  const p = new URLSearchParams();
  if (!f.estado) p.set('estado', 'todos');
  else if (f.estado !== 'pendiente') p.set('estado', f.estado);
  if (f.tipo) p.set('tipo', f.tipo);
  if (f.desde) p.set('desde', f.desde);
  if (f.hasta) p.set('hasta', f.hasta);
  const q = p.toString();
  return q ? `?${q}` : '';
}

/** Los filtros con los que abre el panel (Pendientes, sin tipo ni fechas):
 * cualquier otra cosa muestra "Limpiar filtros". */
export function filtrosSonLosDeSiempre(f: FiltrosPanel): boolean {
  return f.estado === 'pendiente' && !f.tipo && !f.desde && !f.hasta;
}

/**
 * El siguiente pendiente después de `actualId` en el orden de la lista (si no
 * hay más abajo, el primero de arriba). Para que HyS califique de corrido sin
 * volver a buscar en la tabla.
 */
export function siguientePendiente(lista: Pick<ReporteSeguridad, 'id' | 'estado'>[], actualId: number): number | null {
  const i = lista.findIndex((r) => r.id === actualId);
  const despues = lista.slice(i + 1).find((r) => r.estado === 'pendiente' && r.id !== actualId);
  const antes = lista.slice(0, Math.max(i, 0)).find((r) => r.estado === 'pendiente' && r.id !== actualId);
  return (despues ?? antes)?.id ?? null;
}
