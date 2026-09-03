'use client';

import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth/session';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/button';
import {
  usePreviewCarga,
  useConfirmarCarga,
  useProvinciasAnalytics,
  useContratosAnalytics,
  type FilaPreview,
  type RespuestaPreviewCarga,
  type RespuestaConfirmarCarga,
  type EdicionFilaCarga,
} from '@/lib/api/certificaciones';
import { revalidarFila, hojaCoincideConKs, validarArchivoCarga } from '@/features/certificaciones/carga/revalidar';

// Wizard de carga de certificaciones (Etapa 4 ERP). Rediseño 2026-09-03 según
// mockup aprobado por el usuario (memoria "redisenio-carga-certificaciones-
// aprobado"): stepper visible en todo el flujo, paso 1 ancho con guía de
// pasos, paso 3 con tarjetas de métricas + panel de problemas + filtros, y
// modal de resumen antes de cargar. La lógica (ediciones acumuladas por
// rowId, exclusión por hoja forzada al confirmar, server-authoritative) no
// cambia. Gate por nivel: admin y carga; lectura no ve esta pantalla.

const POR_PAGINA = 50;

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const inputCls =
  'rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60';

const BADGE_OK =
  'inline-flex items-center rounded-full bg-approved/10 px-2 py-0.5 text-xs font-medium text-approved ring-1 ring-inset ring-approved/25';
const BADGE_WARN =
  'inline-flex items-center rounded-full bg-warn/10 px-2 py-0.5 text-xs font-medium text-warn ring-1 ring-inset ring-warn/25';
const BADGE_EXCLUIDA =
  'inline-flex items-center rounded-full bg-slate/10 px-2 py-0.5 text-xs font-medium text-slate ring-1 ring-inset ring-slate/25';
const CHIP_K = 'inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand-deep ring-1 ring-inset ring-brand/30';

function mensajeError(e: unknown, fallback: string): string {
  return String((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback);
}

function fmtMoney(v: string | number | null): string {
  if (v === null || v === '') return '—';
  const n = Number(String(v).replace(',', '.'));
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function plural(n: number, uno: string, muchos: string): string {
  return n === 1 ? uno : muchos;
}

/** Valor a MOSTRAR en el input de $ Total: el archivo trae flotantes con cola
 * (2827089.4219859…); si la fila no fue editada se muestra redondeado a 2
 * decimales — solo la vista: lo que viaja al backend sigue siendo el valor
 * original, salvo que el usuario lo edite. */
function mostrarTotal(v: string | null, editado: boolean): string {
  if (v === null || v === '') return '';
  if (editado) return v;
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  const [, dec = ''] = v.split('.');
  return dec.length > 2 ? n.toFixed(2) : v;
}

/** Coma→punto para que un usuario es-AR pueda tipear "5,5" en cantidad/total. */
function normalizarDecimal(v: string): string {
  return v.trim().replace(',', '.');
}

/** Fila efectiva luego de aplicar la edición local acumulada. Igual criterio
 * que el backend: editar `contrato` cambia `contrato_fuente` a `'editado'`. */
function aplicarEdicion(f: FilaPreview, e: EdicionFilaCarga | undefined) {
  const contrato = e?.contrato ?? f.contrato;
  const contrato_fuente = e?.contrato !== undefined ? 'editado' : f.contrato_fuente;
  return {
    ...f,
    contrato,
    contrato_fuente,
    provincia: e?.provincia ?? f.provincia,
    cantidades: e?.cantidades ?? f.cantidades,
    total_mes: e?.total_mes ?? f.total_mes,
    excluida: e?.excluida ?? f.excluida,
  };
}

// ── Íconos (SVG inline, trazo 1.8, grilla 24) ────────────────────────────

function IconoSubir() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

function IconoArchivo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

function IconoRevisar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function IconoConfirmar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconoAviso({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function IconoTilde() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// ── Piezas de UI ─────────────────────────────────────────────────────────

const PASOS = ['Archivo y período', 'Hojas', 'Revisión', 'Cargado'];

/** Barra de progreso del wizard: visible en los 4 pasos. */
function Stepper({ actual }: { actual: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="flex items-center gap-3" aria-label="Pasos de la carga">
      {PASOS.map((nombre, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4;
        const hecho = n < actual;
        const activo = n === actual;
        return (
          <Fragment key={nombre}>
            <li className="flex items-center gap-2.5" aria-current={activo ? 'step' : undefined}>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold ring-1 ring-inset ${
                  hecho
                    ? 'bg-approved text-white ring-approved'
                    : activo
                      ? 'bg-brand text-ink ring-brand'
                      : 'bg-surface text-slate ring-line'
                }`}
              >
                {hecho ? <IconoTilde /> : n}
              </span>
              <span className={`text-[13px] ${activo ? 'font-medium text-ink' : 'text-slate'}`}>{nombre}</span>
            </li>
            {n < 4 && <li aria-hidden="true" className={`h-px flex-1 ${hecho ? 'bg-approved' : 'bg-line'}`} />}
          </Fragment>
        );
      })}
    </ol>
  );
}

function TarjetaGuia({ icono, titulo, texto }: { icono: ReactNode; titulo: string; texto: string }) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-line bg-surface p-4">
      <span className="mt-0.5 text-brand-deep">{icono}</span>
      <div>
        <p className="font-display text-sm font-semibold text-ink">{titulo}</p>
        <p className="mt-1 text-[13px] text-slate">{texto}</p>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  tone = 'ink',
  testId,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'ink' | 'ok' | 'warn';
  testId: string;
}) {
  const color = tone === 'ok' ? 'text-approved' : tone === 'warn' ? 'text-warn' : 'text-ink';
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
      <p className={`mt-1.5 whitespace-nowrap font-display text-xl font-semibold tabular-nums sm:text-2xl ${color}`} data-testid={testId}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs tabular-nums text-slate">{sub}</p>}
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────

export default function CargaCertificacionesPage() {
  const router = useRouter();
  const { perfil } = useSession();
  const nivel = perfil?.cert?.nivel ?? null;
  const puedeCargar = nivel === 'admin' || nivel === 'carga';

  const ahora = new Date();
  const anioActual = ahora.getFullYear();
  const mesActual = ahora.getMonth() + 1;
  const anios = useMemo(() => {
    const out: number[] = [];
    for (let a = anioActual; a >= 2022; a--) out.push(a);
    return out;
  }, [anioActual]);

  const previewMut = usePreviewCarga();
  const confirmarMut = useConfirmarCarga();
  const { data: provinciasDisponibles } = useProvinciasAnalytics();
  const { data: contratosDisponibles } = useContratosAnalytics();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [anio, setAnio] = useState(anioActual);
  const [mes, setMes] = useState(mesActual);
  const [preview, setPreview] = useState<RespuestaPreviewCarga | null>(null);
  const [hojasSel, setHojasSel] = useState<Set<string>>(new Set());
  const [ediciones, setEdiciones] = useState<Map<string, EdicionFilaCarga>>(new Map());
  const [pagina, setPagina] = useState(1);
  const [filtroHoja, setFiltroHoja] = useState('');
  const [soloProblemas, setSoloProblemas] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [resultado, setResultado] = useState<RespuestaConfirmarCarga | null>(null);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  if (!puedeCargar) return null;

  function elegirArchivo(f: File) {
    const err = validarArchivoCarga(f.name, f.size);
    setErrorArchivo(err);
    setArchivo(err ? null : f);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) elegirArchivo(f);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastrando(false);
    const f = e.dataTransfer.files?.[0];
    if (f) elegirArchivo(f);
  }

  async function subirYPrevisualizar() {
    if (!archivo) return;
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('periodo_anio', String(anio));
    form.append('periodo_mes', String(mes));
    try {
      const data = await previewMut.mutateAsync(form);
      setPreview(data);
      const ks = perfil?.cert?.ks ?? [];
      const admin = nivel === 'admin';
      setHojasSel(admin ? new Set(data.hojas) : new Set(data.hojas.filter((h) => hojaCoincideConKs(h, ks))));
      setEdiciones(new Map());
      setPagina(1);
      setFiltroHoja('');
      setSoloProblemas(false);
      setStep(2);
    } catch (e) {
      toast.error(mensajeError(e, 'No se pudo procesar el archivo'));
    }
  }

  function toggleHoja(h: string) {
    setHojasSel((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  }

  function setEdicionCampo(rowId: string, campo: 'provincia' | 'cantidades' | 'total_mes', valor: string) {
    const v = campo === 'cantidades' || campo === 'total_mes' ? normalizarDecimal(valor) : valor;
    setEdiciones((prev) => {
      const next = new Map(prev);
      const actual = next.get(rowId) ?? { rowId };
      next.set(rowId, { ...actual, [campo]: v });
      return next;
    });
  }

  function setExcluida(rowId: string, excluida: boolean) {
    setEdiciones((prev) => {
      const next = new Map(prev);
      const actual = next.get(rowId) ?? { rowId };
      next.set(rowId, { ...actual, excluida });
      return next;
    });
  }

  function toggleExpandida(rowId: string) {
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  /** Edición de contrato EN CASCADA: se propaga a todas las filas del mismo
   * item_codigo (puede repetirse en varias hojas/filas del mismo archivo). */
  function setContratoCascada(itemCodigo: string, nuevoContrato: string) {
    if (!preview) return;
    const filasDelItem = preview.filas.filter((f) => f.item_codigo === itemCodigo);
    setEdiciones((prev) => {
      const next = new Map(prev);
      for (const f of filasDelItem) {
        const actual = next.get(f.rowId) ?? { rowId: f.rowId };
        next.set(f.rowId, { ...actual, contrato: nuevoContrato });
      }
      return next;
    });
  }

  const filasEnHojas = preview ? preview.filas.filter((f) => hojasSel.has(f.hoja_origen)) : [];
  const provinciasValidas = provinciasDisponibles ?? [];

  const filasCalculadas = filasEnHojas.map((f) => {
    const vista = aplicarEdicion(f, ediciones.get(f.rowId));
    const { tieneError, detalle } = revalidarFila(vista, { itemExiste: f.item_en_maestro, provinciasValidas });
    return { original: f, vista, tieneError, detalle };
  });

  const conProblemaFilas = filasCalculadas.filter((r) => !r.vista.excluida && r.tieneError);
  const aCargar = filasCalculadas.filter((r) => !r.vista.excluida && !r.tieneError).length;
  const conProblema = conProblemaFilas.length;
  const excluidasCount = filasCalculadas.filter((r) => r.vista.excluida).length;
  const totalFilas = filasCalculadas.length;

  const montoACargar = filasCalculadas
    .filter((r) => !r.vista.excluida && !r.tieneError)
    .reduce((acc, r) => acc + (Number(r.vista.total_mes) || 0), 0);
  const montoConProblema = conProblemaFilas.reduce((acc, r) => acc + (Number(r.vista.total_mes) || 0), 0);
  // Un TOTAL MES en 0 en el archivo no es un total declarado (paridad con el portal).
  const totalDeclaradoCrudo = preview?.resumen.total_declarado ?? null;
  const totalDeclarado = totalDeclaradoCrudo ? totalDeclaradoCrudo : null;
  const descuadre = totalDeclarado !== null && Math.abs(montoACargar - totalDeclarado) > 0.01;
  const diferencia = totalDeclarado !== null ? totalDeclarado - montoACargar : 0;
  const descuadreExplicadoPorProblemas = descuadre && Math.abs(diferencia - montoConProblema) < 0.01;

  const contratosACargar = Array.from(
    new Set(filasCalculadas.filter((r) => !r.vista.excluida && !r.tieneError).map((r) => r.vista.contrato).filter(Boolean)),
  );

  const filasVisibles = filasCalculadas.filter(
    (r) => (filtroHoja === '' || r.original.hoja_origen === filtroHoja) && (!soloProblemas || (!r.vista.excluida && r.tieneError)),
  );
  const totalPaginas = Math.max(1, Math.ceil(filasVisibles.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const enPagina = filasVisibles.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  /** El backend es server-authoritative: inserta TODAS las filas de la sesión
   * que no lleguen con `excluida: true`, sin importar la selección de hojas
   * del paso 2 (esa selección solo filtra la VISTA del paso 3). Por eso acá,
   * al armar el payload, forzamos `excluida: true` para toda fila cuya hoja
   * quedó deseleccionada — por encima de cualquier edición acumulada de esa
   * fila, sin pisar el resto de sus campos editados. */
  function edicionesParaConfirmar(): EdicionFilaCarga[] {
    if (!preview) return [];
    const finales = new Map(ediciones);
    for (const f of preview.filas) {
      if (!hojasSel.has(f.hoja_origen)) {
        const actual = finales.get(f.rowId) ?? { rowId: f.rowId };
        finales.set(f.rowId, { ...actual, excluida: true });
      }
    }
    return Array.from(finales.values());
  }

  async function confirmar() {
    if (!preview) return;
    try {
      const data = await confirmarMut.mutateAsync({
        previewId: preview.previewId,
        ediciones: edicionesParaConfirmar(),
      });
      setModalAbierto(false);
      setResultado(data);
      setStep(4);
    } catch (e) {
      toast.error(mensajeError(e, 'No se pudo confirmar la carga'));
    }
  }

  function cargarOtra() {
    setArchivo(null);
    setErrorArchivo(null);
    setPreview(null);
    setHojasSel(new Set());
    setEdiciones(new Map());
    setResultado(null);
    setPagina(1);
    setFiltroHoja('');
    setSoloProblemas(false);
    setModalAbierto(false);
    setStep(1);
    if (inputRef.current) inputRef.current.value = '';
  }

  const periodoTexto = `${MESES[mes - 1].toLowerCase()} ${anio}`;

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Certificaciones" title="Cargar certificación" />
      <Stepper actual={step} />

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-5 rounded-xl border border-line bg-surface p-6 sm:p-7">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border-2 border-dashed px-8 py-10 text-center transition ${
                arrastrando ? 'border-brand bg-brand/5' : archivo ? 'border-approved/50 bg-approved/5' : 'border-line hover:border-brand'
              }`}
            >
              <input ref={inputRef} type="file" aria-label="Archivo" className="sr-only" onChange={handleInputChange} />
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-full ${
                  archivo ? 'bg-approved/10 text-approved' : 'bg-brand/15 text-brand-deep'
                }`}
              >
                <IconoSubir />
              </span>
              {archivo ? (
                <>
                  <p className="font-display text-lg font-semibold text-ink">{archivo.name}</p>
                  <p className="text-sm text-slate">
                    {(archivo.size / 1024 / 1024).toFixed(1)} MB · hacé clic para cambiarlo
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-lg font-semibold text-ink">Arrastrá el certificado acá</p>
                  <p className="text-sm text-slate">
                    o <span className="font-medium text-brand-deep underline-offset-2 hover:underline">elegí el archivo</span> desde tu
                    computadora
                  </p>
                </>
              )}
              <p className="text-xs text-slate">Excel (.xlsx, .xlsm) o PDF · hasta 20 MB</p>
            </div>
            {errorArchivo && <p className="text-sm text-danger">{errorArchivo}</p>}

            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink">Período de la certificación</span>
                <div className="flex gap-2.5">
                  <select aria-label="Mes" value={mes} onChange={(e) => setMes(Number(e.target.value))} className={`${inputCls} w-40`}>
                    {MESES.map((nombre, i) => (
                      <option key={nombre} value={i + 1}>
                        {nombre}
                      </option>
                    ))}
                  </select>
                  <select aria-label="Año" value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={`${inputCls} w-28`}>
                    {anios.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="mb-2 flex-1 text-[13px] text-slate">
                El período se aplica a todas las filas del archivo. El mes del archivo no se lee: se toma el que elegís acá.
              </p>
              <Button variant="primary" disabled={!archivo || previewMut.isPending} onClick={subirYPrevisualizar}>
                {previewMut.isPending ? 'Procesando…' : 'Continuar'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            <TarjetaGuia
              icono={<IconoArchivo />}
              titulo="1 · Subís el certificado de Naturgy"
              texto="Lo leemos hoja por hoja y detectamos contrato, ítems, cantidades y totales."
            />
            <TarjetaGuia
              icono={<IconoRevisar />}
              titulo="2 · Elegís hojas y revisás"
              texto="Ves cuántas filas y qué monto se va a cargar, y corregís contrato, provincia, cantidad o total si hace falta."
            />
            <TarjetaGuia
              icono={<IconoConfirmar />}
              titulo="3 · Confirmás"
              texto="Un resumen final antes de cargar. Después queda en el Resumen y en el Historial, y se puede deshacer."
            />
          </div>
        </div>
      )}

      {step === 2 && preview && (
        <div className="space-y-4 rounded-xl border border-line bg-surface p-6">
          <div>
            <p className="font-display text-base font-semibold text-ink">Elegí las hojas que querés cargar</p>
            <p className="mt-1 text-sm text-slate">
              <span className="font-medium text-ink">{preview.archivo}</span> · {periodoTexto} · {preview.hojas.length}{' '}
              {plural(preview.hojas.length, 'hoja', 'hojas')}
              {nivel === 'carga' && ' · preseleccionamos las de tus contratos'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {preview.hojas.map((h) => {
              const activo = hojasSel.has(h);
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => toggleHoja(h)}
                  aria-pressed={activo}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 ring-inset transition ${
                    activo ? 'bg-brand/10 text-brand-deep ring-brand/30' : 'bg-surface text-slate ring-line hover:text-ink'
                  }`}
                >
                  {activo && <IconoTilde />}
                  {h}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-slate">
                {hojasSel.size} de {preview.hojas.length} {plural(preview.hojas.length, 'hoja', 'hojas')}
              </span>
              <Button variant="primary" disabled={hojasSel.size === 0} onClick={() => setStep(3)}>
                Ver filas
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate">
              Archivo <span className="font-medium text-ink">{preview.archivo}</span> · {periodoTexto} · {hojasSel.size}{' '}
              {plural(hojasSel.size, 'hoja seleccionada', 'hojas seleccionadas')}
            </p>
            {contratosACargar.length > 0 && (
              <div className="flex flex-wrap gap-1.5" aria-label="Contratos a cargar">
                {contratosACargar.map((k) => (
                  <span key={k} className={CHIP_K}>
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <StatTile
              label="Filas a cargar"
              value={String(aCargar)}
              sub={`de ${totalFilas} ${plural(totalFilas, 'leída', 'leídas')}`}
              tone="ok"
              testId="metrica-a-cargar"
            />
            <StatTile
              label="Con problema"
              value={String(conProblema)}
              sub={conProblema > 0 ? 'se omiten si no las corregís' : 'todas las filas están completas'}
              tone={conProblema > 0 ? 'warn' : 'ink'}
              testId="metrica-con-problema"
            />
            <StatTile
              label="Excluidas por vos"
              value={String(excluidasCount)}
              sub="destildá una fila para excluirla"
              testId="metrica-excluidas"
            />
            <StatTile
              label="Total a cargar"
              value={`$ ${fmtMoney(montoACargar)}`}
              sub={totalDeclarado !== null ? `el archivo declara $ ${fmtMoney(totalDeclarado)}` : 'el archivo no declara un total'}
              testId="metrica-monto"
            />
          </div>

          {(conProblema > 0 || descuadre) && (
            <div className="flex items-start gap-3 rounded-xl border border-warn/45 bg-warn/5 px-4 py-3.5 text-warn" role="status">
              <span className="mt-0.5">
                <IconoAviso />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                {conProblema > 0 && (
                  <p className="text-sm font-medium">
                    {conProblema} {plural(conProblema, 'fila con problema. Corregila', 'filas con problema. Corregilas')} en la tabla o
                    se {plural(conProblema, 'omite', 'omiten')} al cargar.
                  </p>
                )}
                {conProblemaFilas.slice(0, 5).map(({ original, vista, detalle }) => (
                  <p key={original.rowId} className="truncate text-[13px] text-ink">
                    Ítem {original.item_codigo} · hoja {original.hoja_origen} · fila {original.fila_excel} — {detalle}
                    {vista.total_mes ? ` · $ ${fmtMoney(vista.total_mes)}` : ''}
                  </p>
                ))}
                {conProblema > 5 && <p className="text-[13px] text-slate">y {conProblema - 5} más — usá "Ver solo problemas".</p>}
                {descuadre && (
                  <p className="text-[13px] text-slate" data-testid="aviso-descuadre">
                    El total a cargar (${fmtMoney(montoACargar)}) no coincide con el total declarado del archivo ($
                    {fmtMoney(totalDeclarado)}): {diferencia > 0 ? 'faltan' : 'sobran'} ${fmtMoney(Math.abs(diferencia))}
                    {descuadreExplicadoPorProblemas ? ', que coincide con lo omitido por problemas' : ''}. Podés seguir igual: es solo
                    un aviso.
                  </p>
                )}
              </div>
              {conProblema > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  aria-pressed={soloProblemas}
                  onClick={() => {
                    setSoloProblemas((v) => !v);
                    setPagina(1);
                  }}
                >
                  {soloProblemas ? 'Ver todas' : 'Ver solo problemas'}
                </Button>
              )}
            </div>
          )}

          {/* Sin overflow-x-auto: columnas principales + fila expandible
              (patrón de la casa). El detalle secundario (hoja, $unitario,
              región, reasignación completa, detalle de error) vive en la fila
              que abre "Detalle". */}
          <div className="rounded-xl border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
              <span className="text-sm font-medium text-ink">Filas del certificado</span>
              {hojasSel.size > 1 && (
                <select
                  aria-label="Filtrar por hoja"
                  value={filtroHoja}
                  onChange={(e) => {
                    setFiltroHoja(e.target.value);
                    setPagina(1);
                  }}
                  className={`${inputCls} py-1.5 text-[13px]`}
                >
                  <option value="">Todas las hojas</option>
                  {Array.from(hojasSel).map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              )}
              <span className="ml-auto text-[13px] text-slate">
                Podés editar contrato, provincia, cantidad y total. El contrato se aplica a todas las filas del mismo ítem.
              </span>
            </div>
            <table className="w-full text-sm" aria-label="Filas de la carga">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-3 py-2.5 font-medium">Cargar</th>
                  <th className="px-3 py-2.5 font-medium">Ítem</th>
                  <th className="px-3 py-2.5 font-medium">Contrato</th>
                  <th className="px-3 py-2.5 font-medium">Provincia</th>
                  <th className="px-3 py-2.5 text-right font-medium">Cant.</th>
                  <th className="px-3 py-2.5 text-right font-medium">$ Total</th>
                  <th className="px-3 py-2.5 font-medium">Estado</th>
                  <th className="px-3 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {enPagina.map(({ original, vista, tieneError, detalle }) => {
                  const reasignado = vista.contrato_fuente === 'maestro' && original.contrato_archivo !== vista.contrato;
                  const expandida = expandidas.has(original.rowId);
                  // Match de provincia case-insensitive contra el maestro (el
                  // archivo trae "Salta", el maestro "SALTA"): el select queda
                  // preseleccionado con el valor canónico; si no matchea se
                  // muestra tal cual, marcado, para que el usuario lo corrija.
                  const provArchivo = (vista.provincia ?? '').trim();
                  const provCanon =
                    provinciasValidas.find((p) => p.toUpperCase() === provArchivo.toUpperCase()) ?? provArchivo;
                  const provInvalida = provArchivo !== '' && !provinciasValidas.includes(provCanon);
                  return (
                    <Fragment key={original.rowId}>
                      <tr className={`border-b border-line align-top text-ink last:border-0 ${vista.excluida ? 'opacity-60' : ''}`}>
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            aria-label={`Cargar fila ${original.fila_excel}`}
                            checked={!vista.excluida}
                            onChange={(e) => setExcluida(original.rowId, !e.target.checked)}
                          />
                        </td>
                        <td className="max-w-[220px] px-3 py-2.5" title={original.tarea ?? ''}>
                          <p className="font-medium">{original.item_codigo}</p>
                          <p className="truncate text-xs text-slate">{original.tarea}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <select
                              aria-label={`Contrato ${original.item_codigo}`}
                              value={vista.contrato}
                              onChange={(e) => setContratoCascada(original.item_codigo, e.target.value)}
                              className={`${inputCls} w-20`}
                            >
                              <option value="">—</option>
                              {(contratosDisponibles ?? []).map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                            {reasignado && (
                              <span
                                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-warn/10 text-[10px] text-warn"
                                title={`Reasignado por el maestro: archivo ${original.contrato_archivo} → ${vista.contrato}`}
                              >
                                ↺
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            aria-label={`Provincia ${original.rowId}`}
                            value={provCanon}
                            onChange={(e) => setEdicionCampo(original.rowId, 'provincia', e.target.value)}
                            className={`${inputCls} w-32${provInvalida ? ' border-danger text-danger' : ''}`}
                          >
                            <option value="">—</option>
                            {provInvalida && <option value={provCanon}>{provCanon}</option>}
                            {provinciasValidas.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            aria-label={`Cantidad ${original.rowId}`}
                            value={vista.cantidades ?? ''}
                            inputMode="decimal"
                            onChange={(e) => setEdicionCampo(original.rowId, 'cantidades', e.target.value)}
                            className={`${inputCls} w-16 text-right`}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            aria-label={`Total ${original.rowId}`}
                            value={mostrarTotal(vista.total_mes, ediciones.get(original.rowId)?.total_mes !== undefined)}
                            inputMode="decimal"
                            onChange={(e) => setEdicionCampo(original.rowId, 'total_mes', e.target.value)}
                            className={`${inputCls} w-32 text-right tabular-nums`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          {vista.excluida ? (
                            <span className={BADGE_EXCLUIDA}>Excluida</span>
                          ) : tieneError ? (
                            <span className={BADGE_WARN} title={detalle ?? ''}>
                              {detalle && detalle.length <= 22 ? detalle : 'Revisar'}
                            </span>
                          ) : (
                            <span className={BADGE_OK}>OK</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-slate">
                          <button type="button" onClick={() => toggleExpandida(original.rowId)} aria-expanded={expandida}>
                            {expandida ? 'Cerrar ▴' : 'Detalle ▾'}
                          </button>
                        </td>
                      </tr>
                      {expandida && (
                        <tr className="border-b border-line last:border-0">
                          <td colSpan={8} className="bg-sand/30 px-3 py-3">
                            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-slate">Hoja</dt>
                                <dd className="text-sm text-ink">{original.hoja_origen}</dd>
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-slate">$ Unitario</dt>
                                <dd className="text-sm tabular-nums text-ink">{fmtMoney(original.precio_unitario)}</dd>
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-slate">Región</dt>
                                <dd className="text-sm text-ink">{original.region || '—'}</dd>
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-slate">Fila del archivo</dt>
                                <dd className="text-sm text-ink">{original.fila_excel}</dd>
                              </div>
                              {reasignado && (
                                <div className="col-span-2 sm:col-span-4">
                                  <dt className="text-xs uppercase tracking-wide text-slate">Reasignación de contrato</dt>
                                  <dd className="text-sm text-ink">
                                    archivo: {original.contrato_archivo} → {vista.contrato} (resuelto por el maestro)
                                  </dd>
                                </div>
                              )}
                              {tieneError && detalle && (
                                <div className="col-span-2 sm:col-span-4">
                                  <dt className="text-xs uppercase tracking-wide text-slate">Detalle del problema</dt>
                                  <dd className="text-sm text-warn">{detalle}</dd>
                                </div>
                              )}
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {enPagina.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-sm text-slate">
                      {soloProblemas ? 'No quedan filas con problema.' : 'Sin filas para las hojas seleccionadas.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-slate">
              <span>
                Página {paginaSegura} de {totalPaginas} · {filasVisibles.length} {plural(filasVisibles.length, 'fila', 'filas')}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={paginaSegura <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={paginaSegura >= totalPaginas}
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Atrás
            </Button>
            <div className="flex items-center gap-3.5">
              <span className="text-[13px] tabular-nums text-slate">
                {aCargar} {plural(aCargar, 'fila', 'filas')} · $ {fmtMoney(montoACargar)}
              </span>
              <Button variant="primary" disabled={aCargar === 0 || confirmarMut.isPending} onClick={() => setModalAbierto(true)}>
                Revisar y cargar
              </Button>
            </div>
          </div>

          {modalAbierto && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" onClick={() => setModalAbierto(false)}>
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-confirmar-carga"
                className="w-full max-w-lg space-y-4 rounded-xl border border-line bg-surface p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate">Último paso</p>
                  <h2 id="titulo-confirmar-carga" className="mt-1 font-display text-xl font-semibold text-ink">
                    Confirmar la carga
                  </h2>
                  <p className="mt-1.5 text-sm text-slate">
                    Vas a cargar el certificado de <span className="font-medium text-ink">{periodoTexto}</span>. Después queda en el
                    Resumen y se puede deshacer desde el Historial.
                  </p>
                </div>

                <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-line">
                  <div className="border-b border-r border-line px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate">Archivo</dt>
                    <dd className="mt-1 truncate text-sm font-medium text-ink" title={preview.archivo}>
                      {preview.archivo}
                    </dd>
                  </div>
                  <div className="border-b border-line px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate">Contratos</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {contratosACargar.length > 0 ? (
                        contratosACargar.map((k) => (
                          <span key={k} className={CHIP_K}>
                            {k}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate">—</span>
                      )}
                    </dd>
                  </div>
                  <div className="border-r border-line px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate">Filas</dt>
                    <dd className="mt-1 font-display text-xl font-semibold text-ink">
                      {aCargar}{' '}
                      <span className="font-sans text-[13px] font-normal text-slate">
                        a cargar{conProblema > 0 ? ` · ${conProblema} ${plural(conProblema, 'omitida', 'omitidas')}` : ''}
                        {excluidasCount > 0 ? ` · ${excluidasCount} ${plural(excluidasCount, 'excluida', 'excluidas')}` : ''}
                      </span>
                    </dd>
                  </div>
                  <div className="px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate">Total</dt>
                    <dd className="mt-1 font-display text-xl font-semibold tabular-nums text-ink">$ {fmtMoney(montoACargar)}</dd>
                  </div>
                </dl>

                {(conProblema > 0 || descuadre) && (
                  <div className="flex items-start gap-2.5 rounded-lg bg-warn/8 px-3 py-2.5 text-[13px] text-warn">
                    <IconoAviso size={16} />
                    <span>
                      {conProblema > 0 &&
                        `${conProblema} ${plural(conProblema, 'fila con problema no se carga', 'filas con problema no se cargan')}. `}
                      {descuadre &&
                        `El total queda $ ${fmtMoney(Math.abs(diferencia))} ${diferencia > 0 ? 'por debajo' : 'por encima'} del declarado en el archivo.`}
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-2.5">
                  <Button variant="secondary" onClick={() => setModalAbierto(false)} disabled={confirmarMut.isPending}>
                    Volver a revisar
                  </Button>
                  <Button variant="primary" onClick={confirmar} disabled={confirmarMut.isPending}>
                    {confirmarMut.isPending ? 'Cargando…' : `Cargar ${aCargar} ${plural(aCargar, 'fila', 'filas')}`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 4 && resultado && (
        <div className="space-y-5 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-approved/10 text-approved">
              <IconoConfirmar />
            </span>
            <div>
              <p className="font-display text-xl font-semibold text-ink">Certificación cargada</p>
              <p className="mt-1 text-sm text-slate">
                {resultado.insertadas} {plural(resultado.insertadas, 'fila insertada', 'filas insertadas')} · {resultado.omitidas}{' '}
                {plural(resultado.omitidas, 'omitida', 'omitidas')} · {periodoTexto}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            <StatTile label="Filas insertadas" value={String(resultado.insertadas)} tone="ok" testId="resultado-insertadas" />
            <StatTile
              label="Omitidas"
              value={String(resultado.omitidas)}
              tone={resultado.omitidas > 0 ? 'warn' : 'ink'}
              testId="resultado-omitidas"
            />
            <StatTile label="Total cargado" value={`$ ${fmtMoney(montoACargar)}`} testId="resultado-monto" />
          </div>

          {resultado.errores.length > 0 && (
            <div className="space-y-1 rounded-lg border border-warn/45 bg-warn/5 p-3.5 text-[13px] text-warn">
              <p className="font-medium">Filas omitidas por el servidor</p>
              {resultado.errores.map((err, i) => (
                <p key={i}>
                  Hoja {err.hoja}, fila {err.fila}, ítem {err.item_codigo}: {err.mensaje}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={cargarOtra}>
              Cargar otra
            </Button>
            <Button variant="secondary" onClick={() => router.push('/certificaciones/historial')}>
              Ver historial
            </Button>
            <Button variant="primary" onClick={() => router.push('/certificaciones')}>
              Ver resumen
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
