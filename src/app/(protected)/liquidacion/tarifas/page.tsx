'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import {
  useEstadoTarifas,
  useCargarRondaTarifas,
  useRondaPeriodo,
  useActualizarRondaTarifas,
  mensajeDeError,
  type TipoBonoNoRemunerativo,
} from '@/lib/api/liquidacion';

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

type Periodo = { anio: number; mes: number };

function sumarMes(p: Periodo): Periodo {
  return p.mes === 12 ? { anio: p.anio + 1, mes: 1 } : { anio: p.anio, mes: p.mes + 1 };
}

function mesesEntre(desde: Periodo, hasta: Periodo): Periodo[] {
  const resultado: Periodo[] = [];
  let cursor = sumarMes(desde);
  while (cursor.anio < hasta.anio || (cursor.anio === hasta.anio && cursor.mes < hasta.mes)) {
    resultado.push(cursor);
    cursor = sumarMes(cursor);
  }
  return resultado;
}

function etiquetaPeriodo(p: Periodo) {
  return `${NOMBRES_MES[p.mes - 1]} ${p.anio}`;
}

function restarMes(p: Periodo): Periodo {
  return p.mes === 1 ? { anio: p.anio - 1, mes: 12 } : { anio: p.anio, mes: p.mes - 1 };
}

/** No hay forma de saber cuál fue el primer período cargado (el backend
 * solo expone el último), así que ofrecemos los últimos N meses hasta ahí
 * para elegir. Si el Liquidador elige uno que en realidad no se cargó, el
 * GET de useRondaPeriodo devuelve 404 y se lo avisamos en el form. */
function periodosHaciaAtras(hasta: Periodo, cantidad: number): Periodo[] {
  const resultado: Periodo[] = [hasta];
  let cursor = hasta;
  for (let i = 1; i < cantidad; i++) {
    cursor = restarMes(cursor);
    resultado.push(cursor);
  }
  return resultado;
}

const RANGOS_DEFAULT = [
  { kmDesde: '0', kmHasta: '60', precioPorKm: '' },
  { kmDesde: '60', kmHasta: '75', precioPorKm: '' },
  { kmDesde: '75', kmHasta: '', precioPorKm: '' },
];

const AVISO_EDICION =
  'Vas a modificar precios de un período ya cargado. Esto recalcula todas las quincenas de ese ' +
  'mes: si ya las liquidaste con los valores anteriores, el panel dejará de coincidir con lo ' +
  'pagado. El cambio queda auditado.';

export default function TarifasPage() {
  const { data: estado, isLoading } = useEstadoTarifas();
  const cargarRonda = useCargarRondaTarifas();
  const actualizarRonda = useActualizarRondaTarifas();

  const [modo, setModo] = useState<'nueva' | 'editar'>('nueva');
  const [periodoAEditar, setPeriodoAEditar] = useState('');
  const [dialogConfirmacion, setDialogConfirmacion] = useState(false);

  const [mesAnio, setMesAnio] = useState('');
  const [importes, setImportes] = useState<Record<number, string>>({});
  const [montos, setMontos] = useState<Record<number, string>>({});
  const [rangos, setRangos] = useState<{ kmDesde: string; kmHasta: string; precioPorKm: string }[]>(RANGOS_DEFAULT);
  const [bonos, setBonos] = useState<Record<number, { tipo: TipoBonoNoRemunerativo | ''; valor: string }>>({});

  const periodosEditables = useMemo(
    () => (estado?.ultimoPeriodo ? periodosHaciaAtras(estado.ultimoPeriodo, 24) : []),
    [estado?.ultimoPeriodo],
  );

  const objetivoEditar = useMemo<Periodo | null>(() => {
    if (!periodoAEditar) return null;
    const [anioStr, mesStr] = periodoAEditar.split('-');
    return { anio: Number(anioStr), mes: Number(mesStr) };
  }, [periodoAEditar]);

  const {
    data: rondaAEditar,
    isLoading: cargandoRondaAEditar,
    error: errorRondaAEditar,
  } = useRondaPeriodo(objetivoEditar?.anio ?? 0, objetivoEditar?.mes ?? 0, modo === 'editar' && objetivoEditar != null);

  // Precarga los valores de la ronda elegida cada vez que cambia el período
  // seleccionado en modo edición (a diferencia de la precarga inicial de
  // "nueva ronda", acá SÍ queremos recargar cada vez que el usuario elige
  // otro período).
  useEffect(() => {
    if (modo !== 'editar' || !rondaAEditar) return;
    setImportes(Object.fromEntries(rondaAEditar.categorias.map((c) => [c.id, c.importeHora])));
    setMontos(Object.fromEntries(rondaAEditar.tiposNovedad.map((t) => [t.id, t.montoPorDia])));
    setRangos(
      rondaAEditar.rangosKm.length
        ? rondaAEditar.rangosKm.map((r) => ({ kmDesde: r.kmDesde, kmHasta: r.kmHasta ?? '', precioPorKm: r.precioPorKm }))
        : RANGOS_DEFAULT,
    );
    setBonos(
      Object.fromEntries(
        rondaAEditar.categorias.map((c) => [
          c.id,
          { tipo: c.bonoNoRemunerativo?.tipo ?? '', valor: c.bonoNoRemunerativo?.valor ?? '' },
        ]),
      ),
    );
  }, [modo, rondaAEditar]);

  // Solo se precarga una vez, la primera vez que llegan los datos — un
  // refetch posterior de la query (ej. al volver a la pestaña) no debe
  // pisar lo que el Liquidador ya esté editando.
  const precargado = useRef(false);
  useEffect(() => {
    if (!estado || precargado.current) return;
    precargado.current = true;
    const hoy = new Date();
    const objetivoDefault = estado.ultimoPeriodo
      ? sumarMes(estado.ultimoPeriodo)
      : { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
    setMesAnio(`${objetivoDefault.anio}-${String(objetivoDefault.mes).padStart(2, '0')}`);
    setImportes(Object.fromEntries(estado.categorias.map((c) => [c.id, c.importeHoraActual ?? ''])));
    setMontos(Object.fromEntries(estado.tiposNovedad.map((t) => [t.id, t.montoPorDiaActual ?? ''])));
    setRangos(
      estado.rangosKm.length
        ? estado.rangosKm.map((r) => ({ kmDesde: r.kmDesde, kmHasta: r.kmHasta ?? '', precioPorKm: r.precioPorKmActual }))
        : RANGOS_DEFAULT,
    );
    setBonos(
      Object.fromEntries(
        estado.categorias.map((c) => [
          c.id,
          {
            tipo: c.bonoNoRemunerativoActual?.tipo ?? '',
            valor: c.bonoNoRemunerativoActual?.valor ?? '',
          },
        ]),
      ),
    );
  }, [estado]);

  const objetivo = useMemo<Periodo | null>(() => {
    if (!mesAnio) return null;
    const [anioStr, mesStr] = mesAnio.split('-');
    return { anio: Number(anioStr), mes: Number(mesStr) };
  }, [mesAnio]);

  const faltantes = useMemo(() => {
    if (!estado?.ultimoPeriodo || !objetivo) return [];
    return mesesEntre(estado.ultimoPeriodo, objetivo);
  }, [estado, objetivo]);

  const objetivoActivo = modo === 'editar' ? objetivoEditar : objetivo;

  const camposCompletos =
    Object.values(importes).every((v) => v !== '') &&
    Object.values(montos).every((v) => v !== '') &&
    rangos.every((r) => r.kmDesde !== '' && r.precioPorKm !== '');

  const puedeConfirmar =
    modo === 'nueva'
      ? objetivo != null && camposCompletos
      : objetivoEditar != null && rondaAEditar != null && camposCompletos;

  function actualizarRango(i: number, campo: 'kmDesde' | 'kmHasta' | 'precioPorKm', valor: string) {
    setRangos((prev) => prev.map((r, j) => (j === i ? { ...r, [campo]: valor } : r)));
  }

  function armarDto() {
    return {
      categorias: (estado?.categorias ?? []).map((c) => ({
        categoriaUocraId: c.id,
        importeHora: Number(importes[c.id]),
      })),
      tiposNovedad: (estado?.tiposNovedad ?? []).map((t) => ({
        tipoNovedadId: t.id,
        montoPorDia: Number(montos[t.id]),
      })),
      rangosKm: rangos.map((r) => ({
        kmDesde: Number(r.kmDesde),
        kmHasta: r.kmHasta === '' ? undefined : Number(r.kmHasta),
        precioPorKm: Number(r.precioPorKm),
      })),
      bonosNoRemunerativos: Object.entries(bonos)
        .filter(([, b]) => b.tipo !== '' && b.valor !== '')
        .map(([categoriaUocraId, b]) => ({
          categoriaUocraId: Number(categoriaUocraId),
          tipo: b.tipo as TipoBonoNoRemunerativo,
          valor: Number(b.valor),
        })),
    };
  }

  function confirmar() {
    if (!puedeConfirmar || !objetivo || modo !== 'nueva') return;
    const promesa = cargarRonda.mutateAsync({ mes: objetivo.mes, anio: objetivo.anio, ...armarDto() });
    toast.promise(promesa, {
      loading: 'Guardando ronda de tarifas…',
      success: `Tarifas de ${etiquetaPeriodo(objetivo)} cargadas`,
      error: (e) => mensajeDeError(e, 'No se pudo cargar la ronda'),
    });
  }

  function pedirConfirmacionEdicion() {
    if (!puedeConfirmar || !objetivoEditar || modo !== 'editar') return;
    setDialogConfirmacion(true);
  }

  function confirmarEdicion() {
    if (!objetivoEditar) return;
    setDialogConfirmacion(false);
    const promesa = actualizarRonda.mutateAsync({ anio: objetivoEditar.anio, mes: objetivoEditar.mes, ...armarDto() });
    toast.promise(promesa, {
      loading: 'Guardando cambios…',
      success: `Tarifas de ${etiquetaPeriodo(objetivoEditar)} actualizadas`,
      error: (e) => mensajeDeError(e, 'No se pudo actualizar la ronda'),
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Tarifas" />
      <p className="text-sm text-slate">
        Las 3 tarifas (categorías UOCRA, novedades con plus y rangos de km) se cargan juntas, una
        vez por mes. Elegí el período: si dejaste algún mes sin cargar, el sistema lo completa
        automáticamente copiando el último valor conocido.
      </p>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-sm text-slate">
              Último período cargado:{' '}
              <span className="font-medium text-ink">
                {estado?.ultimoPeriodo ? etiquetaPeriodo(estado.ultimoPeriodo) : 'ninguno todavía'}
              </span>
            </p>

            <fieldset className="mt-3 flex flex-col gap-2 text-sm font-medium text-ink sm:flex-row sm:items-center sm:gap-4">
              <legend className="sr-only">Modo</legend>
              <label className="flex items-center gap-2 font-normal">
                <input
                  type="radio"
                  name="modo"
                  value="nueva"
                  checked={modo === 'nueva'}
                  onChange={() => setModo('nueva')}
                />
                Nueva ronda{estado?.ultimoPeriodo ? ` (${etiquetaPeriodo(sumarMes(estado.ultimoPeriodo))})` : ''}
              </label>
              <label className="flex items-center gap-2 font-normal">
                <input
                  type="radio"
                  name="modo"
                  value="editar"
                  checked={modo === 'editar'}
                  disabled={periodosEditables.length === 0}
                  onChange={() => setModo('editar')}
                />
                Editar período cargado
              </label>
            </fieldset>

            {modo === 'nueva' ? (
              <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-ink sm:max-w-xs">
                Período a cargar
                <input
                  aria-label="Período a cargar"
                  type="month"
                  value={mesAnio}
                  onChange={(e) => setMesAnio(e.target.value)}
                  className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
              </label>
            ) : (
              <div className="mt-3 flex flex-col gap-1 text-sm font-medium text-ink sm:max-w-xs">
                <label className="flex flex-col gap-1">
                  Período a editar
                  <select
                    aria-label="Período a editar"
                    value={periodoAEditar}
                    onChange={(e) => setPeriodoAEditar(e.target.value)}
                    className="rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                  >
                    <option value="">— elegí un período —</option>
                    {periodosEditables.map((p) => (
                      <option key={`${p.anio}-${p.mes}`} value={`${p.anio}-${String(p.mes).padStart(2, '0')}`}>
                        {etiquetaPeriodo(p)}
                      </option>
                    ))}
                  </select>
                </label>
                {cargandoRondaAEditar && <p className="text-xs text-slate">Cargando valores del período…</p>}
                {errorRondaAEditar && (
                  <p className="text-xs text-danger">
                    {mensajeDeError(errorRondaAEditar, 'No se pudo encontrar esa ronda')}
                  </p>
                )}
              </div>
            )}
          </div>

          {modo === 'nueva' && faltantes.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Faltan cargar: <strong>{faltantes.map(etiquetaPeriodo).join(', ')}</strong>. Se van a
              completar automáticamente copiando el último valor conocido (
              {estado?.ultimoPeriodo ? etiquetaPeriodo(estado.ultimoPeriodo) : ''}). Para{' '}
              <strong>{objetivo ? etiquetaPeriodo(objetivo) : ''}</strong>, revisá los valores de
              abajo: dejalos igual para copiarlos también, o cambialos para cargar precios nuevos.
            </div>
          )}

          <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
            <h2 className="font-display text-sm font-semibold text-ink">Categorías UOCRA (por hora)</h2>
            {(estado?.categorias ?? []).map((c) => (
              <label key={c.id} className="flex items-center justify-between gap-3 text-sm text-ink">
                {c.nombre}
                <input
                  aria-label={c.nombre}
                  type="number"
                  step="0.01"
                  value={importes[c.id] ?? ''}
                  onChange={(e) => setImportes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  className="w-32 rounded-md border border-line bg-surface px-2 py-1.5 text-right tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
              </label>
            ))}
            {(estado?.categorias ?? []).length === 0 && (
              <p className="text-sm text-slate">Sin categorías activas todavía.</p>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
            <h2 className="font-display text-sm font-semibold text-ink">Bono no remunerativo (opcional)</h2>
            <p className="text-xs text-slate">
              Dejalo vacío si UOCRA no anunció ningún bono este mes.
            </p>
            {(estado?.categorias ?? []).map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 text-sm text-ink">
                <span className="w-40 shrink-0">{c.nombre}</span>
                <select
                  aria-label={`Tipo de bono — ${c.nombre}`}
                  value={bonos[c.id]?.tipo ?? ''}
                  onChange={(e) =>
                    setBonos((prev) => ({
                      ...prev,
                      [c.id]: { tipo: e.target.value as TipoBonoNoRemunerativo | '', valor: prev[c.id]?.valor ?? '' },
                    }))
                  }
                  className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                >
                  <option value="">Sin bono este mes</option>
                  <option value="monto_fijo">Monto fijo</option>
                  <option value="porcentaje">% sobre la tarifa</option>
                </select>
                <input
                  aria-label={`Valor de bono — ${c.nombre}`}
                  type="number"
                  step="0.01"
                  disabled={!bonos[c.id]?.tipo}
                  value={bonos[c.id]?.valor ?? ''}
                  onChange={(e) =>
                    setBonos((prev) => ({ ...prev, [c.id]: { tipo: prev[c.id]?.tipo ?? '', valor: e.target.value } }))
                  }
                  className="w-28 rounded-md border border-line bg-surface px-2 py-1.5 tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-50"
                />
                <span className="text-slate">{bonos[c.id]?.tipo === 'porcentaje' ? '%' : '$'}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
            <h2 className="font-display text-sm font-semibold text-ink">Novedades con plus (por día)</h2>
            {(estado?.tiposNovedad ?? []).map((t) => (
              <label key={t.id} className="flex items-center justify-between gap-3 text-sm text-ink">
                {t.nombre}
                <input
                  aria-label={t.nombre}
                  type="number"
                  step="0.01"
                  value={montos[t.id] ?? ''}
                  onChange={(e) => setMontos((prev) => ({ ...prev, [t.id]: e.target.value }))}
                  className="w-32 rounded-md border border-line bg-surface px-2 py-1.5 text-right tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
              </label>
            ))}
            {(estado?.tiposNovedad ?? []).length === 0 && (
              <p className="text-sm text-slate">No hay tipos de novedad marcados como &quot;genera plus&quot;.</p>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
            <h2 className="font-display text-sm font-semibold text-ink">Por tantos — rangos de km</h2>
            {rangos.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-sm text-ink">
                <input
                  aria-label={`Rango ${i + 1} km desde`}
                  type="number"
                  step="0.01"
                  value={r.kmDesde}
                  onChange={(e) => actualizarRango(i, 'kmDesde', e.target.value)}
                  className="w-20 rounded-md border border-line bg-surface px-2 py-1.5 tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
                <span className="text-slate">a</span>
                <input
                  aria-label={`Rango ${i + 1} km hasta`}
                  type="number"
                  step="0.01"
                  placeholder="sin techo"
                  value={r.kmHasta}
                  onChange={(e) => actualizarRango(i, 'kmHasta', e.target.value)}
                  className="w-24 rounded-md border border-line bg-surface px-2 py-1.5 tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
                <span className="text-slate">km →</span>
                <input
                  aria-label={`Rango ${i + 1} precio por km`}
                  type="number"
                  step="0.01"
                  value={r.precioPorKm}
                  onChange={(e) => actualizarRango(i, 'precioPorKm', e.target.value)}
                  className="w-28 rounded-md border border-line bg-surface px-2 py-1.5 tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
                <span className="text-slate">$/km</span>
              </div>
            ))}
          </div>

          {modo === 'nueva' ? (
            <button
              type="button"
              disabled={!puedeConfirmar || cargarRonda.isPending}
              onClick={confirmar}
              className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
            >
              Confirmar tarifas de {objetivo ? etiquetaPeriodo(objetivo) : '…'}
            </button>
          ) : (
            <button
              type="button"
              disabled={!puedeConfirmar || actualizarRonda.isPending}
              onClick={pedirConfirmacionEdicion}
              className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
            >
              Guardar cambios de {objetivoEditar ? etiquetaPeriodo(objetivoEditar) : '…'}
            </button>
          )}
        </>
      )}

      {dialogConfirmacion && objetivoActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md space-y-4 rounded-xl bg-surface p-6">
            <h3 className="font-display text-base font-semibold text-ink">
              Confirmar edición de {etiquetaPeriodo(objetivoActivo)}
            </h3>
            <p className="text-sm text-slate">{AVISO_EDICION}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDialogConfirmacion(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-accent/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEdicion}
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95"
              >
                Confirmar y guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
