'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth/session';
import { useProvincias, useMoviles } from '@/lib/api/catalogos';
import { useCrearReporteBatch } from '@/lib/api/registros';
import { OperariosSelect } from '@/features/reporte/operarios-select';
import { LineasField, type LineaBorrador } from '@/features/reporte/lineas-field';
import { useGeolocation } from '@/features/reporte/use-geolocation';
import { contarFilas } from '@/lib/reporte-preview';
import { PageHeader } from '@/components/page-header';
import type { EmpleadoBusqueda } from '@/types/domain';

function hoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="mb-4 border-l-[3px] border-brand pl-2.5 font-display text-sm font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ReportePage() {
  const { perfil } = useSession();
  const contratos = (perfil?.contratosHabilitados ?? []).map((c) => c.contrato);
  const { data: provincias } = useProvincias();
  const { data: moviles } = useMoviles();
  const { coords, estado: gps } = useGeolocation();
  const crear = useCrearReporteBatch();

  const [fecha, setFecha] = useState(hoyISO());
  const [provinciaId, setProvinciaId] = useState<number | null>(null);
  const [movilIds, setMovilIds] = useState<number[]>([]);
  const [operarios, setOperarios] = useState<EmpleadoBusqueda[]>([]);
  const [lineas, setLineas] = useState<LineaBorrador[]>([
    { contratoId: null, horas: null, tareaIds: [] },
  ]);
  const [confirmando, setConfirmando] = useState(false);

  const provinciaSel = provinciaId ?? provincias?.[0]?.id ?? null;

  const lineasCompletas = useMemo(
    () =>
      lineas.filter(
        (l) => l.contratoId != null && l.horas != null && l.horas > 0 && l.tareaIds.length > 0,
      ),
    [lineas],
  );
  const puedeEnviar = operarios.length > 0 && lineasCompletas.length > 0 && provinciaSel != null;
  const totalFilas = contarFilas(operarios.length, lineasCompletas.length);

  async function enviar() {
    if (!puedeEnviar || provinciaSel == null) return;
    try {
      await crear.mutateAsync({
        fecha,
        provinciaId: provinciaSel,
        gpsLat: coords?.lat,
        gpsLng: coords?.lng,
        movilIds: movilIds.length ? movilIds : undefined,
        operarioCuils: operarios.map((o) => o.cuil),
        lineas: lineasCompletas.map((l) => ({
          contratoId: l.contratoId!,
          horas: l.horas!,
          tareaIds: l.tareaIds,
        })),
      });
      toast.success(`Reporte cargado (${totalFilas} filas)`);
      setOperarios([]);
      setLineas([{ contratoId: null, horas: null, tareaIds: [] }]);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'No se pudo cargar el reporte';
      toast.error(String(msg));
    } finally {
      setConfirmando(false);
    }
  }

  function toggleMovil(id: number) {
    setMovilIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const gpsLabel =
    gps === 'ok' && coords
      ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
      : gps === 'capturando'
        ? 'capturando…'
        : gps === 'denegado'
          ? 'sin permiso (se guarda igual)'
          : 'no disponible';

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Carga de horas" title="Reporte diario" />

      <Card title="Datos de la jornada">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-ink">
            Fecha
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 rounded-md border border-line bg-surface px-3 py-2 text-ink tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-ink">
            Provincia
            <select
              aria-label="Provincia"
              value={provinciaSel ?? ''}
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

        <p className="mt-3 text-xs text-slate">
          GPS: <span className="tabular-nums text-ink/70">{gpsLabel}</span>
        </p>

        <div className="mt-4">
          <p className="text-sm font-medium text-ink">Móviles</p>
          {(moviles ?? []).length === 0 ? (
            <p className="mt-1 text-xs text-slate/70">No hay móviles cargados.</p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(moviles ?? []).map((m) => {
                const activo = movilIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => toggleMovil(m.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      activo
                        ? 'border-brand bg-accent font-medium text-ink'
                        : 'border-line text-slate hover:border-brand/50'
                    }`}
                  >
                    {m.identificador}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Card title="Operarios">
        <OperariosSelect value={operarios} onChange={setOperarios} />
      </Card>

      <Card title="Contratos y tareas">
        <LineasField contratos={contratos} value={lineas} onChange={setLineas} />
      </Card>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-4 border-t border-line bg-sand/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <span className="text-sm text-slate">
          Se generarán <strong className="tabular-nums text-ink">{totalFilas}</strong> filas
        </span>
        <button
          type="button"
          disabled={!puedeEnviar || crear.isPending}
          onClick={() => setConfirmando(true)}
          className="rounded-md bg-brand px-5 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
        >
          Reportar
        </button>
      </div>

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-surface p-6 shadow-lg">
            <h3 className="font-display font-semibold text-ink">Confirmar reporte</h3>
            <p className="text-sm text-slate">
              Fecha <span className="tabular-nums text-ink">{fecha}</span> ·{' '}
              {operarios.length} operario(s) · {lineasCompletas.length} contrato(s) ={' '}
              <strong className="tabular-nums text-ink">{totalFilas} filas</strong>.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="rounded-md px-3 py-2 text-sm text-slate hover:bg-accent/60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={enviar}
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
