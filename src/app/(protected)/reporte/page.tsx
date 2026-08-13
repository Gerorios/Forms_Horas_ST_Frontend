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

  // Sin default de hoy: cargas con fecha equivocada porque nadie tocaba el
  // campo (decisión del dueño de producto 2026-08-12). Se elige siempre a
  // mano y se vuelve a vaciar después de cada envío.
  const [fecha, setFecha] = useState('');
  const [provinciaId, setProvinciaId] = useState<number | null>(null);
  const [movilIds, setMovilIds] = useState<number[]>([]);
  const [operarios, setOperarios] = useState<EmpleadoBusqueda[]>([]);
  const [lineas, setLineas] = useState<LineaBorrador[]>([
    { contratoId: null, horas: null, tareaIds: [], observacion: '' },
  ]);

  const provinciaSel = provinciaId ?? provincias?.[0]?.id ?? null;
  const [intentoEnviar, setIntentoEnviar] = useState(false);

  const lineasValidas = useMemo(
    () =>
      lineas.length > 0 &&
      lineas.every(
        (l) =>
          l.contratoId != null &&
          l.horas != null &&
          l.horas > 0 &&
          l.tareaIds.length > 0 &&
          l.observacion.trim() !== '',
      ),
    [lineas],
  );
  const movilesValidos = movilIds.length > 0;
  const operariosValidos = operarios.length > 0;
  const fechaValida = fecha !== '';
  const formularioValido =
    fechaValida && operariosValidos && movilesValidos && lineasValidas && provinciaSel != null;

  async function enviar() {
    if (provinciaSel == null) return;
    const promesa = crear.mutateAsync({
      fecha,
      provinciaId: provinciaSel,
      gpsLat: coords?.lat,
      gpsLng: coords?.lng,
      movilIds,
      operarioCuils: operarios.map((o) => o.cuil),
      lineas: lineas.map((l) => ({
        contratoId: l.contratoId!,
        horas: l.horas!,
        tareaIds: l.tareaIds,
        observacion: l.observacion.trim(),
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
      setFecha('');
      setOperarios([]);
      setMovilIds([]);
      setLineas([{ contratoId: null, horas: null, tareaIds: [], observacion: '' }]);
      setIntentoEnviar(false);
    } catch {
      // el toast.promise ya avisó el error
    }
  }

  function intentarEnviar() {
    setIntentoEnviar(true);
    if (!formularioValido) return;
    enviar();
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
              className={`mt-1 rounded-md border bg-surface px-3 py-2 text-ink tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 ${
                intentoEnviar && !fechaValida ? 'border-danger' : 'border-line'
              }`}
            />
            {intentoEnviar && !fechaValida && (
              <p className="mt-1 text-xs font-normal text-danger">Elegí la fecha del reporte.</p>
            )}
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
          {intentoEnviar && !movilesValidos && (
            <p className="mt-1 text-[11px] text-danger">Elegí al menos un móvil.</p>
          )}
        </div>
      </Card>

      <Card title="Operarios">
        <OperariosSelect value={operarios} onChange={setOperarios} />
        {intentoEnviar && !operariosValidos && (
          <p className="mt-1 text-[11px] text-danger">Agregá al menos un operario.</p>
        )}
      </Card>

      <Card title="Contratos y tareas">
        <LineasField
          contratos={contratos}
          value={lineas}
          onChange={setLineas}
          mostrarErrores={intentoEnviar}
        />
      </Card>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end border-t border-line bg-sand/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <button
          type="button"
          disabled={crear.isPending}
          onClick={intentarEnviar}
          className="rounded-md bg-brand px-5 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
        >
          Reportar
        </button>
      </div>

      {crear.isPending && <CargandoModal />}
    </div>
  );
}
