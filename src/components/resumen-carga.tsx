import type { GrupoLote } from '@/lib/agrupar';

export function ResumenCarga({ grupo }: { grupo: GrupoLote }) {
  const esCorreccion = grupo.filas.some((f) => f.loteIdOrigen);

  return (
    <div className="space-y-1.5 border-b border-line px-4 py-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-sm font-semibold text-ink">
          Carga del {grupo.fecha}
          {esCorreccion && (
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-brand-deep">
              Corrección de horas
            </span>
          )}
        </h2>
        <span className="text-sm tabular-nums text-ink">{grupo.totalHoras} hs totales</span>
      </div>
      <p className="text-xs text-slate">
        <span className="font-medium text-ink">Operarios:</span>{' '}
        {grupo.operarios.map((o) => o.apellido_nombre).join(', ')}
      </p>
      <p className="text-xs text-slate">
        <span className="font-medium text-ink">Vehículos:</span>{' '}
        {grupo.vehiculos.length > 0 ? grupo.vehiculos.map((v) => v.identificador).join(', ') : '—'}
      </p>
    </div>
  );
}
