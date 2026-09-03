import { Button } from '@/components/button';

/** Pie de paginación de la casa (mismo patrón que Ítems y Control general):
 * "Página X de Y · N cosas" + Anterior / Siguiente. Paginación en el
 * cliente: el llamador corta la lista con `paginar()` y muestra esto debajo.
 * No se renderiza si todo entra en una página. */
export function Paginador({
  pagina,
  totalPaginas,
  total,
  singular,
  plural,
  onChange,
}: {
  pagina: number;
  totalPaginas: number;
  total: number;
  singular: string;
  plural: string;
  onChange: (pagina: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-slate" aria-label="Paginación">
      <span>
        Página {pagina} de {totalPaginas} · {total} {total === 1 ? singular : plural}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={pagina <= 1} onClick={() => onChange(Math.max(1, pagina - 1))}>
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={pagina >= totalPaginas}
          onClick={() => onChange(Math.min(totalPaginas, pagina + 1))}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}

/** Corta `items` para la página pedida y devuelve también la página
 * "segura" (si la lista se achicó y la página pedida quedó fuera de rango,
 * se muestra la última válida en vez de una página vacía). */
export function paginar<T>(items: T[], pagina: number, porPagina: number) {
  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));
  const paginaSegura = Math.min(Math.max(1, pagina), totalPaginas);
  return {
    enPagina: items.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina),
    paginaSegura,
    totalPaginas,
  };
}
