'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { FiltroNumero, FiltroSelect } from '@/components/ui/barra-filtros';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useCategoriasPeriodo,
  useGuardarCategoriasPeriodo,
  useBonosPeriodo,
  useGuardarBonosPeriodo,
  useNovedadesPlusPeriodo,
  useGuardarNovedadesPlusPeriodo,
  useRangosKmPeriodo,
  useGuardarRangosKmPeriodo,
  mensajeDeError,
  type TipoBonoNoRemunerativo,
} from '@/lib/api/liquidacion';
import { aplicarIncremento } from './incremento';
import { SeccionPlusIndividual } from './seccion-plus-individual';

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_OPCIONES = NOMBRES_MES.map((nombre, i) => ({ value: i + 1, label: nombre }));

function etiquetaPeriodo(anio: number, mes: number) {
  return `${NOMBRES_MES[mes - 1]} ${anio}`;
}

/** Formato es-AR con dos decimales; '' o no numérico → '—'. */
function formatearImporte(v: string | undefined) {
  if (v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Cada sección de precios (categorías, bono, novedades con plus, rangos de
 * km) se edita y guarda de forma INDEPENDIENTE — pedido explícito del
 * usuario tras ver la pantalla vieja (todo en un único formulario largo, sin
 * poder tocar solo una parte). Comparten el período (mes/año) elegido arriba,
 * nada más — no hay un "guardar todo" en común (ADR-018).
 */
export function PreciosVigentesTab() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  return (
    <section className="space-y-5">
      <PageHeader title={`Precios de ${etiquetaPeriodo(anio, mes)}`} />
      <p className="text-sm text-slate">
        Cada sección se resuelve y se guarda por separado, para el período elegido. Un campo sin
        resolver para este mes muestra el último precio conocido (de un mes anterior) solo como
        referencia — no se aplica solo al cálculo hasta que lo cargues y confirmes vos.
      </p>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4">
        <FiltroSelect label="Mes" value={mes} onChange={(v) => setMes(Number(v))} opciones={MESES_OPCIONES} opcional={false} />
        <FiltroNumero label="Año" value={anio} onChange={(v) => setAnio(Number(v) || anio)} className="w-24" />
      </div>

      <SeccionCategorias anio={anio} mes={mes} />
      <SeccionBono anio={anio} mes={mes} />
      <SeccionNovedadesPlus anio={anio} mes={mes} />
      <SeccionRangosKm anio={anio} mes={mes} />
      <SeccionPlusIndividual titulo="Plus individual (por empleado, por quincena)" />
    </section>
  );
}

function TarjetaSeccion({ titulo, children, accion }: { titulo: string; children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold text-ink">{titulo}</h2>
        {accion}
      </div>
      {children}
    </div>
  );
}

function AvisoSinResolver({ periodo }: { periodo: string }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      Esta sección todavía no tiene valores propios de {periodo}.
    </div>
  );
}

function ConfirmarEdicionDialog({ periodo, onCancelar, onConfirmar }: { periodo: string; onCancelar: () => void; onConfirmar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md space-y-4 rounded-xl bg-surface p-6">
        <h3 className="font-display text-base font-semibold text-ink">Confirmar cambio de {periodo}</h3>
        <p className="text-sm text-slate">
          Vas a modificar un valor ya resuelto para este período. Esto recalcula las quincenas de ese
          mes: si ya las liquidaste con el valor anterior, el panel dejará de coincidir con lo pagado.
          El cambio queda auditado.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancelar} className="rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-accent/50">
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95">
            Confirmar y guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Categorías UOCRA (obligatorio) ----
function SeccionCategorias({ anio, mes }: { anio: number; mes: number }) {
  const { data, isLoading } = useCategoriasPeriodo(anio, mes);
  const guardar = useGuardarCategoriasPeriodo();
  const [modo, setModo] = useState<'lectura' | 'edicion'>('lectura');
  const [importes, setImportes] = useState<Record<number, string>>({});
  const [pct, setPct] = useState('');
  const [dialogPct, setDialogPct] = useState(false);
  const [dialogConfirmar, setDialogConfirmar] = useState(false);

  useEffect(() => {
    setModo('lectura');
  }, [anio, mes]);

  function iniciarEdicion() {
    setImportes(Object.fromEntries((data ?? []).map((c) => [c.id, c.importeHora ?? ''])));
    setModo('edicion');
  }

  /** Último precio conocido: el valor resuelto de este período si ya lo tiene, si no la sugerencia. */
  function ultimoPrecio(c: { resuelto: boolean; importeHora: string | null; sugerencia: { valor: string } | null }) {
    return c.resuelto ? (c.importeHora ?? '') : (c.sugerencia?.valor ?? '');
  }

  function usarUltimosPrecios() {
    setImportes((prev) => {
      const next = { ...prev };
      for (const c of data ?? []) {
        if (!next[c.id]) {
          const u = ultimoPrecio(c);
          if (u) next[c.id] = u;
        }
      }
      return next;
    });
  }

  const periodo = etiquetaPeriodo(anio, mes);
  const hayAlgunoResuelto = (data ?? []).some((c) => c.resuelto);

  function guardarAhora() {
    const categorias = (data ?? []).map((c) => ({ categoriaUocraId: c.id, importeHora: Number(importes[c.id]) }));
    const promesa = guardar.mutateAsync({ anio, mes, categorias });
    toast.promise(promesa, {
      loading: `Guardando categorías de ${periodo}…`,
      success: `Categorías de ${periodo} guardadas`,
      error: (e) => mensajeDeError(e, 'No se pudieron guardar las categorías'),
    });
    promesa.then(() => setModo('lectura')).catch(() => {});
  }

  function onGuardarClick() {
    if (hayAlgunoResuelto) setDialogConfirmar(true);
    else guardarAhora();
  }

  const completo = Object.values(importes).every((v) => v !== '' && !Number.isNaN(Number(v)));

  return (
    <TarjetaSeccion
      titulo="Precio por hora por categoría"
      accion={
        modo === 'lectura' && !isLoading ? (
          <button type="button" onClick={iniciarEdicion} className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-accent/60">
            Editar categorías
          </button>
        ) : undefined
      }
    >
      {isLoading ? (
        <p className="text-sm text-slate">Cargando…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-slate">Sin categorías activas todavía.</p>
      ) : modo === 'lectura' ? (
        <>
          {!hayAlgunoResuelto && <AvisoSinResolver periodo={periodo} />}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio por hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.resuelto ? (
                      `$${formatearImporte(c.importeHora ?? undefined)}`
                    ) : c.sugerencia ? (
                      <span className="text-amber-700">Último precio: ${formatearImporte(c.sugerencia.valor)}</span>
                    ) : (
                      <span className="text-slate">sin resolver</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={usarUltimosPrecios}
              className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-slate transition hover:bg-accent/60"
            >
              Usar últimos precios
            </button>
            <label className="flex flex-col text-xs text-slate">
              Incremento (%)
              <input
                aria-label="Porcentaje de incremento de categorías"
                type="number"
                step="0.01"
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                className="w-28 rounded-md border border-line bg-surface px-2 py-1.5 tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </label>
            <button
              type="button"
              disabled={!pct || Number.isNaN(Number(pct))}
              onClick={() => setDialogPct(true)}
              className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-slate transition hover:bg-accent/60 disabled:opacity-50"
            >
              Aplicar a todas
            </button>
          </div>
          {(data ?? []).map((c) => (
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
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setModo('lectura')} className="rounded-md px-4 py-2 text-sm font-medium text-ink hover:bg-accent/50">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!completo || guardar.isPending}
              onClick={onGuardarClick}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
            >
              Guardar categorías de {periodo}
            </button>
          </div>
        </>
      )}

      {dialogPct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md space-y-4 rounded-xl bg-surface p-6">
            <h3 className="font-display text-base font-semibold text-ink">
              {Number(pct) >= 0 ? 'Aumentar' : 'Bajar'} todas las categorías un {Math.abs(Number(pct))}%
            </h3>
            <p className="text-sm text-slate">
              Se calcula sobre el último precio de cada categoría (no sobre lo tipeado); se prellenan
              los campos, nada se guarda hasta confirmar el guardado de abajo.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDialogPct(false)} className="rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-accent/50">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const base = Object.fromEntries((data ?? []).map((c) => [c.id, ultimoPrecio(c)]));
                  setImportes(aplicarIncremento(base, Number(pct)));
                  setDialogPct(false);
                }}
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95"
              >
                Aplicar {Number(pct) >= 0 ? '+' : ''}{Number(pct)}%
              </button>
            </div>
          </div>
        </div>
      )}

      {dialogConfirmar && (
        <ConfirmarEdicionDialog periodo={periodo} onCancelar={() => setDialogConfirmar(false)} onConfirmar={() => { setDialogConfirmar(false); guardarAhora(); }} />
      )}
    </TarjetaSeccion>
  );
}

// ---- Bono no remunerativo (único campo opcional) ----
function SeccionBono({ anio, mes }: { anio: number; mes: number }) {
  const { data, isLoading } = useBonosPeriodo(anio, mes);
  const guardar = useGuardarBonosPeriodo();
  const [modo, setModo] = useState<'lectura' | 'edicion'>('lectura');
  const [bonos, setBonos] = useState<Record<number, { tipo: TipoBonoNoRemunerativo | ''; valor: string }>>({});
  const [dialogConfirmar, setDialogConfirmar] = useState(false);

  useEffect(() => {
    setModo('lectura');
  }, [anio, mes]);

  function iniciarEdicion() {
    setBonos(
      Object.fromEntries(
        (data ?? []).map((b) => [
          b.categoriaUocraId,
          b.bono ? { tipo: b.bono.tipo, valor: b.bono.valor } : { tipo: '' as const, valor: '' },
        ]),
      ),
    );
    setModo('edicion');
  }

  function usarUltimosPrecios() {
    setBonos((prev) => {
      const next = { ...prev };
      for (const b of data ?? []) {
        if (!next[b.categoriaUocraId]?.tipo && b.sugerencia) {
          next[b.categoriaUocraId] = { tipo: b.sugerencia.tipo, valor: b.sugerencia.valor };
        }
      }
      return next;
    });
  }

  const periodo = etiquetaPeriodo(anio, mes);
  const hayAlgunoResuelto = (data ?? []).some((b) => b.resuelto);

  function guardarAhora() {
    // "Sin bono este mes" es una decisión explícita: se manda SIEMPRE una fila
    // por categoría (tipo/valor 0 si quedó vacío), nunca se omite — omitir
    // dejaría el período sin resolver en vez de "decidido: sin bono".
    const bonosDto = (data ?? []).map((b) => {
      const edit = bonos[b.categoriaUocraId];
      return {
        categoriaUocraId: b.categoriaUocraId,
        tipo: (edit?.tipo || 'monto_fijo') as TipoBonoNoRemunerativo,
        valor: edit?.valor ? Number(edit.valor) : 0,
      };
    });
    const promesa = guardar.mutateAsync({ anio, mes, bonos: bonosDto });
    toast.promise(promesa, {
      loading: `Guardando bonos de ${periodo}…`,
      success: `Bonos de ${periodo} guardados`,
      error: (e) => mensajeDeError(e, 'No se pudieron guardar los bonos'),
    });
    promesa.then(() => setModo('lectura')).catch(() => {});
  }

  function onGuardarClick() {
    if (hayAlgunoResuelto) setDialogConfirmar(true);
    else guardarAhora();
  }

  return (
    <TarjetaSeccion
      titulo="Bono no remunerativo por categoría (opcional)"
      accion={
        modo === 'lectura' && !isLoading ? (
          <button type="button" onClick={iniciarEdicion} className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-accent/60">
            Editar bonos
          </button>
        ) : undefined
      }
    >
      {isLoading ? (
        <p className="text-sm text-slate">Cargando…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-slate">Sin categorías activas todavía.</p>
      ) : modo === 'lectura' ? (
        <>
          {!hayAlgunoResuelto && <AvisoSinResolver periodo={periodo} />}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((b) => (
                <TableRow key={b.categoriaUocraId}>
                  <TableCell>{b.nombre}</TableCell>
                  <TableCell>
                    {b.resuelto ? (
                      Number(b.bono?.valor) > 0 ? (b.bono?.tipo === 'porcentaje' ? '% sobre la tarifa' : 'Monto fijo') : 'Sin bono este mes (decidido)'
                    ) : (
                      <span className="text-amber-700">sin resolver</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {b.resuelto
                      ? Number(b.bono?.valor) > 0
                        ? b.bono?.tipo === 'porcentaje' ? `${formatearImporte(b.bono?.valor)}%` : `$${formatearImporte(b.bono?.valor)}`
                        : '—'
                      : b.sugerencia
                        ? <span className="text-amber-700">Último precio: {b.sugerencia.tipo === 'porcentaje' ? `${formatearImporte(b.sugerencia.valor)}%` : `$${formatearImporte(b.sugerencia.valor)}`}</span>
                        : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : (
        <>
          <p className="text-xs text-slate">Elegí &quot;Sin bono este mes&quot; para dejar constancia explícita de que UOCRA no anunció nada — no es lo mismo que dejarlo sin revisar.</p>
          <button
            type="button"
            onClick={usarUltimosPrecios}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-slate transition hover:bg-accent/60"
          >
            Usar últimos precios
          </button>
          {(data ?? []).map((b) => (
            <div key={b.categoriaUocraId} className="flex flex-wrap items-center gap-2 text-sm text-ink">
              <span className="w-40 shrink-0">{b.nombre}</span>
              <select
                aria-label={`Tipo de bono — ${b.nombre}`}
                value={bonos[b.categoriaUocraId]?.tipo ?? ''}
                onChange={(e) => setBonos((prev) => ({ ...prev, [b.categoriaUocraId]: { tipo: e.target.value as TipoBonoNoRemunerativo | '', valor: prev[b.categoriaUocraId]?.valor ?? '' } }))}
                className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              >
                <option value="">Sin bono este mes</option>
                <option value="monto_fijo">Monto fijo</option>
                <option value="porcentaje">% sobre la tarifa</option>
              </select>
              <input
                aria-label={`Valor de bono — ${b.nombre}`}
                type="number"
                step="0.01"
                disabled={!bonos[b.categoriaUocraId]?.tipo}
                value={bonos[b.categoriaUocraId]?.valor ?? ''}
                onChange={(e) => setBonos((prev) => ({ ...prev, [b.categoriaUocraId]: { tipo: prev[b.categoriaUocraId]?.tipo ?? '', valor: e.target.value } }))}
                className="w-28 rounded-md border border-line bg-surface px-2 py-1.5 tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-50"
              />
              <span className="text-slate">{bonos[b.categoriaUocraId]?.tipo === 'porcentaje' ? '%' : '$'}</span>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setModo('lectura')} className="rounded-md px-4 py-2 text-sm font-medium text-ink hover:bg-accent/50">
              Cancelar
            </button>
            <button
              type="button"
              disabled={guardar.isPending}
              onClick={onGuardarClick}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
            >
              Guardar bonos de {periodo}
            </button>
          </div>
        </>
      )}

      {dialogConfirmar && (
        <ConfirmarEdicionDialog periodo={periodo} onCancelar={() => setDialogConfirmar(false)} onConfirmar={() => { setDialogConfirmar(false); guardarAhora(); }} />
      )}
    </TarjetaSeccion>
  );
}

// ---- Novedades con plus — Guardia Pasiva, Viáticos, etc. (obligatorio) ----
function SeccionNovedadesPlus({ anio, mes }: { anio: number; mes: number }) {
  const { data, isLoading } = useNovedadesPlusPeriodo(anio, mes);
  const guardar = useGuardarNovedadesPlusPeriodo();
  const [modo, setModo] = useState<'lectura' | 'edicion'>('lectura');
  const [montos, setMontos] = useState<Record<number, string>>({});
  const [dialogConfirmar, setDialogConfirmar] = useState(false);

  useEffect(() => {
    setModo('lectura');
  }, [anio, mes]);

  function iniciarEdicion() {
    setMontos(Object.fromEntries((data ?? []).map((t) => [t.tipoNovedadId, t.montoPorDia ?? ''])));
    setModo('edicion');
  }

  function usarUltimosPrecios() {
    setMontos((prev) => {
      const next = { ...prev };
      for (const t of data ?? []) {
        if (!next[t.tipoNovedadId] && t.sugerencia) next[t.tipoNovedadId] = t.sugerencia.valor;
      }
      return next;
    });
  }

  const periodo = etiquetaPeriodo(anio, mes);
  const hayAlgunoResuelto = (data ?? []).some((t) => t.resuelto);
  const completo = (data ?? []).every((t) => montos[t.tipoNovedadId] !== '' && !Number.isNaN(Number(montos[t.tipoNovedadId])));

  function guardarAhora() {
    const tiposNovedad = (data ?? []).map((t) => ({ tipoNovedadId: t.tipoNovedadId, montoPorDia: Number(montos[t.tipoNovedadId]) }));
    const promesa = guardar.mutateAsync({ anio, mes, tiposNovedad });
    toast.promise(promesa, {
      loading: `Guardando novedades con plus de ${periodo}…`,
      success: `Novedades con plus de ${periodo} guardadas`,
      error: (e) => mensajeDeError(e, 'No se pudieron guardar los montos'),
    });
    promesa.then(() => setModo('lectura')).catch(() => {});
  }

  function onGuardarClick() {
    if (hayAlgunoResuelto) setDialogConfirmar(true);
    else guardarAhora();
  }

  return (
    <TarjetaSeccion
      titulo="Monto por novedad con plus (Guardia Pasiva, Viáticos, etc.)"
      accion={
        modo === 'lectura' && !isLoading ? (
          <button type="button" onClick={iniciarEdicion} className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-accent/60">
            Editar montos
          </button>
        ) : undefined
      }
    >
      {isLoading ? (
        <p className="text-sm text-slate">Cargando…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-slate">No hay tipos de novedad marcados como &quot;genera plus&quot;.</p>
      ) : modo === 'lectura' ? (
        <>
          {!hayAlgunoResuelto && <AvisoSinResolver periodo={periodo} />}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de novedad</TableHead>
                <TableHead className="text-right">Monto por novedad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((t) => (
                <TableRow key={t.tipoNovedadId}>
                  <TableCell>{t.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {t.resuelto ? (
                      `$${formatearImporte(t.montoPorDia ?? undefined)}`
                    ) : t.sugerencia ? (
                      <span className="text-amber-700">Último precio: ${formatearImporte(t.sugerencia.valor)}</span>
                    ) : (
                      <span className="text-slate">sin resolver</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={usarUltimosPrecios}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-slate transition hover:bg-accent/60"
          >
            Usar últimos precios
          </button>
          {(data ?? []).map((t) => (
            <label key={t.tipoNovedadId} className="flex items-center justify-between gap-3 text-sm text-ink">
              {t.nombre}
              <input
                aria-label={t.nombre}
                type="number"
                step="0.01"
                value={montos[t.tipoNovedadId] ?? ''}
                onChange={(e) => setMontos((prev) => ({ ...prev, [t.tipoNovedadId]: e.target.value }))}
                className="w-32 rounded-md border border-line bg-surface px-2 py-1.5 text-right tabular-nums text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setModo('lectura')} className="rounded-md px-4 py-2 text-sm font-medium text-ink hover:bg-accent/50">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!completo || guardar.isPending}
              onClick={onGuardarClick}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
            >
              Guardar novedades con plus de {periodo}
            </button>
          </div>
        </>
      )}

      {dialogConfirmar && (
        <ConfirmarEdicionDialog periodo={periodo} onCancelar={() => setDialogConfirmar(false)} onConfirmar={() => { setDialogConfirmar(false); guardarAhora(); }} />
      )}
    </TarjetaSeccion>
  );
}

// ---- Rangos de km "por tantos" (obligatorio, reemplazo completo del período) ----
type Rango = { kmDesde: string; kmHasta: string; precioPorKm: string };
const RANGOS_DEFAULT: Rango[] = [
  { kmDesde: '0', kmHasta: '60', precioPorKm: '' },
  { kmDesde: '60', kmHasta: '75', precioPorKm: '' },
  { kmDesde: '75', kmHasta: '', precioPorKm: '' },
];

function SeccionRangosKm({ anio, mes }: { anio: number; mes: number }) {
  const { data, isLoading } = useRangosKmPeriodo(anio, mes);
  const guardar = useGuardarRangosKmPeriodo();
  const [modo, setModo] = useState<'lectura' | 'edicion'>('lectura');
  const [rangos, setRangos] = useState<Rango[]>(RANGOS_DEFAULT);
  const [dialogConfirmar, setDialogConfirmar] = useState(false);

  useEffect(() => {
    setModo('lectura');
  }, [anio, mes]);

  function iniciarEdicion() {
    const base = data?.resuelto ? data.rangosKm : undefined;
    setRangos(base?.length ? base.map((r) => ({ kmDesde: r.kmDesde, kmHasta: r.kmHasta ?? '', precioPorKm: r.precioPorKm })) : RANGOS_DEFAULT);
    setModo('edicion');
  }

  function actualizarRango(i: number, campo: keyof Rango, valor: string) {
    setRangos((prev) => prev.map((r, j) => (j === i ? { ...r, [campo]: valor } : r)));
  }

  function usarUltimosPrecios() {
    const sugerencia = data?.sugerencia?.rangosKm;
    if (!sugerencia?.length) return;
    setRangos(sugerencia.map((r) => ({ kmDesde: r.kmDesde, kmHasta: r.kmHasta ?? '', precioPorKm: r.precioPorKm })));
  }

  const periodo = etiquetaPeriodo(anio, mes);
  const completo = rangos.every((r) => r.kmDesde !== '' && r.precioPorKm !== '');

  function guardarAhora() {
    const rangosKm = rangos.map((r) => ({ kmDesde: Number(r.kmDesde), kmHasta: r.kmHasta === '' ? undefined : Number(r.kmHasta), precioPorKm: Number(r.precioPorKm) }));
    const promesa = guardar.mutateAsync({ anio, mes, rangosKm });
    toast.promise(promesa, {
      loading: `Guardando rangos de km de ${periodo}…`,
      success: `Rangos de km de ${periodo} guardados`,
      error: (e) => mensajeDeError(e, 'No se pudieron guardar los rangos'),
    });
    promesa.then(() => setModo('lectura')).catch(() => {});
  }

  function onGuardarClick() {
    if (data?.resuelto) setDialogConfirmar(true);
    else guardarAhora();
  }

  return (
    <TarjetaSeccion
      titulo="Rangos de km — régimen «por tantos»"
      accion={
        modo === 'lectura' && !isLoading ? (
          <button type="button" onClick={iniciarEdicion} className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-accent/60">
            Editar rangos
          </button>
        ) : undefined
      }
    >
      {isLoading ? (
        <p className="text-sm text-slate">Cargando…</p>
      ) : modo === 'lectura' ? (
        <>
          {!data?.resuelto && (
            <AvisoSinResolver periodo={periodo} />
          )}
          {!data?.resuelto && data?.sugerencia && (
            <p className="text-xs text-amber-700">Último precio:</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Desde</TableHead>
                <TableHead>Hasta</TableHead>
                <TableHead className="text-right">Precio por km</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.resuelto ? data.rangosKm : (data?.sugerencia?.rangosKm ?? [])).map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{formatearImporte(r.kmDesde)} km</TableCell>
                  <TableCell>{!r.kmHasta ? 'sin techo' : `${formatearImporte(r.kmHasta)} km`}</TableCell>
                  <TableCell className="text-right tabular-nums">${formatearImporte(r.precioPorKm)}</TableCell>
                </TableRow>
              ))}
              {!data?.resuelto && !data?.sugerencia && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate">Sin rangos cargados todavía.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={usarUltimosPrecios}
            disabled={!data?.sugerencia?.rangosKm?.length}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-slate transition hover:bg-accent/60 disabled:opacity-50"
          >
            Usar últimos precios
          </button>
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
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setModo('lectura')} className="rounded-md px-4 py-2 text-sm font-medium text-ink hover:bg-accent/50">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!completo || guardar.isPending}
              onClick={onGuardarClick}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:brightness-95 disabled:opacity-50"
            >
              Guardar rangos de {periodo}
            </button>
          </div>
        </>
      )}

      {dialogConfirmar && (
        <ConfirmarEdicionDialog periodo={periodo} onCancelar={() => setDialogConfirmar(false)} onConfirmar={() => { setDialogConfirmar(false); guardarAhora(); }} />
      )}
    </TarjetaSeccion>
  );
}
