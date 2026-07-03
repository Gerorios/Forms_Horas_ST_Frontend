'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useCrearNovedad, useTiposNovedad } from '@/lib/api/novedades';
import { OperariosSelect } from '@/features/reporte/operarios-select';
import type { EmpleadoBusqueda } from '@/types/domain';

export function NuevaNovedadForm({ onCreada }: { onCreada: () => void }) {
  const { data: tipos } = useTiposNovedad();
  const crear = useCrearNovedad();
  const [operario, setOperario] = useState<EmpleadoBusqueda[]>([]);
  const [tipoNovedadId, setTipoNovedadId] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [justificacion, setJustificacion] = useState('');

  const puede = operario.length === 1 && tipoNovedadId != null && fechaInicio !== '';

  async function enviar() {
    if (!puede || tipoNovedadId == null) return;
    const promesa = crear.mutateAsync({
      operarioCuil: operario[0].cuil,
      tipoNovedadId,
      fechaInicio,
      fechaFin: fechaFin || undefined,
      justificacionTexto: justificacion || undefined,
    });
    toast.promise(promesa, {
      loading: 'Guardando novedad…',
      success: 'Novedad cargada',
      error: 'No se pudo cargar la novedad',
    });
    try {
      await promesa;
      setOperario([]);
      setTipoNovedadId(null);
      setFechaInicio('');
      setFechaFin('');
      setJustificacion('');
      onCreada();
    } catch {
      // el toast.promise ya avisó el error
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-5">
      <h2 className="font-medium text-ink">Nueva novedad</h2>
      <div className="space-y-1">
        <span className="text-sm font-medium text-ink">Operario</span>
        <OperariosSelect value={operario} onChange={(v) => setOperario(v.slice(-1))} />
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        Tipo
        <select
          aria-label="Tipo"
          value={tipoNovedadId ?? ''}
          onChange={(e) => setTipoNovedadId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        >
          <option value="">—</option>
          {(tipos ?? []).map((t) => (
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
      <button
        type="button"
        disabled={!puede || crear.isPending}
        onClick={enviar}
        className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
      >
        {crear.isPending ? 'Guardando…' : 'Cargar novedad'}
      </button>
    </div>
  );
}
