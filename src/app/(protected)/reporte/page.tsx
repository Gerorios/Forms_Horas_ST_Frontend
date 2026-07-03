'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth/session';
import { useProvincias, useMoviles } from '@/lib/api/catalogos';
import { useCrearReporteBatch } from '@/lib/api/registros';
import { OperariosSelect } from '@/features/reporte/operarios-select';
import { LineasField, type LineaBorrador } from '@/features/reporte/lineas-field';
import { useGeolocation } from '@/features/reporte/use-geolocation';
import { contarFilas } from '@/lib/reporte-preview';
import type { EmpleadoBusqueda } from '@/types/domain';

function hoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
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
    { contratoId: null, tareaId: null, horas: null },
  ]);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (provinciaId == null && provincias && provincias.length > 0) {
      setProvinciaId(provincias[0].id);
    }
  }, [provincias, provinciaId]);

  const lineasCompletas = useMemo(
    () =>
      lineas.filter(
        (l) => l.contratoId != null && l.tareaId != null && l.horas != null && l.horas > 0,
      ),
    [lineas],
  );
  const puedeEnviar =
    operarios.length > 0 && lineasCompletas.length > 0 && provinciaId != null;
  const totalFilas = contarFilas(operarios.length, lineasCompletas.length);

  async function enviar() {
    if (!puedeEnviar || provinciaId == null) return;
    try {
      await crear.mutateAsync({
        fecha,
        provinciaId,
        gpsLat: coords?.lat,
        gpsLng: coords?.lng,
        movilIds: movilIds.length ? movilIds : undefined,
        operarioCuils: operarios.map((o) => o.cuil),
        lineas: lineasCompletas.map((l) => ({
          contratoId: l.contratoId!,
          tareaId: l.tareaId!,
          horas: l.horas!,
        })),
      });
      toast.success(`Reporte cargado (${totalFilas} filas)`);
      setOperarios([]);
      setLineas([{ contratoId: null, tareaId: null, horas: null }]);
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

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-neutral">Reporte diario</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col text-sm text-neutral">
          Fecha
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded border border-neutral/40 px-3 py-2"
          />
        </label>
        <label className="flex flex-col text-sm text-neutral">
          Provincia
          <select
            aria-label="Provincia"
            value={provinciaId ?? ''}
            onChange={(e) => setProvinciaId(e.target.value ? Number(e.target.value) : null)}
            className="rounded border border-neutral/40 px-3 py-2"
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

      <p className="text-xs text-neutral/60">
        GPS: {gps === 'ok' ? `${coords?.lat.toFixed(4)}, ${coords?.lng.toFixed(4)}` : gps}
      </p>

      {(moviles ?? []).length > 0 && (
        <fieldset className="space-y-1">
          <legend className="text-sm text-neutral">Móviles</legend>
          <div className="flex flex-wrap gap-3">
            {(moviles ?? []).map((m) => (
              <label key={m.id} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={movilIds.includes(m.id)} onChange={() => toggleMovil(m.id)} />
                {m.identificador}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="space-y-1">
        <h2 className="text-sm font-medium text-neutral">Operarios</h2>
        <OperariosSelect value={operarios} onChange={setOperarios} />
      </div>

      <div className="space-y-1">
        <h2 className="text-sm font-medium text-neutral">Líneas (contrato · tarea · horas)</h2>
        <LineasField contratos={contratos} value={lineas} onChange={setLineas} />
      </div>

      <div className="flex items-center justify-between border-t border-neutral/20 pt-4">
        <span className="text-sm text-neutral">
          Se generarán <strong>{totalFilas}</strong> filas
        </span>
        <button
          type="button"
          disabled={!puedeEnviar || crear.isPending}
          onClick={() => setConfirmando(true)}
          className="rounded bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Reportar
        </button>
      </div>

      {confirmando && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6">
            <h3 className="font-semibold text-neutral">Confirmar reporte</h3>
            <p className="text-sm text-neutral">
              Fecha {fecha} · {operarios.length} operario(s) · {lineasCompletas.length} línea(s) ={' '}
              <strong>{totalFilas} filas</strong>.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmando(false)} className="px-3 py-2 text-sm text-neutral">
                Cancelar
              </button>
              <button
                type="button"
                onClick={enviar}
                className="rounded bg-brand px-3 py-2 text-sm font-medium text-white"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
