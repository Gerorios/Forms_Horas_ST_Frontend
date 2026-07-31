'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth/session';
import { useProvincias } from '@/lib/api/catalogos';
import {
  useCargaCombustible,
  useEstacionesServicio,
  useTiposCombustible,
  useEditarCargaCombustible,
  useAnularCargaCombustible,
} from '@/lib/api/combustible';
import { FotoTicketView } from './foto-ticket-view';
import { StatusBadge } from '@/components/status-badge';
import type { CargaCombustible, MedioPagoCombustible } from '@/types/domain';

function Fila({ label, valor }: { label: string; valor: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate">{label}</p>
      <p className="text-sm text-ink">{valor}</p>
    </div>
  );
}

function EditarCargaDialog({
  carga,
  onCancel,
  onGuardar,
  guardando,
}: {
  carga: CargaCombustible;
  onCancel: () => void;
  onGuardar: (form: FormData) => void;
  guardando: boolean;
}) {
  const { data: estaciones } = useEstacionesServicio();
  const { data: tipos } = useTiposCombustible();
  const { data: provincias } = useProvincias();

  const [fecha, setFecha] = useState(carga.fechaCarga.slice(0, 10));
  const [km, setKm] = useState(String(carga.km));
  const [litros, setLitros] = useState(carga.litros);
  const [monto, setMonto] = useState(carga.monto);
  const [medioPago, setMedioPago] = useState<MedioPagoCombustible>(carga.medioPago);
  const [nroComprobante, setNroComprobante] = useState(carga.nroComprobante);
  const [estacionId, setEstacionId] = useState<number | null>(carga.estacion.id);
  const [tipoCombustibleId, setTipoCombustibleId] = useState<number | null>(carga.tipoCombustible.id);
  const [provinciaId, setProvinciaId] = useState<number | null>(carga.provincia.id);
  const [observaciones, setObservaciones] = useState(carga.observaciones ?? '');
  const [foto, setFoto] = useState<File | null>(null);

  const labelComprobante = medioPago === 'cuenta_corriente' ? 'N° de remito' : 'N° de factura';

  const valido =
    fecha !== '' &&
    km.trim() !== '' &&
    litros.trim() !== '' &&
    monto.trim() !== '' &&
    nroComprobante.trim() !== '' &&
    estacionId != null &&
    tipoCombustibleId != null &&
    provinciaId != null;

  function guardar() {
    if (!valido) return;
    const form = new FormData();
    form.append('fechaCarga', fecha);
    form.append('km', km);
    form.append('litros', litros);
    form.append('monto', monto);
    form.append('medioPago', medioPago);
    form.append('nroComprobante', nroComprobante.trim());
    form.append('estacionId', String(estacionId));
    form.append('tipoCombustibleId', String(tipoCombustibleId));
    form.append('provinciaId', String(provinciaId));
    if (observaciones.trim() !== '') form.append('observaciones', observaciones.trim());
    if (foto) form.append('foto', foto, foto.name);
    onGuardar(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-lg">
        <h3 className="font-display font-semibold text-ink">Editar carga</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-ink">
            Fecha
            <input
              aria-label="Fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-ink">
            Kilometraje
            <input
              aria-label="Kilometraje"
              type="number"
              min="0"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-ink">
            Litros
            <input
              aria-label="Litros"
              type="number"
              min="0"
              step="0.01"
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
              className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-ink">
            Monto
            <input
              aria-label="Monto"
              type="number"
              min="0"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-ink">
            {labelComprobante}
            <input
              aria-label={labelComprobante}
              value={nroComprobante}
              onChange={(e) => setNroComprobante(e.target.value)}
              className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
        </div>

        <div>
          <p className="text-sm font-medium text-ink">Medio de pago</p>
          <div className="mt-1.5 flex gap-4">
            <label className="flex items-center gap-1.5 text-sm text-ink">
              <input
                type="radio"
                name="medioPagoEdit"
                checked={medioPago === 'cuenta_corriente'}
                onChange={() => setMedioPago('cuenta_corriente')}
              />
              Cuenta corriente
            </label>
            <label className="flex items-center gap-1.5 text-sm text-ink">
              <input
                type="radio"
                name="medioPagoEdit"
                checked={medioPago === 'caja'}
                onChange={() => setMedioPago('caja')}
              />
              Caja
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col text-sm font-medium text-ink">
            Estación
            <select
              aria-label="Estación de servicio"
              value={estacionId ?? ''}
              onChange={(e) => setEstacionId(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              <option value="">—</option>
              {(estaciones ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm font-medium text-ink">
            Tipo de combustible
            <select
              aria-label="Tipo de combustible"
              value={tipoCombustibleId ?? ''}
              onChange={(e) => setTipoCombustibleId(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              <option value="">—</option>
              {(tipos ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm font-medium text-ink">
            Provincia
            <select
              aria-label="Provincia"
              value={provinciaId ?? ''}
              onChange={(e) => setProvinciaId(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              <option value="">—</option>
              {(provincias ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col text-sm font-medium text-ink">
          Observaciones
          <textarea
            aria-label="Observaciones"
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>

        <label className="flex flex-col text-sm font-medium text-ink">
          Reemplazar foto del ticket (opcional)
          <input
            aria-label="Reemplazar foto del ticket"
            type="file"
            accept="image/*"
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
            className="mt-1 text-sm text-ink"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-sm text-slate hover:bg-accent/60">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!valido || guardando}
            onClick={guardar}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function AnularCargaDialog({
  onCancel,
  onConfirmar,
  anulando,
}: {
  onCancel: () => void;
  onConfirmar: (motivo: string) => void;
  anulando: boolean;
}) {
  const [motivo, setMotivo] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-surface p-6 shadow-lg">
        <h3 className="font-display font-semibold text-ink">Anular carga</h3>
        <label className="flex flex-col text-sm font-medium text-ink">
          Motivo
          <textarea
            aria-label="Motivo de anulación"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-ink">
          <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
          Confirmo que quiero anular esta carga
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-sm text-slate hover:bg-accent/60">
            Cancelar
          </button>
          <button
            type="button"
            disabled={motivo.trim() === '' || !confirmado || anulando}
            onClick={() => onConfirmar(motivo.trim())}
            className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white transition hover:brightness-95 disabled:opacity-50"
          >
            Anular carga
          </button>
        </div>
      </div>
    </div>
  );
}

export function DetalleCarga({ id, onClose }: { id: number; onClose: () => void }) {
  const { perfil } = useSession();
  const { data: carga, isLoading } = useCargaCombustible(id);
  const editar = useEditarCargaCombustible();
  const anular = useAnularCargaCombustible();

  const [dialogo, setDialogo] = useState<'editar' | 'anular' | null>(null);

  const puedeActuar =
    !!carga &&
    !!perfil &&
    carga.estado === 'activa' &&
    (carga.cargadoPorCuil === perfil.cuil || perfil.rol.nombre === 'Admin');

  function guardarEdicion(form: FormData) {
    if (!carga) return;
    const promesa = editar.mutateAsync({ id: carga.id, form });
    toast.promise(promesa, {
      loading: 'Guardando cambios…',
      success: 'Carga actualizada',
      error: 'No se pudo actualizar la carga',
    });
    promesa.then(() => setDialogo(null)).catch(() => {});
  }

  function confirmarAnulacion(motivo: string) {
    if (!carga) return;
    const promesa = anular.mutateAsync({ id: carga.id, motivo });
    toast.promise(promesa, {
      loading: 'Anulando…',
      success: 'Carga anulada',
      error: 'No se pudo anular la carga',
    });
    promesa.then(() => setDialogo(null)).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-semibold text-ink">Detalle de la carga</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md px-2 py-1 text-slate hover:bg-accent/60"
          >
            ✕
          </button>
        </div>

        {isLoading || !carga ? (
          <p className="mt-4 text-slate">Cargando…</p>
        ) : (
          <div className="mt-4 space-y-5">
            {carga.estado === 'anulada' && (
              <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                <p className="font-medium">Carga anulada</p>
                <p>Motivo: {carga.motivoAnulacion}</p>
              </div>
            )}

            <StatusBadge estado={carga.estado} />

            <div className="grid gap-4 sm:grid-cols-3">
              <Fila label="Fecha" valor={carga.fechaCarga.slice(0, 10)} />
              <Fila label="Móvil" valor={carga.movil.identificador} />
              <Fila label="Kilometraje" valor={carga.km} />
              <Fila label="Litros" valor={carga.litros} />
              <Fila label="Monto" valor={carga.monto} />
              <Fila
                label="Medio de pago"
                valor={carga.medioPago === 'cuenta_corriente' ? 'Cuenta corriente' : 'Caja'}
              />
              <Fila label="Comprobante" valor={carga.nroComprobante} />
              <Fila label="Estación" valor={carga.estacion.nombre} />
              <Fila label="Combustible" valor={carga.tipoCombustible.nombre} />
              <Fila label="Provincia" valor={carga.provincia.nombre} />
              <Fila label="Cargado por" valor={carga.cargadoPorCuil} />
            </div>

            {carga.observaciones && <Fila label="Observaciones" valor={carga.observaciones} />}

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate">Tareas / contratos</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {carga.tareas.map(({ tarea }) => (
                  <span key={tarea.id} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink">
                    {tarea.nombre} <span className="text-slate">· {tarea.contrato.codigo}</span>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate">Ticket</p>
              <div className="mt-1.5">
                <FotoTicketView cargaId={carga.id} />
              </div>
            </div>

            {puedeActuar && (
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setDialogo('editar')}
                  className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-accent/60"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setDialogo('anular')}
                  className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white transition hover:brightness-95"
                >
                  Anular
                </button>
              </div>
            )}
          </div>
        )}

        {dialogo === 'editar' && carga && (
          <EditarCargaDialog
            carga={carga}
            onCancel={() => setDialogo(null)}
            onGuardar={guardarEdicion}
            guardando={editar.isPending}
          />
        )}
        {dialogo === 'anular' && (
          <AnularCargaDialog
            onCancel={() => setDialogo(null)}
            onConfirmar={confirmarAnulacion}
            anulando={anular.isPending}
          />
        )}
      </div>
    </div>
  );
}
