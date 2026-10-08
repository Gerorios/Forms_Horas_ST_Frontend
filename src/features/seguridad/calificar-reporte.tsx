'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { mensajeDeError } from '@/lib/api/liquidacion';
import { useCalificarReporte, useReabrirReporte, type ReporteSeguridad } from '@/lib/api/seguridad';
import { ConfirmarDialog } from './confirmar-dialog';
import { efectoEnPuntos, type AccionCalificacion, type EfectoPuntos } from './efecto-puntos';

const ESCALA = Array.from({ length: 11 }, (_, i) => i);

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

/** El foco está en un campo donde se escribe: los atajos no deben tragarse
 * las teclas, ni actuar detrás de un diálogo abierto. */
export function teclaEsParaUnCampo(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return true;
  return document.querySelector('[role="dialog"], [role="alertdialog"]') != null;
}

/** Ventana para escribir "10" como "1" seguido de "0". */
const VENTANA_DIEZ_MS = 800;

/**
 * Calificación de HyS: aprobar con un puntaje de 0 a 10 o desaprobar (vale 0
 * y hay que explicarle al autor por qué). En la inspección el puntaje se
 * RESTA a cada persona observada. Un reporte ya calificado se puede
 * recalificar o reabrir (vuelve a pendiente y el autor puede corregirlo).
 *
 * Lo que mueve puntos de personas que ya los tenían, o resta en una
 * inspección, pide confirmación nombrando a los afectados (`efectoEnPuntos`).
 * Atajos con el reporte elegido: 0–9 (y "1" "0" para el 10) eligen el
 * puntaje, A aprueba. `onHecho` avisa al panel para pasar al siguiente.
 */
export function CalificarReporte({
  reporte,
  miCuil,
  onHecho,
}: {
  reporte: ReporteSeguridad;
  miCuil: string | undefined;
  onHecho?: () => void;
}) {
  const calificar = useCalificarReporte();
  const reabrir = useReabrirReporte();
  const [puntaje, setPuntaje] = useState<number | null>(reporte.puntaje);
  const [comentario, setComentario] = useState(reporte.comentarioHys ?? '');
  const [intentoDesaprobar, setIntentoDesaprobar] = useState(false);
  const [confirmando, setConfirmando] = useState<{ accion: AccionCalificacion; efecto: EfectoPuntos } | null>(null);

  const habilitado = reporte.estado !== 'anulado' && puedeCalificar(reporte, miCuil);
  const esInspeccion = reporte.tipo === 'inspeccion';
  const ocupado = calificar.isPending || reabrir.isPending;
  const faltaComentario = comentario.trim() === '';

  function ejecutar(accion: AccionCalificacion) {
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
    const promesa = calificar.mutateAsync({ id: reporte.id, input });
    toast.promise(promesa, {
      loading: 'Guardando calificación…',
      success: accion.tipo === 'aprobar' ? (esInspeccion ? 'Inspección aprobada' : 'Reporte aprobado') : 'Reporte desaprobado',
      error: (e) => mensajeDeError(e, 'No se pudo calificar'),
    });
    promesa.then(() => onHecho?.()).catch(() => undefined);
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
    else ejecutar(accion);
  }

  // Atajos de teclado. La función vigente se lee de un ref para que el
  // listener (uno solo por reporte) vea siempre el puntaje actual.
  const atajo = useRef<(e: KeyboardEvent) => void>(() => undefined);
  const ultimaTecla = useRef<{ tecla: string; en: number } | null>(null);
  const manejarAtajo = (e: KeyboardEvent) => {
    if (!habilitado || teclaEsParaUnCampo(e)) return;
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const ahora = Date.now();
      const previa = ultimaTecla.current;
      const diez = e.key === '0' && previa?.tecla === '1' && ahora - previa.en < VENTANA_DIEZ_MS;
      setPuntaje(diez ? 10 : Number(e.key));
      ultimaTecla.current = { tecla: e.key, en: ahora };
      return;
    }
    if ((e.key === 'a' || e.key === 'A') && puntaje != null) {
      e.preventDefault();
      pedir({ tipo: 'aprobar', puntaje });
    }
  };
  useEffect(() => {
    atajo.current = manejarAtajo;
  });
  useEffect(() => {
    const oyente = (e: KeyboardEvent) => atajo.current(e);
    window.addEventListener('keydown', oyente);
    return () => window.removeEventListener('keydown', oyente);
  }, []);

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
        <p className={`text-sm ${esInspeccion ? 'font-medium text-danger' : 'text-slate'}`}>
          {esInspeccion ? 'Puntos que pierde cada persona observada' : 'Puntos que suma el autor (0 a 10)'}
        </p>
        <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Puntaje">
          {ESCALA.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={puntaje === n}
              disabled={ocupado}
              onClick={() => setPuntaje(n)}
              className={`h-11 rounded-md font-mono text-sm font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
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
      <label className="flex flex-col gap-1 text-sm text-slate">
        Comentario para el autor (opcional; obligatorio si desaprobás)
        <textarea
          rows={3}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </label>
      {intentoDesaprobar && faltaComentario && (
        <p role="alert" className="text-sm text-danger">
          Para desaprobar hay que explicarle al autor por qué.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="danger" disabled={ocupado} onClick={() => pedir({ tipo: 'desaprobar' })} className="min-h-11">
          Desaprobar
        </Button>
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
        <Button variant="secondary" disabled={ocupado} onClick={() => pedir({ tipo: 'reabrir' })} className="min-h-11 w-full">
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
          onConfirmar={() => ejecutar(confirmando.accion)}
        />
      )}
    </div>
  );
}
