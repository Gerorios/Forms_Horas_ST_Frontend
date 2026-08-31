'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/button';
import { useCierres, descargarExcelCierre, mensajeDeError, type CierreResumen } from '@/lib/api/liquidacion';
import { formatMoney, nombreQuincena } from '@/features/liquidacion/formato';

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface GrupoCierre {
  clave: string;
  anio: number;
  mes: number;
  quincena: number;
  vigente: CierreResumen;
  anteriores: CierreResumen[]; // orden: version desc
}

/** Agrupa la lista plana de GET /liquidacion/cierres por (anio,mes,quincena)
 * — la versión vigente (máxima) queda al frente, el resto ordenado desc para
 * mostrar "el recierre más reciente primero" al expandir (ver spec §6.2). */
function agruparCierres(cierres: CierreResumen[]): GrupoCierre[] {
  const mapa = new Map<string, CierreResumen[]>();
  for (const c of cierres) {
    const clave = `${c.anio}-${c.mes}-${c.quincena}`;
    const lista = mapa.get(clave);
    if (lista) lista.push(c);
    else mapa.set(clave, [c]);
  }
  const grupos: GrupoCierre[] = [];
  for (const [clave, lista] of mapa) {
    const [vigente, ...anteriores] = [...lista].sort((a, b) => b.version - a.version);
    grupos.push({ clave, anio: vigente.anio, mes: vigente.mes, quincena: vigente.quincena, vigente, anteriores });
  }
  return grupos.sort((a, b) => b.anio - a.anio || b.mes - a.mes || b.quincena - a.quincena);
}

function FilaVersion({
  cierre,
  esVigente,
  resaltado,
  descargando,
  onDescargar,
}: {
  cierre: CierreResumen;
  esVigente: boolean;
  resaltado: boolean;
  descargando: string | null;
  onDescargar: (id: number, porTantos: boolean) => void;
}) {
  const keyExcel = `${cierre.id}-excel`;
  const keyB = `${cierre.id}-b`;
  return (
    <div
      data-cierre-id={cierre.id}
      data-resaltado={resaltado ? 'true' : undefined}
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg p-3 ${
        resaltado ? 'border-2 border-brand bg-brand/5' : esVigente ? '' : 'border border-line bg-sand/40'
      }`}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-ink">
          <span>v{cierre.version}</span> · <span>{formatFechaHora(cierre.createdAt)}</span> ·{' '}
          <span>{cierre.cerradoPor.nombre}</span>
        </p>
        <p className="text-sm text-slate">{formatMoney(cierre.totales.total)}</p>
        {cierre.nota && (
          <p className="text-xs italic text-slate">
            Nota: <span>{cierre.nota}</span>
          </p>
        )}
        {cierre.salvedades.length > 0 && (
          <span className="inline-block rounded-full bg-warn/10 px-2 py-0.5 text-xs font-medium text-warn">
            {cierre.salvedades.length} salvedad{cierre.salvedades.length === 1 ? '' : 'es'}
          </span>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" size="sm" disabled={descargando === keyExcel} onClick={() => onDescargar(cierre.id, false)}>
          {descargando === keyExcel ? 'Descargando…' : 'Excel'}
        </Button>
        <Button variant="secondary" size="sm" disabled={descargando === keyB} onClick={() => onDescargar(cierre.id, true)}>
          {descargando === keyB ? 'Descargando…' : 'Por tantos B'}
        </Button>
        <Link
          href={`/liquidacion/cierres/${cierre.id}`}
          className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-slate hover:bg-accent/30 hover:text-ink"
        >
          Ver detalle
        </Link>
      </div>
    </div>
  );
}

function GrupoCierreCard({
  grupo,
  expandido,
  onToggle,
  nuevoId,
  descargando,
  onDescargar,
}: {
  grupo: GrupoCierre;
  expandido: boolean;
  onToggle: () => void;
  nuevoId: number | null;
  descargando: string | null;
  onDescargar: (id: number, porTantos: boolean) => void;
}) {
  const hayAnteriores = grupo.anteriores.length > 0;
  return (
    <div className="rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <h2 className="text-sm font-semibold text-ink">{nombreQuincena(grupo.quincena, grupo.mes, grupo.anio)}</h2>
        {hayAnteriores && (
          <button
            type="button"
            aria-expanded={expandido}
            onClick={onToggle}
            className="text-xs font-medium text-slate hover:text-ink"
          >
            {expandido
              ? '▲ Ocultar versiones anteriores'
              : `▼ ${grupo.anteriores.length} versión${grupo.anteriores.length === 1 ? '' : 'es'} anterior${grupo.anteriores.length === 1 ? '' : 'es'}`}
          </button>
        )}
      </div>
      <div className="space-y-2 p-3">
        <FilaVersion
          cierre={grupo.vigente}
          esVigente
          resaltado={grupo.vigente.id === nuevoId}
          descargando={descargando}
          onDescargar={onDescargar}
        />
        {expandido &&
          grupo.anteriores.map((c) => (
            <FilaVersion
              key={c.id}
              cierre={c}
              esVigente={false}
              resaltado={c.id === nuevoId}
              descargando={descargando}
              onDescargar={onDescargar}
            />
          ))}
      </div>
    </div>
  );
}

export default function CierresPage() {
  const { data, isLoading } = useCierres();
  const searchParams = useSearchParams();
  const nuevoParam = searchParams.get('nuevo');
  const nuevoId = nuevoParam != null && nuevoParam !== '' ? Number(nuevoParam) : null;

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [descargando, setDescargando] = useState<string | null>(null);

  const grupos = useMemo(() => agruparCierres(data ?? []), [data]);

  // Si ?nuevo= apunta a un recierre anterior (no la vigente), se expande su
  // período automáticamente — si no, la fila resaltada quedaría oculta.
  useEffect(() => {
    if (nuevoId == null) return;
    const grupo = grupos.find((g) => g.anteriores.some((c) => c.id === nuevoId));
    if (grupo) setExpandidos((prev) => (prev.has(grupo.clave) ? prev : new Set(prev).add(grupo.clave)));
  }, [nuevoId, grupos]);

  function alternar(clave: string) {
    setExpandidos((prev) => {
      const s = new Set(prev);
      if (s.has(clave)) s.delete(clave);
      else s.add(clave);
      return s;
    });
  }

  async function descargar(id: number, porTantos: boolean) {
    const key = `${id}-${porTantos ? 'b' : 'excel'}`;
    setDescargando(key);
    try {
      await descargarExcelCierre(id, porTantos);
    } catch (e) {
      toast.error(mensajeDeError(e, 'No se pudo descargar el Excel'));
    } finally {
      setDescargando(null);
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Liquidador" title="Cierres" />

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : grupos.length === 0 ? (
        <p className="text-slate">Todavía no se cerró ninguna quincena</p>
      ) : (
        <div className="space-y-3">
          {grupos.map((g) => (
            <GrupoCierreCard
              key={g.clave}
              grupo={g}
              expandido={expandidos.has(g.clave)}
              onToggle={() => alternar(g.clave)}
              nuevoId={nuevoId}
              descargando={descargando}
              onDescargar={descargar}
            />
          ))}
        </div>
      )}
    </section>
  );
}
