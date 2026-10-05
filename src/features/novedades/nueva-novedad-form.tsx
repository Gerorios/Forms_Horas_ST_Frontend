'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useCrearNovedad, useTiposNovedad } from '@/lib/api/novedades';
import { useSession } from '@/lib/auth/session';
import { OperariosSelect } from '@/features/reporte/operarios-select';
import { AdjuntoInput } from '@/features/novedades/adjunto-input';
import { Button } from '@/components/button';
import { mensajeDeError } from '@/lib/api/liquidacion';
import { TIPO_BAJA, fechaLegible } from '@/features/novedades/baja';
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
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);

  // Guardia Pasiva es el único tipo que se carga para varios operarios a la
  // vez (pedido explícito 2026-08-28): misma fecha/justificación, una
  // novedad independiente por operario — no hay adjunto en este caso (no
  // aplica a Guardia Pasiva y no tendría a quién asociarse entre varios).
  const esGuardiaPasiva = tipos.find((t) => t.id === tipoNovedadId)?.nombre === 'Guardia Pasiva';
  // Baja de Operario (ADR-026): la fecha es el ÚLTIMO DÍA TRABAJADO y no
  // lleva fecha fin. Confirmada por HyS, bloquea la carga de horas
  // posteriores, por eso se pide confirmación explícita antes de enviarla.
  const esBaja = tipos.find((t) => t.id === tipoNovedadId)?.nombre === TIPO_BAJA;

  const puede =
    (esGuardiaPasiva ? operario.length >= 1 : operario.length === 1) &&
    tipoNovedadId != null &&
    fechaInicio !== '';

  function cambiarTipo(id: number | null) {
    setTipoNovedadId(id);
    const nombre = tipos.find((t) => t.id === id)?.nombre;
    if (nombre !== 'Guardia Pasiva') {
      setOperario((prev) => prev.slice(-1));
    }
    if (nombre === TIPO_BAJA) setFechaFin('');
  }

  function construirForm(cuil: string) {
    const form = new FormData();
    form.append('operarioCuil', cuil);
    form.append('tipoNovedadId', String(tipoNovedadId));
    form.append('fechaInicio', fechaInicio);
    if (fechaFin && !esBaja) form.append('fechaFin', fechaFin);
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
      error: (e) =>
        operario.length > 1
          ? 'No se pudo cargar para todos — revisá quién quedó pendiente'
          : mensajeDeError(e, 'No se pudo cargar la novedad'),
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
          {esBaja ? 'Último día trabajado' : 'Fecha inicio'}
          <input
            type="date"
            aria-label="Fecha inicio"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          {esBaja && (
            <span className="text-xs font-normal text-slate">
              ¿Cuál fue el último día trabajado? Ese día todavía se pueden cargar horas; desde el siguiente, no.
            </span>
          )}
        </label>
        {!esBaja && (
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
        )}
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
      <Button
        variant="primary"
        disabled={!puede || crear.isPending}
        onClick={() => (esBaja ? setConfirmandoBaja(true) : enviar())}
      >
        {crear.isPending
          ? 'Guardando…'
          : operario.length > 1
            ? `Cargar a ${operario.length} operarios`
            : 'Cargar novedad'}
      </Button>
      {confirmandoBaja && operario[0] && (
        <ConfirmarBajaDialog
          operario={operario[0]}
          fecha={fechaInicio}
          onCancel={() => setConfirmandoBaja(false)}
          onConfirmar={() => {
            setConfirmandoBaja(false);
            void enviar();
          }}
        />
      )}
    </div>
  );
}

/** Confirmación de una Baja de Operario (ADR-026): nombre, legajo y CUIL a la
 * vista para que no se informe la baja de otra persona (dos García en la
 * lista), y qué va a pasar cuando HyS la confirme. */
function ConfirmarBajaDialog({
  operario,
  fecha,
  onCancel,
  onConfirmar,
}: {
  operario: EmpleadoBusqueda;
  fecha: string;
  onCancel: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-label="Confirmar baja de operario"
        className="w-full max-w-sm space-y-3 rounded-xl border border-line bg-surface p-6 shadow-lg"
      >
        <h3 className="font-display font-semibold text-ink">Informar baja de operario</h3>
        <dl className="space-y-1 text-sm text-ink">
          <div>
            <dt className="inline text-slate">Operario: </dt>
            <dd className="inline font-medium">{operario.apellido_nombre}</dd>
          </div>
          <div>
            <dt className="inline text-slate">Legajo: </dt>
            <dd className="inline">{operario.legajo}</dd>
          </div>
          <div>
            <dt className="inline text-slate">CUIL: </dt>
            <dd className="inline">{operario.cuil}</dd>
          </div>
          <div>
            <dt className="inline text-slate">Último día trabajado: </dt>
            <dd className="inline font-medium">{fechaLegible(fecha)}</dd>
          </div>
        </dl>
        <p className="text-sm text-slate">
          Cuando HyS la confirme, no se van a poder cargar horas posteriores a esa fecha en ningún contrato, y las
          quincenas siguientes se liquidan en $0.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirmar}>
            Informar baja
          </Button>
        </div>
      </div>
    </div>
  );
}
