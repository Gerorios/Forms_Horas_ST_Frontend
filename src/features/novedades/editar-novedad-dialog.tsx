'use client';

import { useMemo, useState } from 'react';
import { useTiposNovedad } from '@/lib/api/novedades';
import { OperariosSelect } from '@/features/reporte/operarios-select';
import { AdjuntoInput } from '@/features/novedades/adjunto-input';
import { Button } from '@/components/button';
import type { EmpleadoBusqueda, Novedad } from '@/types/domain';

/** Modal de edición de una novedad (PATCH /novedades/:id, Admin only) — mismo
 * patrón de modal que EditarCargaDialog (combustible/detalle-carga.tsx):
 * FormData armado acá, mutación la maneja quien renderiza. */
export function EditarNovedadDialog({
  novedad,
  onCancel,
  onGuardar,
  guardando,
}: {
  novedad: Novedad;
  onCancel: () => void;
  onGuardar: (form: FormData) => void;
  guardando: boolean;
}) {
  const { data: tiposCatalogo } = useTiposNovedad();

  // El listado no trae legajo/cargo del operario (no hacen falta acá, solo el
  // nombre para mostrarlo preseleccionado en el buscador).
  const operarioOriginal: EmpleadoBusqueda = useMemo(
    () => ({
      cuil: novedad.operarioCuil,
      apellido_nombre: novedad.operario.apellido_nombre,
      legajo: 0,
      cargo: '',
    }),
    [novedad],
  );
  const [operario, setOperario] = useState<EmpleadoBusqueda[]>([operarioOriginal]);
  const [tipoNovedadId, setTipoNovedadId] = useState<number>(novedad.tipoNovedadId);
  const [fechaInicio, setFechaInicio] = useState(novedad.fechaInicio.slice(0, 10));
  const [fechaFin, setFechaFin] = useState(novedad.fechaFin ? novedad.fechaFin.slice(0, 10) : '');
  const [justificacion, setJustificacion] = useState(novedad.justificacionTexto ?? '');
  const [adjunto, setAdjunto] = useState<File | null>(null);

  const tipos = tiposCatalogo ?? [];
  const valido = operario.length === 1 && fechaInicio !== '';

  function guardar() {
    if (!valido) return;
    const form = new FormData();
    form.append('operarioCuil', operario[0].cuil);
    form.append('tipoNovedadId', String(tipoNovedadId));
    form.append('fechaInicio', fechaInicio);
    // fechaFin vacío no se manda: @IsDateString() del backend rechaza '' con
    // 400 (@IsOptional() solo salta la validación con undefined/null, no con
    // string vacío) — omitir el campo deja la fechaFin existente sin tocar.
    if (fechaFin) form.append('fechaFin', fechaFin);
    form.append('justificacionTexto', justificacion);
    if (adjunto) form.append('adjunto', adjunto, adjunto.name);
    onGuardar(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-lg">
        <h3 className="font-display font-semibold text-ink">Editar novedad</h3>

        <div className="space-y-1">
          <span className="text-sm font-medium text-ink">Operario</span>
          <OperariosSelect value={operario} onChange={(v) => setOperario(v.slice(-1))} />
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Tipo
          <select
            aria-label="Tipo"
            value={tipoNovedadId}
            onChange={(e) => setTipoNovedadId(Number(e.target.value))}
            className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Fecha inicio
            <input
              type="date"
              aria-label="Fecha inicio"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Fecha fin (opcional)
            <input
              type="date"
              aria-label="Fecha fin"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Justificación (opcional)
          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            rows={2}
          />
        </label>

        <AdjuntoInput label="Reemplazar certificado (opcional)" onArchivo={setAdjunto} />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!valido || guardando} onClick={guardar}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
