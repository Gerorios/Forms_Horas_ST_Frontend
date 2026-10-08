'use client';

import { useImperativeHandle, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type Ref } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { mensajeDeError } from '@/lib/api/liquidacion';
import { useCalificarReporte, useReabrirReporte, type ReporteSeguridad } from '@/lib/api/seguridad';
import { ConfirmarDialog } from './confirmar-dialog';
import { efectoEnPuntos, type AccionCalificacion, type EfectoPuntos } from './efecto-puntos';
import { FOCO_VISIBLE } from './tipos';

const ESCALA = Array.from({ length: 11 }, (_, i) => i);

/** Cuánto dura el "Deshacer" de una aprobación. */
const DESHACER_MS = 8000;

/** Guía corta bajo la escala (crítica 2026-10-08): que dos personas de HyS
 * califiquen parejo y que un "¿por qué me pusieron 4?" tenga respuesta. */
const GUIA_REPORTE = [
  { rango: '0–3', texto: 'gestión mínima' },
  { rango: '4–7', texto: 'bien gestionado' },
  { rango: '8–10', texto: 'ejemplar' },
];
const GUIA_INSPECCION = [
  { rango: '1–3', texto: 'falta leve' },
  { rango: '4–7', texto: 'falta seria' },
  { rango: '8–10', texto: 'falta grave' },
];

/** Nadie califica su propio reporte (HyS no es juez y parte). La inspección
 * es la excepción: su autora no suma puntos. Espejo de `puedeCalificar` del
 * backend, que es quien manda. */
export function puedeCalificar(r: Pick<ReporteSeguridad, 'tipo' | 'autor'>, miCuil: string | undefined): boolean {
  return r.tipo === 'inspeccion' || r.autor.cuil !== miCuil;
}

/** La tecla no es para un atajo: el foco está en un campo donde se escribe,
 * va con un modificador, o viene de un diálogo (los portales de React
 * propagan el evento al panel aunque el diálogo esté afuera en el DOM). */
export function teclaEsParaUnCampo(e: Pick<KeyboardEvent, 'target' | 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  const t = e.target as HTMLElement | null;
  if (!t || typeof t.closest !== 'function') return false;
  if (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return true;
  return t.closest('[role="dialog"], [role="alertdialog"]') != null;
}

/** Ventana para escribir "10" como "1" seguido de "0". */
const VENTANA_DIEZ_MS = 800;

/** Lo que el panel le pasa al calificador cuando se aprieta una tecla con el
 * foco en el panel (no en toda la ventana): devuelve si la usó. */
export interface AtajosCalificar {
  tecla: (key: string) => boolean;
}

/**
 * Calificación de HyS: aprobar con un puntaje de 0 a 10 o desaprobar (vale 0
 * y hay que explicarle al autor por qué). En la inspección el puntaje se
 * RESTA a cada persona observada. Un reporte ya calificado se puede
 * recalificar o reabrir (vuelve a pendiente y el autor puede corregirlo).
 *
 * Lo que mueve puntos de personas que ya los tenían, o resta en una
 * inspección, pide confirmación nombrando a los afectados (`efectoEnPuntos`).
 * Lo que no pide confirmación (aprobar por primera vez) ofrece "Deshacer"
 * unos segundos. Los atajos (0–9, "1" "0" para el 10, A aprueba) los dispara
 * el panel por `ref`, solo con el foco adentro del panel.
 */
export function CalificarReporte({
  reporte,
  miCuil,
  onHecho,
  onDeshecho,
  ref,
}: {
  reporte: ReporteSeguridad;
  miCuil: string | undefined;
  /** Después de calificar o reabrir: el panel pasa al siguiente pendiente. */
  onHecho?: () => void;
  /** Después de deshacer una aprobación: el panel vuelve a elegir este reporte. */
  onDeshecho?: (id: number) => void;
  ref?: Ref<AtajosCalificar>;
}) {
  const calificar = useCalificarReporte();
  const reabrir = useReabrirReporte();
  const [puntaje, setPuntaje] = useState<number | null>(reporte.puntaje);
  const [comentario, setComentario] = useState(reporte.comentarioHys ?? '');
  const [intentoDesaprobar, setIntentoDesaprobar] = useState(false);
  const [confirmando, setConfirmando] = useState<{ accion: AccionCalificacion; efecto: EfectoPuntos } | null>(null);
  const botonesEscala = useRef<(HTMLButtonElement | null)[]>([]);
  const ultimaTecla = useRef<{ tecla: string; en: number } | null>(null);

  const habilitado = reporte.estado !== 'anulado' && puedeCalificar(reporte, miCuil);
  const esInspeccion = reporte.tipo === 'inspeccion';
  const ocupado = calificar.isPending || reabrir.isPending;
  const faltaComentario = comentario.trim() === '';

  function deshacer() {
    const promesa = reabrir.mutateAsync(reporte.id);
    toast.promise(promesa, {
      loading: 'Deshaciendo…',
      success: 'Se deshizo: volvió a pendiente',
      error: (e) => mensajeDeError(e, 'No se pudo deshacer'),
    });
    promesa.then(() => onDeshecho?.(reporte.id)).catch(() => undefined);
  }

  function ejecutar(accion: AccionCalificacion, conConfirmacion: boolean) {
    setConfirmando(null);
    if (accion.tipo === 'reabrir') {
      const promesa = reabrir.mutateAsync(reporte.id);
      toast.promise(promesa, {
        loading: 'Reabriendo…',
        success: 'Reporte reabierto: volvió a pendiente',
        error: (e) => mensajeDeError(e, 'No se pudo reabrir'),
      });
      promesa.then(() => onHecho?.()).catch(() => undefined);
      return;
    }
    const input =
      accion.tipo === 'aprobar'
        ? { decision: 'aprobar' as const, puntaje: accion.puntaje, ...(faltaComentario ? {} : { comentario: comentario.trim() }) }
        : { decision: 'desaprobar' as const, comentario: comentario.trim() };
    const exito = accion.tipo === 'aprobar' ? (esInspeccion ? 'Inspección aprobada' : 'Reporte aprobado') : 'Reporte desaprobado';
    const id = toast.loading('Guardando calificación…');
    calificar
      .mutateAsync({ id: reporte.id, input })
      .then(() => {
        // Lo que no pasó por una confirmación (aprobar por primera vez) se
        // puede deshacer unos segundos: una tecla A de más no obliga a buscar
        // el reporte para reabrirlo.
        if (accion.tipo === 'aprobar' && !conConfirmacion) {
          toast.success(exito, { id, duration: DESHACER_MS, action: { label: 'Deshacer', onClick: deshacer } });
        } else {
          toast.success(exito, { id });
        }
        onHecho?.();
      })
      .catch((e) => toast.error(mensajeDeError(e, 'No se pudo calificar'), { id }));
  }

  /** Confirma si mueve puntos de alguien; si no, ejecuta directo. */
  function pedir(accion: AccionCalificacion) {
    if (ocupado) return;
    if (accion.tipo === 'desaprobar' && faltaComentario) {
      setIntentoDesaprobar(true);
      return;
    }
    const efecto = efectoEnPuntos(reporte, accion);
    if (efecto) setConfirmando({ accion, efecto });
    else ejecutar(accion, false);
  }

  useImperativeHandle(ref, () => ({
    tecla(key: string) {
      if (!habilitado || ocupado || confirmando) return false;
      if (/^[0-9]$/.test(key)) {
        const ahora = Date.now();
        const previa = ultimaTecla.current;
        const diez = key === '0' && previa?.tecla === '1' && ahora - previa.en < VENTANA_DIEZ_MS;
        setPuntaje(diez ? 10 : Number(key));
        ultimaTecla.current = { tecla: key, en: ahora };
        return true;
      }
      if ((key === 'a' || key === 'A') && puntaje != null) {
        pedir({ tipo: 'aprobar', puntaje });
        return true;
      }
      return false;
    },
  }));

  /** Grupo de opciones real: flechas mueven y eligen, Inicio/Fin a los bordes. */
  function teclaEscala(e: ReactKeyboardEvent<HTMLButtonElement>, n: number) {
    const siguiente =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? Math.min(10, n + 1)
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? Math.max(0, n - 1)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? 10
              : null;
    if (siguiente == null) return;
    e.preventDefault();
    e.stopPropagation();
    setPuntaje(siguiente);
    botonesEscala.current[siguiente]?.focus();
  }

  if (reporte.estado === 'anulado') {
    return <p className="text-sm text-slate">El autor anuló este reporte: no se califica.</p>;
  }
  if (!habilitado) {
    return (
      <p role="note" className="rounded-lg bg-accent px-3 py-2.5 text-sm text-ink">
        Es tu propio reporte: lo tiene que calificar otra persona de HyS.
      </p>
    );
  }

  // Sumar es verde; una inspección resta y tiene que verse distinta de un
  // vistazo: todo el bloque va en rojo y los números llevan el signo menos.
  const seleccionado = esInspeccion ? 'border-2 border-danger bg-danger text-white' : 'border-2 border-approved bg-approved text-white';
  const guia = esInspeccion ? GUIA_INSPECCION : GUIA_REPORTE;
  // Roving tabindex: un solo punto de tabulación para toda la escala.
  const enfocable = puntaje ?? 0;
  const comentarioEnFalta = intentoDesaprobar && faltaComentario;

  return (
    <div className={esInspeccion ? 'space-y-3 rounded-xl border border-danger/40 bg-danger/5 p-3' : 'space-y-3'}>
      <p className={`flex items-center gap-2 font-medium ${esInspeccion ? 'text-danger' : 'text-ink'}`}>
        {esInspeccion && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12h8" />
          </svg>
        )}
        {esInspeccion
          ? reporte.estado === 'pendiente'
            ? 'Quitar puntos'
            : 'Corregir la quita de puntos'
          : reporte.estado === 'pendiente'
            ? 'Calificar'
            : 'Recalificar'}
      </p>
      <div className="space-y-1.5">
        <p id={`escala-${reporte.id}`} className={`text-sm ${esInspeccion ? 'font-medium text-danger' : 'text-ink'}`}>
          {esInspeccion ? 'Puntos que pierde cada persona observada' : 'Puntos que suma el autor (0 a 10)'}
        </p>
        <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-labelledby={`escala-${reporte.id}`}>
          {ESCALA.map((n) => (
            <button
              key={n}
              ref={(el) => {
                botonesEscala.current[n] = el;
              }}
              type="button"
              role="radio"
              aria-checked={puntaje === n}
              aria-label={esInspeccion && n > 0 ? `menos ${n}` : String(n)}
              tabIndex={n === enfocable ? 0 : -1}
              disabled={ocupado}
              onClick={() => setPuntaje(n)}
              onKeyDown={(e) => teclaEscala(e, n)}
              className={`h-11 rounded-md font-mono text-sm font-semibold tabular-nums transition ${FOCO_VISIBLE} ${
                puntaje === n ? seleccionado : 'border border-line bg-surface text-ink hover:bg-accent/60'
              }`}
            >
              {esInspeccion && n > 0 ? `−${n}` : n}
            </button>
          ))}
        </div>
        <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate">
          {guia.map((g) => (
            <span key={g.rango}>
              <span className="font-mono font-semibold text-ink">{g.rango}</span> {g.texto}
            </span>
          ))}
        </p>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        <span>
          Comentario para el autor{' '}
          {comentarioEnFalta ? (
            <span className="font-semibold text-danger">(obligatorio para desaprobar)</span>
          ) : puntaje != null ? (
            <span className="font-normal text-slate">(opcional)</span>
          ) : (
            <span className="font-normal text-slate">(obligatorio si desaprobás)</span>
          )}
        </span>
        <textarea
          rows={3}
          value={comentario}
          aria-invalid={comentarioEnFalta || undefined}
          aria-describedby={comentarioEnFalta ? `falta-comentario-${reporte.id}` : undefined}
          onChange={(e) => setComentario(e.target.value)}
          className={`rounded-md border bg-surface px-3 py-2 text-base font-normal text-ink focus:border-brand-deep ${FOCO_VISIBLE} ${
            comentarioEnFalta ? 'border-danger' : 'border-line'
          }`}
        />
      </label>
      {comentarioEnFalta && (
        <p id={`falta-comentario-${reporte.id}`} role="alert" className="text-sm text-danger">
          Para desaprobar hay que explicarle al autor por qué.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {esInspeccion ? (
          // En una inspección, desaprobar es lo indulgente: nadie pierde
          // puntos. Neutro, para que no se confunda con "Restar".
          <Button variant="secondary" disabled={ocupado} onClick={() => pedir({ tipo: 'desaprobar' })} className="min-h-11 flex-col gap-0 bg-surface py-1.5">
            <span>Desaprobar</span>
            <span className="text-xs font-normal text-slate">nadie pierde puntos</span>
          </Button>
        ) : (
          <Button variant="danger" disabled={ocupado} onClick={() => pedir({ tipo: 'desaprobar' })} className="min-h-11 bg-surface">
            Desaprobar
          </Button>
        )}
        <Button
          variant={esInspeccion ? 'danger-solid' : 'approve'}
          disabled={ocupado || puntaje == null}
          onClick={() => puntaje != null && pedir({ tipo: 'aprobar', puntaje })}
          className="min-h-11 font-semibold"
        >
          {puntaje == null
            ? 'Elegí un puntaje'
            : esInspeccion
              ? puntaje === 0
                ? 'Aprobar sin restar'
                : `Restar ${puntaje} a cada persona`
              : `Aprobar con +${puntaje}`}
        </Button>
      </div>
      {(reporte.estado === 'aprobado' || reporte.estado === 'desaprobado') && (
        <Button variant="secondary" disabled={ocupado} onClick={() => pedir({ tipo: 'reabrir' })} className="min-h-11 w-full bg-surface">
          Reabrir (vuelve a pendiente)
        </Button>
      )}
      <p className="text-xs text-slate">
        Aprobado o desaprobado, el autor ya no lo puede editar: si algo está mal clasificado, corregilo vos (los puntos se
        recalculan) o reabrilo para que lo corrija el autor.
      </p>

      {confirmando && (
        <ConfirmarDialog
          titulo={confirmando.efecto.titulo}
          detalle={confirmando.efecto.detalle}
          afectados={confirmando.efecto.afectados}
          verbo={confirmando.efecto.verbo}
          variante={confirmando.efecto.variante}
          ocupado={ocupado}
          onCancelar={() => setConfirmando(null)}
          onConfirmar={() => ejecutar(confirmando.accion, true)}
        />
      )}
    </div>
  );
}
