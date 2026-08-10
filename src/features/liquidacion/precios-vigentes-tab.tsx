'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { FiltroNumero, FiltroSelect } from '@/components/ui/barra-filtros';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
type Rango = { kmDesde: string; kmHasta: string; precioPorKm: string };
type Bono = { tipo: TipoBonoNoRemunerativo | ''; valor: string };

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

/** <0 si a es anterior a b, 0 si es el mismo mes, >0 si a es posterior. */
function compararPeriodo(a: Periodo, b: Periodo) {
  return a.anio - b.anio || a.mes - b.mes;
}

/** Formato es-AR con dos decimales; '' o no numérico → '—'. */
function formatearImporte(v: string | undefined) {
  if (v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const RANGOS_DEFAULT: Rango[] = [
  { kmDesde: '0', kmHasta: '60', precioPorKm: '' },
  { kmDesde: '60', kmHasta: '75', precioPorKm: '' },
  { kmDesde: '75', kmHasta: '', precioPorKm: '' },
];

const AVISO_EDICION =
  'Vas a modificar precios de un período ya cargado. Esto recalcula todas las quincenas de ese ' +
  'mes: si ya las liquidaste con los valores anteriores, el panel dejará de coincidir con lo ' +
  'pagado. El cambio queda auditado.';

const MESES_OPCIONES = NOMBRES_MES.map((nombre, i) => ({ value: i + 1, label: nombre }));

export function PreciosVigentesTab() {
  const { data: estado, isLoading } = useEstadoTarifas();
  const cargarRonda = useCargarRondaTarifas();
  const actualizarRonda = useActualizarRondaTarifas();

  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [modo, setModo] = useState<'lectura' | 'edicion'>('lectura');
  const [dialogConfirmacion, setDialogConfirmacion] = useState(false);

  const [importes, setImportes] = useState<Record<number, string>>({});
  const [montos, setMontos] = useState<Record<number, string>>({});
  const [rangos, setRangos] = useState<Rango[]>(RANGOS_DEFAULT);
  const [bonos, setBonos] = useState<Record<number, Bono>>({});

  const objetivo = useMemo<Periodo>(() => ({ anio, mes }), [anio, mes]);

  // Por defecto arrancamos parados en el último período cargado.
  const posicionado = useRef(false);
  useEffect(() => {
    if (!estado || posicionado.current) return;
    posicionado.current = true;
    if (estado.ultimoPeriodo) {
      setAnio(estado.ultimoPeriodo.anio);
      setMes(estado.ultimoPeriodo.mes);
    }
  }, [estado]);

  // Cambiar de período siempre vuelve a modo lectura: evita mezclar edits a
  // medio hacer de un mes con los datos de otro.
  useEffect(() => {
    setModo('lectura');
  }, [anio, mes]);

  // Un período "ya cargado" es cualquiera hasta el último período conocido
  // (inclusive): ahí el GET /tarifas/ronda/:anio/:mes trae datos (o 404 si es
  // anterior a la primera ronda que se haya cargado alguna vez). Un período
  // posterior al último cargado es, por definición, uno que todavía no tiene
  // precios propios.
  const periodoCargado = estado?.ultimoPeriodo != null && compararPeriodo(objetivo, estado.ultimoPeriodo) <= 0;

  const {
    data: rondaPeriodo,
    isLoading: cargandoRondaPeriodo,
    error: errorRondaPeriodo,
  } = useRondaPeriodo(objetivo.anio, objetivo.mes, periodoCargado);

  // Período ya cargado pero el GET no encontró nada: es anterior a la
  // primera ronda que se haya cargado alguna vez. No hay nada que mostrar ni
  // editar ahí.
  const sinPreciosPrevios = periodoCargado && !cargandoRondaPeriodo && errorRondaPeriodo != null;

  /**
   * Valores "de la fuente de verdad" para el período elegido: si ya tiene
   * precios propios, los del GET; si no, la propuesta (valores vigentes
   * actuales). Se usa tanto para precargar/mostrar en modo lectura como para
   * reiniciar el form al entrar a editar o al cancelar una edición.
   */
  function valoresFuente(): { importes: Record<number, string>; montos: Record<number, string>; rangos: Rango[]; bonos: Record<number, Bono> } | null {
    if (periodoCargado) {
      if (!rondaPeriodo) return null;
      return {
        importes: Object.fromEntries(rondaPeriodo.categorias.map((c) => [c.id, c.importeHora])),
        montos: Object.fromEntries(rondaPeriodo.tiposNovedad.map((t) => [t.id, t.montoPorDia])),
        rangos: rondaPeriodo.rangosKm.length
          ? rondaPeriodo.rangosKm.map((r) => ({ kmDesde: r.kmDesde, kmHasta: r.kmHasta ?? '', precioPorKm: r.precioPorKm }))
          : RANGOS_DEFAULT,
        bonos: Object.fromEntries(
          rondaPeriodo.categorias.map((c) => [
            c.id,
            { tipo: c.bonoNoRemunerativo?.tipo ?? '', valor: c.bonoNoRemunerativo?.valor ?? '' },
          ]),
        ),
      };
    }
    if (!estado) return null;
    return {
      importes: Object.fromEntries(estado.categorias.map((c) => [c.id, c.importeHoraActual ?? ''])),
      montos: Object.fromEntries(estado.tiposNovedad.map((t) => [t.id, t.montoPorDiaActual ?? ''])),
      rangos: estado.rangosKm.length
        ? estado.rangosKm.map((r) => ({ kmDesde: r.kmDesde, kmHasta: r.kmHasta ?? '', precioPorKm: r.precioPorKmActual }))
        : RANGOS_DEFAULT,
      bonos: Object.fromEntries(
        estado.categorias.map((c) => [
          c.id,
          { tipo: c.bonoNoRemunerativoActual?.tipo ?? '', valor: c.bonoNoRemunerativoActual?.valor ?? '' },
        ]),
      ),
    };
  }

  // Precarga los valores del período elegido cada vez que cambia.
  useEffect(() => {
    const v = valoresFuente();
    if (!v) return;
    setImportes(v.importes);
    setMontos(v.montos);
    setRangos(v.rangos);
    setBonos(v.bonos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoCargado, rondaPeriodo, estado, anio, mes]);

  const faltantes = useMemo(() => {
    if (periodoCargado || !estado?.ultimoPeriodo) return [];
    return mesesEntre(estado.ultimoPeriodo, objetivo);
  }, [periodoCargado, estado, objetivo]);

  const camposCompletos =
    Object.values(importes).every((v) => v !== '') &&
    Object.values(montos).every((v) => v !== '') &&
    rangos.every((r) => r.kmDesde !== '' && r.precioPorKm !== '');

  const puedeGuardar = camposCompletos && !sinPreciosPrevios && !(periodoCargado && cargandoRondaPeriodo);
  const puedeEditar = !isLoading && !sinPreciosPrevios && !(periodoCargado && cargandoRondaPeriodo);

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

  function iniciarEdicion() {
    setModo('edicion');
  }

  function cancelarEdicion() {
    const v = valoresFuente();
    if (v) {
      setImportes(v.importes);
      setMontos(v.montos);
      setRangos(v.rangos);
      setBonos(v.bonos);
    }
    setModo('lectura');
  }

  function guardar() {
    if (!puedeGuardar) return;
    if (periodoCargado) {
      setDialogConfirmacion(true);
      return;
    }
    const promesa = cargarRonda.mutateAsync({ mes: objetivo.mes, anio: objetivo.anio, ...armarDto() });
    toast.promise(promesa, {
      loading: `Guardando precios de ${etiquetaPeriodo(objetivo)}…`,
      success: `Precios de ${etiquetaPeriodo(objetivo)} guardados`,
      error: (e) => mensajeDeError(e, 'No se pudieron guardar los precios'),
    });
    promesa.then(() => setModo('lectura')).catch(() => {});
  }

  function confirmarEdicion() {
    setDialogConfirmacion(false);
    const promesa = actualizarRonda.mutateAsync({ anio: objetivo.anio, mes: objetivo.mes, ...armarDto() });
    toast.promise(promesa, {
      loading: `Guardando precios de ${etiquetaPeriodo(objetivo)}…`,
      success: `Precios de ${etiquetaPeriodo(objetivo)} actualizados`,
      error: (e) => mensajeDeError(e, 'No se pudieron guardar los precios'),
    });
    promesa.then(() => setModo('lectura')).catch(() => {});
  }

  const tituloBoton = periodoCargado
    ? `Editar precios de ${etiquetaPeriodo(objetivo)}`
    : `Cargar precios de ${etiquetaPeriodo(objetivo)}`;

  return (
    <section className="space-y-5">
      <PageHeader
        title={`Precios de ${etiquetaPeriodo(objetivo)}`}
        action={
          modo === 'lectura' && puedeEditar ? (
            <button
              type="button"
              onClick={iniciarEdicion}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95"
            >
              {tituloBoton}
            </button>
          ) : undefined
        }
      />
      <p className="text-sm text-slate">
        Los precios (categorías UOCRA, novedades con plus y rangos de km) se cargan juntos, por
        mes. Elegí el período: si dejaste algún mes sin cargar, el sistema lo completa
        automáticamente copiando el último valor conocido.
      </p>

      {isLoading ? (
        <p className="text-slate">Cargando…</p>
      ) : (
        <>
          {modo === 'lectura' && (
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-sm text-slate">
                Último período cargado:{' '}
                <span className="font-medium text-ink">
                  {estado?.ultimoPeriodo ? etiquetaPeriodo(estado.ultimoPeriodo) : 'ninguno todavía'}
                </span>
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <FiltroSelect
                  label="Mes"
                  value={mes}
                  onChange={(v) => setMes(Number(v))}
                  opciones={MESES_OPCIONES}
                  opcional={false}
                />
                <FiltroNumero label="Año" value={anio} onChange={(v) => setAnio(Number(v) || anio)} className="w-24" />
              </div>
            </div>
          )}

          {sinPreciosPrevios ? (
            <div className="rounded-xl border border-line bg-surface p-4 text-sm text-slate">
              No hay precios cargados para este mes.
            </div>
          ) : periodoCargado && cargandoRondaPeriodo ? (
            <p className="text-sm text-slate">Cargando precios de {etiquetaPeriodo(objetivo)}…</p>
          ) : modo === 'lectura' ? (
            <>
              {!periodoCargado && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  Este mes aún no tiene precios propios — se muestran los últimos vigentes.
                </div>
              )}

              <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
                <h2 className="font-display text-sm font-semibold text-ink">Precio por hora por categoría</h2>
                {(estado?.categorias ?? []).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right">Precio por hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(estado?.categorias ?? []).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.nombre}</TableCell>
                          <TableCell className="text-right tabular-nums">${formatearImporte(importes[c.id])}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-slate">Sin categorías activas todavía.</p>
                )}
              </div>

              <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
                <h2 className="font-display text-sm font-semibold text-ink">Monto por novedad (por cada carga declarada)</h2>
                {(estado?.tiposNovedad ?? []).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo de novedad</TableHead>
                        <TableHead className="text-right">Monto por novedad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(estado?.tiposNovedad ?? []).map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.nombre}</TableCell>
                          <TableCell className="text-right tabular-nums">${formatearImporte(montos[t.id])}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-slate">No hay tipos de novedad marcados como &quot;genera plus&quot;.</p>
                )}
              </div>

              <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
                <h2 className="font-display text-sm font-semibold text-ink">Rangos de km</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Desde</TableHead>
                      <TableHead>Hasta</TableHead>
                      <TableHead className="text-right">Precio por km</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rangos.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{formatearImporte(r.kmDesde)} km</TableCell>
                        <TableCell>{r.kmHasta === '' ? 'sin techo' : `${formatearImporte(r.kmHasta)} km`}</TableCell>
                        <TableCell className="text-right tabular-nums">${formatearImporte(r.precioPorKm)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
                <h2 className="font-display text-sm font-semibold text-ink">Bono por categoría</h2>
                {(estado?.categorias ?? []).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(estado?.categorias ?? []).map((c) => {
                        const b = bonos[c.id];
                        const sinBono = !b || b.tipo === '' || b.valor === '';
                        return (
                          <TableRow key={c.id}>
                            <TableCell>{c.nombre}</TableCell>
                            <TableCell>{sinBono ? '—' : b.tipo === 'porcentaje' ? '% sobre la tarifa' : 'Monto fijo'}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {sinBono ? '—' : b.tipo === 'porcentaje' ? `${formatearImporte(b.valor)}%` : `$${formatearImporte(b.valor)}`}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-slate">Sin categorías activas todavía.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate">
                Editando precios de <span className="font-medium text-ink">{etiquetaPeriodo(objetivo)}</span>
              </p>

              {faltantes.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  Faltan cargar: <strong>{faltantes.map(etiquetaPeriodo).join(', ')}</strong>. Se van a
                  completar automáticamente copiando el último valor conocido (
                  {estado?.ultimoPeriodo ? etiquetaPeriodo(estado.ultimoPeriodo) : ''}). Para{' '}
                  <strong>{etiquetaPeriodo(objetivo)}</strong>, revisá los valores de abajo: dejalos
                  igual para copiarlos también, o cambialos para cargar precios nuevos.
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
                <h2 className="font-display text-sm font-semibold text-ink">Novedades con plus (por carga)</h2>
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

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="rounded-md px-4 py-2 text-sm font-medium text-ink hover:bg-accent/50"
                >
                  Cancelar edición
                </button>
                <button
                  type="button"
                  disabled={!puedeGuardar || cargarRonda.isPending || actualizarRonda.isPending}
                  onClick={guardar}
                  className="rounded-md bg-brand px-4 py-2 font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
                >
                  Guardar precios de {etiquetaPeriodo(objetivo)}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {dialogConfirmacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md space-y-4 rounded-xl bg-surface p-6">
            <h3 className="font-display text-base font-semibold text-ink">
              Confirmar precios de {etiquetaPeriodo(objetivo)}
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
