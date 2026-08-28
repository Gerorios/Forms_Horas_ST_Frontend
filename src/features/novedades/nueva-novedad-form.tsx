'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useCrearNovedad, useTiposNovedad } from '@/lib/api/novedades';
import { useSession } from '@/lib/auth/session';
import { OperariosSelect } from '@/features/reporte/operarios-select';
import { AdjuntoInput } from '@/features/novedades/adjunto-input';
import { Button } from '@/components/button';
import type { EmpleadoBusqueda } from '@/types/domain';

export function NuevaNovedadForm({ onCreada }: { onCreada: () => void }) {
  const { perfil } = useSession();
  const { data: tiposCatalogo } = useTiposNovedad();
  const crear = useCrearNovedad();

  // JefeCuadrilla solo ve los tipos que le habilitaron desde Admin (ver
  // ADR-007); Supervisor/JefeContrato/Admin ven el catálogo completo.
  const tipos = useMemo(() => {
    if (perfil?.rol.nombre !== 'JefeCuadrilla') return tiposCatalogo ?? [];
    const habilitados = new Set(perfil.tiposNovedadHabilitados.map((t) => t.tipoNovedad.id));
    return (tiposCatalogo ?? []).filter((t) => habilitados.has(t.id));
  }, [tiposCatalogo, perfil]);
  const [operario, setOperario] = useState<EmpleadoBusqueda[]>([]);
  const [tipoNovedadId, setTipoNovedadId] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [adjunto, setAdjunto] = useState<File | null>(null);

  // Guardia Pasiva es el único tipo que se carga para varios operarios a la
  // vez (pedido explícito 2026-08-28): misma fecha/justificación, una
  // novedad independiente por operario — no hay adjunto en este caso (no
  // aplica a Guardia Pasiva y no tendría a quién asociarse entre varios).
  const esGuardiaPasiva = tipos.find((t) => t.id === tipoNovedadId)?.nombre === 'Guardia Pasiva';

  const puede =
    (esGuardiaPasiva ? operario.length >= 1 : operario.length === 1) &&
    tipoNovedadId != null &&
    fechaInicio !== '';

  function cambiarTipo(id: number | null) {
    setTipoNovedadId(id);
    if (tipos.find((t) => t.id === id)?.nombre !== 'Guardia Pasiva') {
      setOperario((prev) => prev.slice(-1));
    }
  }

  function construirForm(cuil: string) {
    const form = new FormData();
    form.append('operarioCuil', cuil);
    form.append('tipoNovedadId', String(tipoNovedadId));
    form.append('fechaInicio', fechaInicio);
    if (fechaFin) form.append('fechaFin', fechaFin);
    if (justificacion) form.append('justificacionTexto', justificacion);
    if (adjunto) form.append('adjunto', adjunto, adjunto.name);
    return form;
  }

  async function enviar() {
    if (!puede || tipoNovedadId == null) return;
    const promesa = Promise.all(operario.map((op) => crear.mutateAsync(construirForm(op.cuil))));
    toast.promise(promesa, {
      loading: operario.length > 1 ? `Guardando para ${operario.length} operarios…` : 'Guardando novedad…',
      success: operario.length > 1 ? `Novedad cargada para ${operario.length} operarios` : 'Novedad cargada',
      error:
        operario.length > 1
          ? 'No se pudo cargar para todos — revisá quién quedó pendiente'
          : 'No se pudo cargar la novedad',
    });
    try {
      await promesa;
      setOperario([]);
      setTipoNovedadId(null);
      setFechaInicio('');
      setFechaFin('');
      setJustificacion('');
      setAdjunto(null);
      onCreada();
    } catch {
      // el toast.promise ya avisó el error
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-5">
      <h2 className="font-medium text-ink">Nueva novedad</h2>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        Tipo
        <select
          aria-label="Tipo"
          value={tipoNovedadId ?? ''}
          onChange={(e) => cambiarTipo(e.target.value ? Number(e.target.value) : null)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        >
          <option value="">—</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-1">
        <span className="text-sm font-medium text-ink">Operario</span>
        {esGuardiaPasiva && (
          <p className="text-xs text-slate">
            Podés elegir varios operarios: se carga la misma guardia pasiva para cada uno.
          </p>
        )}
        <OperariosSelect value={operario} onChange={(v) => setOperario(esGuardiaPasiva ? v : v.slice(-1))} />
      </div>
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
      {!esGuardiaPasiva && <AdjuntoInput onArchivo={setAdjunto} />}
      <Button variant="primary" disabled={!puede || crear.isPending} onClick={enviar}>
        {crear.isPending
          ? 'Guardando…'
          : operario.length > 1
            ? `Cargar a ${operario.length} operarios`
            : 'Cargar novedad'}
      </Button>
    </div>
  );
}
