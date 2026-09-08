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
  useItemsMaestroCarga,
  type FilaPreview,
  type RespuestaPreviewCarga,
  type RespuestaConfirmarCarga,
  type EdicionFilaCarga,
  type FilaManualCarga,
  type ItemMaestroCarga,
} from '@/lib/api/certificaciones';
import {
  revalidarFila,
  canonizarProvincia,
  hojaCoincideConKs,
  validarArchivoCarga,
  normalizarCifraEsAr,
  type Cuadratura,
} from '@/features/certificaciones/carga/revalidar';
import { FilaManualForm } from './fila-manual-form';

// Wizard de carga de certificaciones (Etapa 4 ERP). Rediseño 2026-09-03 según
// mockup aprobado por el usuario (memoria "redisenio-carga-certificaciones-
// aprobado"): stepper visible en todo el flujo, paso 1 ancho con guía de
// pasos, paso 3 con tarjetas de métricas + panel de problemas + filtros, y
// modal de resumen antes de cargar. La lógica (ediciones acumuladas por
// rowId, exclusión por hoja forzada al confirmar, server-authoritative) no
// cambia. Gate por nivel: admin y carga; lectura no ve esta pantalla.

const POR_PAGINA = 50;

/** Tolerancia del descuadre contra el total declarado, en pesos: el mismo
 * peso que tolera la cuadratura por fila (`TOLERANCIA_CUADRATURA`), acá
 * aplicado a la suma. */
const TOLERANCIA_DESCUADRE = 1;

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
/** Fila que NO se puede confirmar hasta resolverla (rojo, no ámbar: ámbar es
 * "mirá esto", rojo es "no sigue"). */
const BADGE_BLOQUEADA =
  'inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger ring-1 ring-inset ring-danger/25';
/** Azul de "manual" (#3b6fc4, mismo que el resto del sistema para lo que
 * cargó una persona a mano). No es un token de la paleta: va literal. */
const BADGE_MANUAL =
  'inline-flex items-center rounded-full bg-[#3b6fc4]/10 px-2 py-0.5 text-xs font-medium text-[#3b6fc4] ring-1 ring-inset ring-[#3b6fc4]/25';
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

/** Fecha `YYYY-MM-DD` del período del archivo → `d/m/yyyy` (como la imprime
 * Naturgy en el encabezado del certificado). Si no matchea, se muestra tal
 * cual llegó. */
function fechaCorta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])}/${Number(m[2])}/${m[1]}`;
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
    precio_unitario: e?.precio_unitario ?? f.precio_unitario,
    item_codigo: e?.item_codigo ?? f.item_codigo,
    total_mes: e?.total_mes ?? f.total_mes,
    excluida: e?.excluida ?? f.excluida,
    confirmada: e?.confirmada ?? f.confirmada,
  };
}

/** Fila manual del paso 3 mientras vive en el cliente: `localId` la
 * identifica en la tabla (el backend todavía no la conoce; recién al
 * confirmar aparece como `manual-N`, N = índice 1-based en `manuales`). */
type FilaManualLocal = FilaManualCarga & { item: ItemMaestroCarga; localId: string };

/** Cuerpo que viaja al backend por cada fila manual: campos ENUMERADOS (el
 * `item` del maestro y el `localId` son estado del cliente). `observaciones`
 * y `confirmada` solo van si el usuario los puso. */
function payloadManual(m: FilaManualLocal): FilaManualCarga {
  const obs = (m.observaciones ?? '').trim();
  return {
    id_item: m.id_item,
    provincia: m.provincia,
    cantidades: m.cantidades,
    precio_unitario: m.precio_unitario,
    total_mes: m.total_mes,
    ...(obs !== '' ? { observaciones: obs } : {}),
    ...(m.confirmada ? { confirmada: true } : {}),
  };
}

/** Bloqueo devuelto por el backend en el 422 del confirmar. */
interface BloqueadaServidor {
  rowId: string;
  item_codigo: string;
  detalle: string;
}

/** Texto corto del badge de una fila bloqueada: los dos bloqueos de
 * cuadratura se nombran "No cuadra"; el resto (ítem, contrato, provincia,
 * cantidad, total) queda como "Bloqueada" y el motivo se lee en el detalle. */
function esBloqueoDeCuadratura(detalle: string | null): boolean {
  return detalle !== null && (detalle.startsWith('No cuadra') || detalle.startsWith('Falta $ unitario'));
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

function IconoCandado() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
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
  tone?: 'ink' | 'ok' | 'warn' | 'danger' | 'manual';
  testId: string;
}) {
  const color =
    tone === 'ok'
      ? 'text-approved'
      : tone === 'warn'
        ? 'text-warn'
        : tone === 'danger'
          ? 'text-danger'
          : tone === 'manual'
            ? 'text-[#3b6fc4]'
            : 'text-ink';
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

/** Celda "Estado" de una fila del paso 3. Una fila manual lleva SIEMPRE su
 * badge azul; si además está bloqueada o confirmada a mano, se ven los dos
 * (que sea manual no dice nada de si cuadra). */
function CeldaEstado({
  excluida,
  manual = false,
  tieneError,
  detalle,
  confirmada,
  cuadra,
}: {
  excluida: boolean;
  manual?: boolean;
  tieneError: boolean;
  detalle: string | null;
  confirmada: boolean;
  cuadra: boolean;
}) {
  if (excluida) return <span className={BADGE_EXCLUIDA}>Excluida</span>;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {manual && <span className={BADGE_MANUAL}>Manual</span>}
      {tieneError ? (
        <span className={BADGE_BLOQUEADA} title={detalle ?? ''}>
          {esBloqueoDeCuadratura(detalle) ? 'No cuadra' : 'Bloqueada'}
        </span>
      ) : confirmada && !cuadra ? (
        <span className={BADGE_WARN} title="Confirmada a mano: la cuadratura no cierra y la aceptaste igual">
          Confirmada así
        </span>
      ) : (
        <span className={BADGE_OK}>Cuadra</span>
      )}
    </span>
  );
}

/** Las tres cifras de la cuadratura, siempre visibles en el detalle: es lo
 * que la persona necesita para decidir cuál de las tres está mal. */
function BloqueCuadratura({
  cuadratura,
  cantidades,
  precioUnitario,
  totalMes,
  bloqueada,
  children,
}: {
  cuadratura: Cuadratura;
  cantidades: string | null;
  precioUnitario: string | null;
  totalMes: string | null;
  bloqueada: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={`col-span-2 rounded-lg border bg-surface px-3 py-2.5 sm:col-span-4 ${
        bloqueada ? 'border-danger/35' : 'border-line'
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate">Cuadratura</p>
      <p className="mt-1 text-sm tabular-nums text-ink">
        {cantidades ?? '—'} × {fmtMoney(precioUnitario)} ={' '}
        {cuadratura.calculado !== null ? fmtMoney(cuadratura.calculado) : '—'} · impreso {fmtMoney(totalMes)} · diferencia{' '}
        <span className={bloqueada ? 'font-semibold text-danger' : ''}>
          $ {cuadratura.diferencia !== null ? fmtMoney(Math.abs(cuadratura.diferencia)) : '—'}
        </span>
      </p>
      {bloqueada && cuadratura.sugerencia_cantidad && (
        <p className="mt-1 text-[13px] text-slate">
          Con el total impreso, la cantidad debería ser <span className="font-medium text-ink">{cuadratura.sugerencia_cantidad}</span>.
        </p>
      )}
      {children}
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
  const [manuales, setManuales] = useState<FilaManualLocal[]>([]);
  const [mostrarFormManual, setMostrarFormManual] = useState(false);
  /** Bloqueos que devolvió el backend en un 422 del confirmar, por rowId
   * (las manuales ya traducidas de `manual-N` a su `localId`). Se limpian en
   * cuanto el usuario toca esa fila: el intento siguiente vuelve a preguntar
   * al servidor. */
  const [bloqueosServidor, setBloqueosServidor] = useState<Map<string, string>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: itemsMaestro } = useItemsMaestroCarga(puedeCargar && step === 3);

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
      setManuales([]);
      setMostrarFormManual(false);
      setBloqueosServidor(new Map());
      setExpandidas(new Set());
      setPagina(1);
      setFiltroHoja('');
      setSoloProblemas(false);
      setStep(2);
    } catch (e) {
      toast.error(mensajeError(e, 'No se pudo procesar el archivo'));
    }
  }

  /** Paridad con el portal: un usuario de nivel `carga` solo puede elegir
   * hojas de sus contratos (match por token K, fix B9). Las demás quedan
   * BLOQUEADAS en el paso 2 (chip deshabilitado con candado) en vez de
   * dejarlo llegar al 403 del confirmar. Admin ve todo habilitado. */
  function hojaPermitida(h: string): boolean {
    if (nivel === 'admin') return true;
    return hojaCoincideConKs(h, perfil?.cert?.ks ?? []);
  }

  function toggleHoja(h: string) {
    if (!hojaPermitida(h)) return;
    setHojasSel((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  }

  /** El bloqueo que trajo el 422 vale para el estado que tenía la fila en ese
   * intento: si el usuario la vuelve a tocar, se descarta y manda de nuevo. */
  function limpiarBloqueoServidor(rowId: string) {
    setBloqueosServidor((prev) => {
      if (!prev.has(rowId)) return prev;
      const next = new Map(prev);
      next.delete(rowId);
      return next;
    });
  }

  type CampoEditable = 'provincia' | 'cantidades' | 'total_mes' | 'precio_unitario' | 'item_codigo';
  const CAMPOS_DECIMALES: CampoEditable[] = ['cantidades', 'total_mes', 'precio_unitario'];

  function setEdicionCampo(rowId: string, campo: CampoEditable, valor: string) {
    const v = CAMPOS_DECIMALES.includes(campo) ? normalizarCifraEsAr(valor) : valor;
    limpiarBloqueoServidor(rowId);
    setEdiciones((prev) => {
      const next = new Map(prev);
      const actual = next.get(rowId) ?? { rowId };
      next.set(rowId, { ...actual, [campo]: v });
      return next;
    });
  }

  /** "Confirmar así": levanta ÚNICAMENTE el bloqueo por cuadratura de esa
   * fila (mismo alcance en el espejo cliente y en el backend). */
  function setConfirmada(rowId: string) {
    limpiarBloqueoServidor(rowId);
    setEdiciones((prev) => {
      const next = new Map(prev);
      const actual = next.get(rowId) ?? { rowId };
      next.set(rowId, { ...actual, confirmada: true });
      return next;
    });
  }

  function setExcluida(rowId: string, excluida: boolean) {
    limpiarBloqueoServidor(rowId);
    setEdiciones((prev) => {
      const next = new Map(prev);
      const actual = next.get(rowId) ?? { rowId };
      next.set(rowId, { ...actual, excluida });
      return next;
    });
  }

  function agregarManual(m: FilaManualCarga & { item: ItemMaestroCarga }) {
    setManuales((prev) => [...prev, { ...m, localId: `manual-local-${prev.length + 1}-${Date.now()}` }]);
    setMostrarFormManual(false);
  }

  function quitarManual(localId: string) {
    limpiarBloqueoServidor(localId);
    setManuales((prev) => prev.filter((m) => m.localId !== localId));
  }

  function setManualCampo(localId: string, campo: 'cantidades' | 'precio_unitario' | 'total_mes', valor: string) {
    limpiarBloqueoServidor(localId);
    setManuales((prev) => prev.map((m) => (m.localId === localId ? { ...m, [campo]: normalizarCifraEsAr(valor) } : m)));
  }

  function setManualConfirmada(localId: string) {
    limpiarBloqueoServidor(localId);
    setManuales((prev) => prev.map((m) => (m.localId === localId ? { ...m, confirmada: true } : m)));
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
    for (const f of filasDelItem) limpiarBloqueoServidor(f.rowId);
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
    const { tieneError, detalle, cuadratura } = revalidarFila(vista, {
      itemExiste: f.item_en_maestro,
      provinciasValidas,
      confirmada: vista.confirmada,
    });
    // El 422 del backend gana sobre el espejo cliente: la fila queda
    // bloqueada con SU motivo hasta que el usuario la vuelva a tocar.
    const bloqueoServidor = bloqueosServidor.get(f.rowId) ?? null;
    return {
      original: f,
      vista,
      tieneError: tieneError || bloqueoServidor !== null,
      detalle: bloqueoServidor ?? detalle,
      cuadratura,
      bloqueoServidor,
    };
  });

  /** Filas manuales: mismo espejo de validación que las del archivo (ítem del
   * maestro ⇒ `itemExiste: true`; contrato = el K del ítem, no se tipea). */
  const manualesCalculadas = manuales.map((m) => {
    const bloqueoServidor = bloqueosServidor.get(m.localId) ?? null;
    const { tieneError, detalle, cuadratura } = revalidarFila(
      {
        item_codigo: m.item.item_codigo,
        contrato: m.item.codigo_k,
        provincia: m.provincia,
        cantidades: m.cantidades,
        precio_unitario: m.precio_unitario,
        total_mes: m.total_mes,
      },
      { itemExiste: true, provinciasValidas, confirmada: m.confirmada },
    );
    return {
      manual: m,
      tieneError: tieneError || bloqueoServidor !== null,
      detalle: bloqueoServidor ?? detalle,
      cuadratura,
      bloqueoServidor,
    };
  });

  const bloqueadasFilas = filasCalculadas.filter((r) => !r.vista.excluida && r.tieneError);
  const manualesOkFilas = manualesCalculadas.filter((r) => !r.tieneError);
  const manualesBloqueadas = manualesCalculadas.length - manualesOkFilas.length;
  const manualesOk = manualesOkFilas.length;
  const aCargarArchivo = filasCalculadas.filter((r) => !r.vista.excluida && !r.tieneError).length;
  const aCargar = aCargarArchivo + manualesOk;
  const bloqueadas = bloqueadasFilas.length + manualesBloqueadas;
  const excluidasCount = filasCalculadas.filter((r) => r.vista.excluida).length;
  const totalFilas = filasCalculadas.length;

  const montoACargar =
    filasCalculadas
      .filter((r) => !r.vista.excluida && !r.tieneError)
      .reduce((acc, r) => acc + (Number(r.vista.total_mes) || 0), 0) +
    manualesOkFilas.reduce((acc, r) => acc + (Number(r.manual.total_mes) || 0), 0);
  // Un TOTAL MES en 0 en el archivo no es un total declarado (paridad con el portal).
  const totalDeclaradoCrudo = preview?.resumen.total_declarado ?? null;
  const totalDeclarado = totalDeclaradoCrudo ? totalDeclaradoCrudo : null;
  const diferencia = totalDeclarado !== null ? totalDeclarado - montoACargar : 0;
  /** Descuadre contra el total declarado: se muestra en rojo pero NO bloquea
   * (la plata declarada puede no coincidir con lo cargable y el usuario tiene
   * que poder decidir). Tolerancia $1, la misma de la cuadratura por fila. */
  const descuadre = totalDeclarado !== null && Math.abs(diferencia) > TOLERANCIA_DESCUADRE;

  const contratosACargar = Array.from(
    new Set([
      ...filasCalculadas.filter((r) => !r.vista.excluida && !r.tieneError).map((r) => r.vista.contrato),
      ...manualesOkFilas.map((r) => r.manual.item.codigo_k),
    ]).values(),
  ).filter(Boolean);

  /** NP (nota de pedido) del certificado: el parser la deja en cada fila, y
   * es una sola por documento — se toma la primera fila que la traiga. */
  const npArchivo = preview?.filas.find((f) => (f.nro_np ?? '') !== '')?.nro_np ?? null;

  const avisosFuertes = preview?.avisos.filter((a) => a.fuerte) ?? [];
  const avisosSuaves = preview?.avisos.filter((a) => !a.fuerte) ?? [];

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
   * fila, sin pisar el resto de sus campos editados.
   *
   * Además se PODAN las cifras vacías (`''`): el backend valida
   * cantidad/unitario/total con `/^\d+([.,]\d{1,4})?$/` y un `''` lo
   * rechazaría con 400. Un `''` solo sobrevive en una fila excluida (si no
   * lo estuviera, el espejo cliente ya la tendría bloqueada por 'Falta
   * cantidad'/'Falta total mes' y el botón de confirmar estaría
   * deshabilitado), y en una fila excluida esa cifra no se inserta: mandar
   * el valor original es equivalente. Si de la poda queda solo el `rowId`,
   * la edición entera se descarta (no dice nada). */
  function edicionesParaConfirmar(): EdicionFilaCarga[] {
    if (!preview) return [];
    const finales = new Map(ediciones);
    for (const f of preview.filas) {
      if (!hojasSel.has(f.hoja_origen)) {
        const actual = finales.get(f.rowId) ?? { rowId: f.rowId };
        finales.set(f.rowId, { ...actual, excluida: true });
      }
    }
    const out: EdicionFilaCarga[] = [];
    for (const e of finales.values()) {
      const limpia: EdicionFilaCarga = { ...e };
      for (const campo of CAMPOS_DECIMALES) {
        if (limpia[campo] === '') delete limpia[campo];
      }
      // Solo `rowId`: nada que editar.
      if (Object.keys(limpia).length > 1) out.push(limpia);
    }
    return out;
  }

  /** `manual-N` (N = índice 1-based en el array `manuales` que se mandó) →
   * `localId` de esa fila manual, para poder marcarla en la tabla. */
  function rowIdLocal(rowId: string): string {
    const m = /^manual-(\d+)$/.exec(rowId);
    if (!m) return rowId;
    return manuales[Number(m[1]) - 1]?.localId ?? rowId;
  }

  async function confirmar() {
    if (!preview) return;
    try {
      const data = await confirmarMut.mutateAsync({
        previewId: preview.previewId,
        ediciones: edicionesParaConfirmar(),
        // Solo va la clave si hay filas manuales: sin ella el backend recibe
        // el mismo body que antes de esta pantalla. El payload se arma
        // ENUMERANDO los campos (no con un rest que descarte `item`/`localId`)
        // para que agregar estado local a `FilaManualLocal` no lo filtre al
        // backend: lo que viaja es exactamente `FilaManualCarga`.
        ...(manuales.length > 0 ? { manuales: manuales.map(payloadManual) } : {}),
      });
      setModalAbierto(false);
      setResultado(data);
      setStep(4);
    } catch (e) {
      const resp = (
        e as { response?: { status?: number; data?: { message?: string; bloqueadas?: BloqueadaServidor[] } } }
      ).response;
      const bloqueadasBackend = resp?.data?.bloqueadas;
      if (resp?.status === 422 && bloqueadasBackend && bloqueadasBackend.length > 0) {
        // El backend revalidó y encontró filas que el espejo cliente dejó
        // pasar: se marcan y se abren para que el usuario las vea, con SU
        // texto (el mensaje ya viene en singular/plural, no se reescribe).
        const locales = bloqueadasBackend.map((b) => ({ ...b, local: rowIdLocal(b.rowId) }));
        setBloqueosServidor(new Map(locales.map((b) => [b.local, b.detalle])));
        setExpandidas((prev) => new Set([...prev, ...locales.map((b) => b.local)]));
        setModalAbierto(false);
        setSoloProblemas(true);
        // Y se limpia el filtro por hoja: si la bloqueada está en otra hoja,
        // el filtro la esconderría justo cuando hay que corregirla.
        setFiltroHoja('');
        setPagina(1);
        toast.error(resp.data?.message ?? 'Hay filas bloqueadas.');
        return;
      }
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
    setManuales([]);
    setMostrarFormManual(false);
    setBloqueosServidor(new Map());
    setExpandidas(new Set());
    setStep(1);
    if (inputRef.current) inputRef.current.value = '';
  }

  const periodoTexto = `${MESES[mes - 1].toLowerCase()} ${anio}`;
  const hojasBloqueadas = preview ? preview.hojas.filter((h) => !hojaPermitida(h)).length : 0;

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
              texto="Ves qué cuadra y qué no, corregís cantidad, unitario, total, contrato o provincia, y agregás a mano lo que el archivo no dejó leer."
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
              const permitida = hojaPermitida(h);
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => toggleHoja(h)}
                  aria-pressed={activo}
                  disabled={!permitida}
                  title={permitida ? undefined : 'No es un contrato a tu cargo'}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 ring-inset transition ${
                    !permitida
                      ? 'cursor-not-allowed bg-surface text-slate/60 ring-line'
                      : activo
                        ? 'bg-brand/10 text-brand-deep ring-brand/30'
                        : 'bg-surface text-slate ring-line hover:text-ink'
                  }`}
                >
                  {!permitida ? <IconoCandado /> : activo && <IconoTilde />}
                  {h}
                </button>
              );
            })}
          </div>
          {hojasBloqueadas > 0 && (
            <p className="text-[13px] text-slate" data-testid="aviso-hojas-bloqueadas">
              {hojasBloqueadas} {plural(hojasBloqueadas, 'hoja bloqueada: no es un contrato', 'hojas bloqueadas: no son contratos')} a tu cargo.
            </p>
          )}
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm text-slate">
                Archivo <span className="font-medium text-ink">{preview.archivo}</span> · {periodoTexto} · {hojasSel.size}{' '}
                {plural(hojasSel.size, 'hoja seleccionada', 'hojas seleccionadas')}
              </p>
              {/* Metadatos del encabezado del certificado (mockup 2026-09-07):
                  el período que dice el archivo y la NP. Cada uno se omite si
                  el parser no lo encontró. */}
              {(preview.periodo_archivo !== null || npArchivo !== null) && (
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate" data-testid="meta-archivo">
                  {preview.periodo_archivo !== null && (
                    <span>
                      Período del archivo{' '}
                      <span className="font-medium text-ink">
                        {fechaCorta(preview.periodo_archivo.desde)} a {fechaCorta(preview.periodo_archivo.hasta)}
                      </span>
                    </span>
                  )}
                  {npArchivo !== null && (
                    <span>
                      NP <span className="font-medium text-ink">{npArchivo}</span>
                    </span>
                  )}
                </p>
              )}
            </div>
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

          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
            <StatTile
              label="A cargar"
              value={String(aCargar)}
              sub={
                manuales.length > 0
                  ? `de ${totalFilas} ${plural(totalFilas, 'fila leída', 'filas leídas')} + ${manuales.length} ${plural(
                      manuales.length,
                      'manual',
                      'manuales',
                    )}`
                  : `de ${totalFilas} ${plural(totalFilas, 'fila leída', 'filas leídas')}`
              }
              tone="ok"
              testId="metrica-a-cargar"
            />
            <StatTile
              label="Bloqueadas"
              value={String(bloqueadas)}
              sub={
                bloqueadas > 0
                  ? plural(bloqueadas, 'corregila o excluila', 'corregilas o excluilas')
                  : 'todas las filas cuadran'
              }
              tone={bloqueadas > 0 ? 'danger' : 'ink'}
              testId="metrica-bloqueadas"
            />
            <StatTile
              label="Manuales"
              value={String(manuales.length)}
              sub="agregadas por vos"
              tone={manuales.length > 0 ? 'manual' : 'ink'}
              testId="metrica-manuales"
            />
            <StatTile
              label="Excluidas"
              value={String(excluidasCount)}
              sub="destildá para excluir"
              testId="metrica-excluidas"
            />
            <StatTile
              label="Total a cargar"
              value={`$ ${fmtMoney(montoACargar)}`}
              sub={totalDeclarado !== null ? `declara $ ${fmtMoney(totalDeclarado)}` : 'el archivo no declara un total'}
              tone={descuadre ? 'warn' : 'ink'}
              testId="metrica-monto"
            />
          </div>

          {/* Cartel ROJO de cuadratura contra el total declarado. Rojo pero no
              bloqueante: la plata declarada puede no coincidir con lo cargable
              y la decisión es del usuario (mockup 2026-09-07). */}
          {descuadre && (
            <div
              className="flex items-start gap-3 rounded-xl border border-danger/45 bg-danger/5 px-4 py-3.5 text-danger"
              role="status"
              data-testid="aviso-descuadre"
            >
              <span className="mt-0.5">
                <IconoAviso />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium">
                  La suma no cierra con el total declarado: {diferencia > 0 ? 'faltan' : 'sobran'} ${' '}
                  {fmtMoney(Math.abs(diferencia))}
                </p>
                <p className="text-[13px] text-ink">
                  El archivo declara $ {fmtMoney(totalDeclarado)} y las filas a cargar suman $ {fmtMoney(montoACargar)} (las
                  bloqueadas no cuentan). Podés confirmar igual, pero revisá si el parser perdió una fila y agregala a mano si hace
                  falta.
                </p>
              </div>
            </div>
          )}

          {/* Avisos FUERTES del parser (período distinto al elegido, sin total
              declarado): mismo rojo, uno por línea. */}
          {avisosFuertes.length > 0 && (
            <div
              className="flex items-start gap-3 rounded-xl border border-danger/45 bg-danger/5 px-4 py-3.5 text-danger"
              role="status"
              data-testid="avisos-fuertes"
            >
              <span className="mt-0.5">
                <IconoAviso />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                {avisosFuertes.map((a, i) => (
                  <p key={i} className="text-sm font-medium">
                    {a.mensaje}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Panel ÁMBAR "Avisos de lectura": columnas ignoradas, líneas que no
              se pudieron leer como fila, K del nombre del archivo… más los
              errores de parseo que ya se listaban. Ninguno bloquea. */}
          {(avisosSuaves.length > 0 || preview.errores.length > 0) && (
            <div className="flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/5 px-4 py-3.5" data-testid="avisos-lectura">
              <span className="mt-0.5 text-warn">
                <IconoAviso />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-warn">Avisos de lectura</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] text-ink">
                  {avisosSuaves.map((a, i) => (
                    <li key={`aviso-${i}`}>{a.mensaje}</li>
                  ))}
                  {preview.errores.map((err, i) => (
                    <li key={`error-${i}`}>
                      Hoja {err.hoja}, fila {err.fila} ({err.campo}): {err.mensaje}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Sin overflow-x-auto: columnas principales + fila expandible
              (patrón de la casa). El detalle secundario (hoja, tarea,
              observaciones, cuadratura, reasignación) vive en la fila que abre
              "Detalle". */}
          <div className="rounded-xl border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-line px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate">
                <span className="flex items-center gap-1.5">
                  <span className={BADGE_OK}>Cuadra</span> cantidad × unitario = total
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={BADGE_BLOQUEADA}>Bloqueada</span> no se confirma hasta resolverla
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={BADGE_MANUAL}>Manual</span> agregada por vos
                </span>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
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
                {(bloqueadasFilas.length > 0 || soloProblemas) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-pressed={soloProblemas}
                    onClick={() => {
                      setSoloProblemas((v) => !v);
                      setPagina(1);
                    }}
                  >
                    {soloProblemas ? 'Ver todas' : 'Ver solo bloqueadas'}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="border-[#3b6fc4]/50 text-[#3b6fc4]"
                  onClick={() => setMostrarFormManual(true)}
                >
                  + Agregar fila manual
                </Button>
              </div>
            </div>
            <table className="w-full text-sm" aria-label="Filas de la carga">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-3 py-2.5 font-medium">Cargar</th>
                  <th className="px-3 py-2.5 font-medium">Ítem</th>
                  <th className="px-3 py-2.5 font-medium">Contrato</th>
                  <th className="px-3 py-2.5 font-medium">Provincia</th>
                  <th className="px-3 py-2.5 text-right font-medium">Cant.</th>
                  <th className="px-3 py-2.5 text-right font-medium">$ Unitario</th>
                  <th className="px-3 py-2.5 text-right font-medium">$ Total</th>
                  <th className="px-3 py-2.5 font-medium">Estado</th>
                  <th className="px-3 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {enPagina.map(({ original, vista, tieneError, detalle, cuadratura, bloqueoServidor }) => {
                  const reasignado = vista.contrato_fuente === 'maestro' && original.contrato_archivo !== vista.contrato;
                  const expandida = expandidas.has(original.rowId);
                  const edicion = ediciones.get(original.rowId);
                  // Match de provincia sin acentos/mayúsculas contra el maestro
                  // (el archivo trae "Tucuman", el maestro "TUCUMÁN"): el select
                  // queda preseleccionado con el valor canónico; si no matchea
                  // se muestra tal cual, marcado, para que el usuario lo corrija.
                  const provArchivo = (vista.provincia ?? '').trim();
                  const provCanon = canonizarProvincia(provArchivo, provinciasValidas) ?? provArchivo;
                  const provInvalida = provArchivo !== '' && canonizarProvincia(provArchivo, provinciasValidas) === null;
                  const bloqueadaPorCuadratura = tieneError && bloqueoServidor === null && esBloqueoDeCuadratura(detalle);
                  const kArchivoDistinto =
                    preview.k_nombre_archivo !== null && vista.contrato !== '' && vista.contrato !== preview.k_nombre_archivo;
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
                        <td className="px-3 py-2.5">
                          <input
                            aria-label={`Ítem ${original.rowId}`}
                            value={vista.item_codigo}
                            onChange={(e) => setEdicionCampo(original.rowId, 'item_codigo', e.target.value)}
                            className={`${inputCls} w-20`}
                          />
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
                            className={`${inputCls} w-16 text-right${bloqueadaPorCuadratura ? ' border-danger' : ''}`}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            aria-label={`$ Unitario ${original.rowId}`}
                            value={mostrarTotal(vista.precio_unitario, edicion?.precio_unitario !== undefined)}
                            inputMode="decimal"
                            onChange={(e) => setEdicionCampo(original.rowId, 'precio_unitario', e.target.value)}
                            className={`${inputCls} w-28 text-right tabular-nums`}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            aria-label={`Total ${original.rowId}`}
                            value={mostrarTotal(vista.total_mes, edicion?.total_mes !== undefined)}
                            inputMode="decimal"
                            onChange={(e) => setEdicionCampo(original.rowId, 'total_mes', e.target.value)}
                            className={`${inputCls} w-32 text-right tabular-nums${bloqueadaPorCuadratura ? ' border-danger' : ''}`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <CeldaEstado
                            excluida={vista.excluida}
                            tieneError={tieneError}
                            detalle={detalle}
                            confirmada={vista.confirmada}
                            cuadra={cuadratura.cuadra}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-slate">
                          <button type="button" onClick={() => toggleExpandida(original.rowId)} aria-expanded={expandida}>
                            {expandida ? 'Cerrar ▴' : 'Detalle ▾'}
                          </button>
                        </td>
                      </tr>
                      {expandida && (
                        <tr className="border-b border-line last:border-0">
                          <td colSpan={9} className="bg-sand/30 px-3 py-3">
                            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-slate">Hoja / página</dt>
                                <dd className="text-sm text-ink">
                                  {original.hoja_origen} · fila {original.fila_excel}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-slate">Región</dt>
                                <dd className="text-sm text-ink">{original.region || '—'}</dd>
                              </div>
                              <div className="col-span-2">
                                <dt className="text-xs uppercase tracking-wide text-slate">Tarea</dt>
                                <dd className="text-sm text-ink">{original.tarea || '—'}</dd>
                              </div>
                              <div className="col-span-2">
                                <dt className="text-xs uppercase tracking-wide text-slate">Observaciones</dt>
                                <dd className="text-sm text-ink">{original.observaciones || '—'}</dd>
                              </div>
                              {edicion?.item_codigo !== undefined && (
                                <div className="col-span-2">
                                  <dt className="text-xs uppercase tracking-wide text-slate">Ítem editado</dt>
                                  <dd className="text-sm text-ink">El ítem editado se verifica al confirmar</dd>
                                </div>
                              )}
                              {reasignado && (
                                <div className="col-span-2">
                                  <dt className="text-xs uppercase tracking-wide text-slate">Reasignación de contrato</dt>
                                  <dd className="text-sm text-ink">
                                    archivo: {original.contrato_archivo} → {vista.contrato} (resuelto por el maestro)
                                  </dd>
                                </div>
                              )}
                              {kArchivoDistinto && (
                                <div className="col-span-2 sm:col-span-4">
                                  <dt className="text-xs uppercase tracking-wide text-slate">Contrato</dt>
                                  <dd className="text-sm text-ink">
                                    El nombre del archivo dice {preview.k_nombre_archivo} · esta fila se resolvió en {vista.contrato} ·
                                    si la plata va a {preview.k_nombre_archivo}, cambiá el contrato arriba.
                                  </dd>
                                </div>
                              )}
                              {bloqueoServidor !== null && (
                                <div className="col-span-2 sm:col-span-4">
                                  <dt className="text-xs uppercase tracking-wide text-slate">Bloqueada por el servidor</dt>
                                  <dd className="text-sm text-danger">{bloqueoServidor}</dd>
                                </div>
                              )}
                              {tieneError && detalle && !esBloqueoDeCuadratura(detalle) && bloqueoServidor === null && (
                                <div className="col-span-2 sm:col-span-4">
                                  <dt className="text-xs uppercase tracking-wide text-slate">Detalle del bloqueo</dt>
                                  <dd className="text-sm text-danger">{detalle}</dd>
                                </div>
                              )}
                              <BloqueCuadratura
                                cuadratura={cuadratura}
                                cantidades={vista.cantidades}
                                precioUnitario={vista.precio_unitario}
                                totalMes={vista.total_mes}
                                bloqueada={bloqueadaPorCuadratura}
                              >
                                {bloqueadaPorCuadratura && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {cuadratura.sugerencia_cantidad && (
                                      <Button
                                        variant="primary"
                                        size="xs"
                                        onClick={() =>
                                          setEdicionCampo(original.rowId, 'cantidades', cuadratura.sugerencia_cantidad!)
                                        }
                                      >
                                        Usar cantidad {cuadratura.sugerencia_cantidad}
                                      </Button>
                                    )}
                                    <Button variant="secondary" size="xs" onClick={() => setConfirmada(original.rowId)}>
                                      Confirmar así
                                    </Button>
                                    <Button variant="secondary" size="xs" onClick={() => setExcluida(original.rowId, true)}>
                                      Excluir fila
                                    </Button>
                                  </div>
                                )}
                              </BloqueCuadratura>
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {/* Filas MANUALES: siempre al final, sin paginar ni filtrar
                    (son pocas y las acaba de agregar el usuario). */}
                {manualesCalculadas.map(({ manual, tieneError, detalle, cuadratura, bloqueoServidor }) => {
                  const expandida = expandidas.has(manual.localId);
                  const bloqueadaPorCuadratura = tieneError && bloqueoServidor === null && esBloqueoDeCuadratura(detalle);
                  return (
                    <Fragment key={manual.localId}>
                      <tr className="border-b border-line align-top text-ink last:border-0">
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            className="text-xs text-slate underline-offset-2 hover:text-danger hover:underline"
                            onClick={() => quitarManual(manual.localId)}
                          >
                            Quitar
                          </button>
                        </td>
                        <td className="px-3 py-2.5 font-medium">{manual.item.item_codigo}</td>
                        <td className="px-3 py-2.5">{manual.item.codigo_k}</td>
                        <td className="px-3 py-2.5">{manual.provincia}</td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            aria-label={`Cantidad ${manual.localId}`}
                            value={manual.cantidades}
                            inputMode="decimal"
                            onChange={(e) => setManualCampo(manual.localId, 'cantidades', e.target.value)}
                            className={`${inputCls} w-16 text-right${bloqueadaPorCuadratura ? ' border-danger' : ''}`}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            aria-label={`$ Unitario ${manual.localId}`}
                            value={manual.precio_unitario}
                            inputMode="decimal"
                            onChange={(e) => setManualCampo(manual.localId, 'precio_unitario', e.target.value)}
                            className={`${inputCls} w-28 text-right tabular-nums`}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            aria-label={`Total ${manual.localId}`}
                            value={manual.total_mes}
                            inputMode="decimal"
                            onChange={(e) => setManualCampo(manual.localId, 'total_mes', e.target.value)}
                            className={`${inputCls} w-32 text-right tabular-nums${bloqueadaPorCuadratura ? ' border-danger' : ''}`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <CeldaEstado
                            excluida={false}
                            manual
                            tieneError={tieneError}
                            detalle={detalle}
                            confirmada={manual.confirmada ?? false}
                            cuadra={cuadratura.cuadra}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-slate">
                          <button type="button" onClick={() => toggleExpandida(manual.localId)} aria-expanded={expandida}>
                            {expandida ? 'Cerrar ▴' : 'Detalle ▾'}
                          </button>
                        </td>
                      </tr>
                      {expandida && (
                        <tr className="border-b border-line last:border-0">
                          <td colSpan={9} className="bg-sand/30 px-3 py-3">
                            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-slate">Hoja / página</dt>
                                <dd className="text-sm text-ink">agregada a mano en este paso</dd>
                              </div>
                              <div className="col-span-2">
                                <dt className="text-xs uppercase tracking-wide text-slate">Tarea</dt>
                                <dd className="text-sm text-ink">{manual.item.tarea}</dd>
                              </div>
                              {bloqueoServidor !== null && (
                                <div className="col-span-2 sm:col-span-4">
                                  <dt className="text-xs uppercase tracking-wide text-slate">Bloqueada por el servidor</dt>
                                  <dd className="text-sm text-danger">{bloqueoServidor}</dd>
                                </div>
                              )}
                              {tieneError && detalle && !esBloqueoDeCuadratura(detalle) && bloqueoServidor === null && (
                                <div className="col-span-2 sm:col-span-4">
                                  <dt className="text-xs uppercase tracking-wide text-slate">Detalle del bloqueo</dt>
                                  <dd className="text-sm text-danger">{detalle}</dd>
                                </div>
                              )}
                              <BloqueCuadratura
                                cuadratura={cuadratura}
                                cantidades={manual.cantidades}
                                precioUnitario={manual.precio_unitario}
                                totalMes={manual.total_mes}
                                bloqueada={bloqueadaPorCuadratura}
                              >
                                {bloqueadaPorCuadratura && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {cuadratura.sugerencia_cantidad && (
                                      <Button
                                        variant="primary"
                                        size="xs"
                                        onClick={() =>
                                          setManualCampo(manual.localId, 'cantidades', cuadratura.sugerencia_cantidad!)
                                        }
                                      >
                                        Usar cantidad {cuadratura.sugerencia_cantidad}
                                      </Button>
                                    )}
                                    <Button variant="secondary" size="xs" onClick={() => setManualConfirmada(manual.localId)}>
                                      Confirmar así
                                    </Button>
                                    <Button variant="secondary" size="xs" onClick={() => quitarManual(manual.localId)}>
                                      Quitar fila
                                    </Button>
                                  </div>
                                )}
                              </BloqueCuadratura>
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {enPagina.length === 0 && manualesCalculadas.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-sm text-slate">
                      {soloProblemas ? 'No quedan filas bloqueadas.' : 'Sin filas para las hojas seleccionadas.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {mostrarFormManual && (
              <div className="border-t border-line px-4 py-3.5">
                <FilaManualForm
                  items={itemsMaestro ?? []}
                  provincias={provinciasValidas}
                  onAgregar={agregarManual}
                  onCancelar={() => setMostrarFormManual(false)}
                />
              </div>
            )}
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-slate">
              <span>
                Página {paginaSegura} de {totalPaginas} · {filasVisibles.length} {plural(filasVisibles.length, 'fila', 'filas')}
                {manuales.length > 0 ? ` · ${manuales.length} ${plural(manuales.length, 'manual', 'manuales')}` : ''}
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

          <div className="flex flex-wrap items-center justify-between gap-3">
            {bloqueadas > 0 ? (
              <span className="text-[13px] text-danger">
                No podés confirmar: hay {bloqueadas} {plural(bloqueadas, 'fila bloqueada', 'filas bloqueadas')}.{' '}
                {plural(bloqueadas, 'Corregila, confirmala o excluila.', 'Corregilas, confirmalas o excluilas.')}
              </span>
            ) : (
              <span className="text-[13px] tabular-nums text-slate">
                {aCargar} {plural(aCargar, 'fila', 'filas')} · $ {fmtMoney(montoACargar)}
              </span>
            )}
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Volver a hojas
              </Button>
              <Button
                variant="primary"
                disabled={bloqueadas > 0 || aCargar === 0 || confirmarMut.isPending}
                onClick={() => setModalAbierto(true)}
              >
                Confirmar carga
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
                        a cargar{manualesOk > 0 ? ` · ${manualesOk} ${plural(manualesOk, 'manual', 'manuales')}` : ''}
                        {excluidasCount > 0 ? ` · ${excluidasCount} ${plural(excluidasCount, 'excluida', 'excluidas')}` : ''}
                      </span>
                    </dd>
                  </div>
                  <div className="px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate">Total</dt>
                    <dd className="mt-1 font-display text-xl font-semibold tabular-nums text-ink">$ {fmtMoney(montoACargar)}</dd>
                  </div>
                </dl>

                {/* Con filas bloqueadas no se llega acá (el botón está
                    deshabilitado): lo único que queda por avisar es el
                    descuadre contra el total declarado. */}
                {descuadre && (
                  <div className="flex items-start gap-2.5 rounded-lg bg-warn/8 px-3 py-2.5 text-[13px] text-warn">
                    <IconoAviso size={16} />
                    <span>
                      {`El total queda $ ${fmtMoney(Math.abs(diferencia))} ${diferencia > 0 ? 'por debajo' : 'por encima'} del declarado en el archivo.`}
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
                {resultado.insertadas} {plural(resultado.insertadas, 'fila insertada', 'filas insertadas')}
                {(resultado.manuales ?? 0) > 0 ? ` (${resultado.manuales} ${plural(resultado.manuales, 'manual', 'manuales')})` : ''} ·{' '}
                {resultado.omitidas} {plural(resultado.omitidas, 'omitida', 'omitidas')} · {periodoTexto}
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
