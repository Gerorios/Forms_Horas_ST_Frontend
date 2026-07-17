export function CargandoModal({ texto = 'Cargando reporte…' }: { texto?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-6 py-5 shadow-lg">
        <span
          role="status"
          aria-label="Cargando"
          className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent"
        />
        <span className="text-sm font-medium text-ink">{texto}</span>
      </div>
    </div>
  );
}
