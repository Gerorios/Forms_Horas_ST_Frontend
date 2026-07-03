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
    try {
      await crear.mutateAsync({
        operarioCuil: operario[0].cuil,
        tipoNovedadId,
        fechaInicio,
        fechaFin: fechaFin || undefined,
        justificacionTexto: justificacion || undefined,
      });
      toast.success('Novedad cargada');
      setOperario([]);
      setTipoNovedadId(null);
      setFechaInicio('');
      setFechaFin('');
      setJustificacion('');
      onCreada();
    } catch {
      toast.error('No se pudo cargar la novedad');
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral/20 p-4">
      <h2 className="font-medium text-neutral">Nueva novedad</h2>
      <div className="space-y-1">
        <span className="text-sm text-neutral">Operario</span>
        <OperariosSelect value={operario} onChange={(v) => setOperario(v.slice(-1))} />
      </div>
      <label className="flex flex-col text-sm text-neutral">
        Tipo
        <select
          aria-label="Tipo"
          value={tipoNovedadId ?? ''}
          onChange={(e) => setTipoNovedadId(e.target.value ? Number(e.target.value) : null)}
          className="rounded border border-neutral/40 px-3 py-2"
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
        <label className="flex flex-col text-sm text-neutral">
          Fecha inicio
          <input type="date" aria-label="Fecha inicio" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="rounded border border-neutral/40 px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm text-neutral">
          Fecha fin (opcional)
          <input type="date" aria-label="Fecha fin" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="rounded border border-neutral/40 px-3 py-2" />
        </label>
      </div>
      <label className="flex flex-col text-sm text-neutral">
        Justificación (opcional)
        <textarea value={justificacion} onChange={(e) => setJustificacion(e.target.value)} className="rounded border border-neutral/40 px-3 py-2" rows={2} />
      </label>
      <button
        type="button"
        disabled={!puede || crear.isPending}
        onClick={enviar}
        className="rounded bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        Cargar novedad
      </button>
    </div>
  );
}
