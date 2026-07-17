'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth/session';
import { useProvincias, useMoviles } from '@/lib/api/catalogos';
import { useCrearReporteBatch } from '@/lib/api/registros';
import { OperariosSelect } from '@/features/reporte/operarios-select';
import { LineasField, type LineaBorrador } from '@/features/reporte/lineas-field';
import { MovilesSelect } from '@/features/reporte/moviles-select';
import { CargandoModal } from '@/features/reporte/cargando-modal';
import { useGeolocation } from '@/features/reporte/use-geolocation';
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

  const provinciaSel = provinciaId ?? provincias?.[0]?.id ?? null;

  const lineasCompletas = useMemo(
    () =>
      lineas.filter(
        (l) => l.contratoId != null && l.horas != null && l.horas > 0 && l.tareaIds.length > 0,
      ),
    [lineas],
  );
  const puedeEnviar = operarios.length > 0 && lineasCompletas.length > 0 && provinciaSel != null;

  async function enviar() {
    if (!puedeEnviar || provinciaSel == null) return;
    const promesa = crear.mutateAsync({
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
    toast.promise(promesa, {
      loading: 'Cargando reporte…',
      success: 'Reporte cargado',
      error: (e: unknown) =>
        String(
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'No se pudo cargar el reporte',
        ),
    });
    try {
      await promesa;
      setOperarios([]);
      setLineas([{ contratoId: null, horas: null, tareaIds: [] }]);
    } catch {
      // el toast.promise ya avisó el error
    }
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
          <div className="mt-1.5">
            <MovilesSelect moviles={moviles ?? []} value={movilIds} onChange={setMovilIds} />
          </div>
        </div>
      </Card>

      <Card title="Operarios">
        <OperariosSelect value={operarios} onChange={setOperarios} />
      </Card>

      <Card title="Contratos y tareas">
        <LineasField contratos={contratos} value={lineas} onChange={setLineas} />
      </Card>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end border-t border-line bg-sand/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <button
          type="button"
          disabled={!puedeEnviar || crear.isPending}
          onClick={enviar}
          className="rounded-md bg-brand px-5 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
        >
          Reportar
        </button>
      </div>

      {crear.isPending && <CargandoModal />}
    </div>
  );
}
