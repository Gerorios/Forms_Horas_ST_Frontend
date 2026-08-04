'use client';

import { useMemo } from 'react';
import { agruparPorLote } from '@/lib/agrupar';
import { enQuincena, type Quincena } from '@/lib/quincena';
import { infoCorreccion, type CorreccionInput, type InfoCorreccion } from '@/lib/correccion';
import { LoteResumenCard } from '@/components/lote-resumen-card';
import type { RegistroHoras } from '@/types/domain';

export function CargasAgrupadas({
  registros,
  quincena,
  isLoading,
}: {
  registros: RegistroHoras[] | undefined;
  quincena: Quincena;
  isLoading: boolean;
}) {
  const grupos = useMemo(() => {
    const filtrados = (registros ?? []).filter((r) => enQuincena(r.fecha, quincena));
    // "Cargas que hice" no distingue contratos propios/ajenos (ese concepto es
    // de aprobación, no aplica acá): se marcan todos accionable para que
    // agruparPorLote los muestre sin el atenuado de "otro contrato". Estos
    // registros vienen de findAll (no de porAprobar), que todavía no calcula
    // auditoría/total-cruzado — se rellena con valores neutros hasta que se
    // sume esa vista acá también. totalHorasDia va en null (no false-Number(horas))
    // para que los componentes compartidos NO rendericen la alerta "⚠ Revisar" /
    // "Xhs ese día": ese badge dice "sumando todos los contratos", algo que acá
    // no se calculó — mostrarlo con solo el total de esta línea sería engañoso.
    return agruparPorLote(
      filtrados.map((r) => ({
        ...r,
        accionable: true,
        cargadoPor: { cuil: '', nombre: '' },
        aprobadoPor: null,
        aprobadoEn: null,
        totalHorasDia: null,
        duplicadoCruzado: false,
      })),
    );
  }, [registros, quincena]);

  const total = useMemo(() => grupos.reduce((s, g) => s + g.totalHoras, 0), [grupos]);

  // Para detectar corrección (ADR-006) hace falta ver todos los lotes de la
  // quincena a la vez: la carga rechazada y la que la corrige son lotes
  // distintos que solo se enlazan por loteIdOrigen.
  const paraCorreccion: CorreccionInput[] = useMemo(
    () =>
      grupos.flatMap((g) =>
        g.contratos.map((c) => ({
          id: c.filas[0]?.id ?? 0,
          loteId: g.loteId,
          loteIdOrigen: c.filas[0]?.loteIdOrigen ?? null,
          contrato: c.contrato,
          // Horas declaradas de la línea (no el subtotal "real" que ya
          // excluye lo desaprobado): acá interesa qué se declaró, aunque
          // haya sido rechazado.
          horas: Number(c.filas[0]?.horas ?? 0),
          motivoDesaprobacion: c.filas[0]?.motivoDesaprobacion ?? null,
        })),
      ),
    [grupos],
  );
  const infoCorreccionPorLote = useMemo(() => {
    const mapa = new Map<string, Record<number, InfoCorreccion | null>>();
    for (const item of paraCorreccion) {
      const porContrato = mapa.get(item.loteId) ?? {};
      porContrato[item.contrato.id] = infoCorreccion(item, paraCorreccion);
      mapa.set(item.loteId, porContrato);
    }
    return mapa;
  }, [paraCorreccion]);

  // Una carga totalmente reemplazada por una corrección ya se ve fusionada
  // dentro de la tarjeta que la corrige — no hace falta mostrarla aparte.
  const gruposVisibles = useMemo(
    () =>
      grupos.filter((g) => {
        const porContrato = infoCorreccionPorLote.get(g.loteId);
        if (!porContrato) return true;
        return !g.contratos.every((c) => porContrato[c.contrato.id]?.tipo === 'reemplazada');
      }),
    [grupos, infoCorreccionPorLote],
  );

  if (isLoading) return <p className="text-slate">Cargando…</p>;
  if (grupos.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-slate">
        Sin cargas en esta quincena.
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-brand p-5 text-center">
        <div className="text-xs font-medium uppercase tracking-wide text-ink/70">
          Total {quincena.parte === 1 ? '1ª' : '2ª'} quincena
        </div>
        <div className="text-4xl font-extrabold tabular-nums text-ink">{total} hs</div>
      </div>

      <div className="space-y-4">
        {gruposVisibles.map((g) => (
          <LoteResumenCard
            key={g.loteId}
            grupo={g}
            mostrarEstado
            infoCorreccionPorContrato={infoCorreccionPorLote.get(g.loteId)}
          />
        ))}
      </div>
    </div>
  );
}
