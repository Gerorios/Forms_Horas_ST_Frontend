import type { TipoReporte } from '@/lib/api/seguridad';

/** Espejo de `CAMPOS_POR_TIPO` del backend (src/seguridad/reglas.ts): qué pide
 * cada tipo además de los campos comunes. El backend vuelve a validarlo. */
export interface CamposDelTipo {
  naturaleza: boolean;
  motivoParalizacion: boolean;
  controlRiesgo: boolean;
  involucrados: 'no' | 'opcional' | 'obligatorio';
  fotosControl: boolean;
  /** Punto GPS ("Tomar mi ubicación"): obligatorio en la paralización. */
  puntoGps: 'obligatorio' | 'opcional';
}

export const CAMPOS_POR_TIPO: Record<TipoReporte, CamposDelTipo> = {
  aviso_riesgo: { naturaleza: true, motivoParalizacion: false, controlRiesgo: true, involucrados: 'opcional', fotosControl: true, puntoGps: 'opcional' },
  incidente: { naturaleza: true, motivoParalizacion: false, controlRiesgo: true, involucrados: 'opcional', fotosControl: true, puntoGps: 'opcional' },
  paralizacion: { naturaleza: false, motivoParalizacion: true, controlRiesgo: true, involucrados: 'opcional', fotosControl: true, puntoGps: 'obligatorio' },
  propuesta_mejora: { naturaleza: false, motivoParalizacion: false, controlRiesgo: false, involucrados: 'no', fotosControl: false, puntoGps: 'opcional' },
  inspeccion: { naturaleza: true, motivoParalizacion: false, controlRiesgo: true, involucrados: 'obligatorio', fotosControl: true, puntoGps: 'opcional' },
};

export const TIPO_LABEL: Record<TipoReporte, string> = {
  aviso_riesgo: 'Aviso de riesgo',
  incidente: 'Incidente',
  paralizacion: 'Paralización de trabajos',
  propuesta_mejora: 'Propuesta de mejora',
  inspeccion: 'Inspección de seguridad',
};

export const TIPO_AYUDA: Record<TipoReporte, string> = {
  aviso_riesgo: 'Una condición o un acto que podría causar un accidente.',
  incidente: 'Algo que pasó sin lesionados ni baja: una falla, un golpe, una desviación.',
  paralizacion: 'Se detuvo una tarea por un riesgo. Lo urgente avisalo igual por WhatsApp.',
  propuesta_mejora: 'Una idea para trabajar más seguro.',
  inspeccion: 'Lo que viste en una salida de campo. Las personas observadas pierden los puntos que le pongas al aprobarla.',
};

/** Orden del selector. La inspección solo aparece para HyS. */
export const TIPOS_PARA_TODOS: TipoReporte[] = ['aviso_riesgo', 'incidente', 'paralizacion', 'propuesta_mejora'];

export const MAX_FOTOS_POR_GRUPO = 3;

export interface FormularioReporte {
  tipo: TipoReporte | null;
  naturalezaId: number | null;
  motivoParalizacionId: number | null;
  controlRiesgo: string;
  involucrados: string[];
  descripcion: string;
  fechaReporte: string;
  provinciaId: number | null;
  contratoId: number | null;
  tareaId: number | null;
  /** Si tiene el punto GPS. `undefined` = no se exige (corrección de HyS). */
  tienePunto?: boolean;
}

/** Campos del formulario que pueden faltar, en el orden en que aparecen en
 * pantalla: el primero es al que se lleva el foco al intentar enviar. */
export type CampoReporte =
  | 'tipo'
  | 'fechaReporte'
  | 'provinciaId'
  | 'contratoId'
  | 'tareaId'
  | 'punto'
  | 'naturalezaId'
  | 'motivoParalizacionId'
  | 'descripcion'
  | 'involucrados'
  | 'controlRiesgo';

/** Qué falta para poder enviar, campo por campo (vacío = listo). Mismos
 * mensajes que el backend, para que el operario lea lo mismo en los dos lados. */
export function faltantesPorCampo(f: FormularioReporte): { campo: CampoReporte; mensaje: string }[] {
  if (!f.tipo) return [{ campo: 'tipo', mensaje: 'Elegí qué querés reportar' }];
  const reglas = CAMPOS_POR_TIPO[f.tipo];
  const lista: { campo: CampoReporte; mensaje: string }[] = [];
  const falta = (campo: CampoReporte, mensaje: string) => lista.push({ campo, mensaje });
  if (!f.fechaReporte) falta('fechaReporte', 'Falta la fecha');
  if (f.provinciaId == null) falta('provinciaId', 'Falta la provincia');
  if (f.contratoId == null) falta('contratoId', 'Falta el contrato');
  if (f.tareaId == null) falta('tareaId', 'Falta la tarea');
  if (reglas.puntoGps === 'obligatorio' && f.tienePunto === false) {
    falta('punto', 'Falta tomar la ubicación: hay que saber de qué obra se trata');
  }
  if (reglas.naturaleza && f.naturalezaId == null) falta('naturalezaId', 'Falta la naturaleza del riesgo');
  if (reglas.motivoParalizacion && f.motivoParalizacionId == null) {
    falta('motivoParalizacionId', 'Falta el motivo de la paralización');
  }
  if (f.descripcion.trim() === '') {
    falta('descripcion', f.tipo === 'propuesta_mejora' ? 'Falta tu propuesta' : 'Falta contar qué viste');
  }
  if (reglas.involucrados === 'obligatorio' && f.involucrados.length === 0) {
    falta('involucrados', 'Una inspección necesita al menos una persona observada');
  }
  if (reglas.controlRiesgo && f.controlRiesgo.trim() === '') {
    falta('controlRiesgo', 'Falta lo que hiciste para controlar el riesgo');
  }
  return lista;
}

/** Los mensajes de `faltantesPorCampo`, en orden de pantalla. */
export function faltantes(f: FormularioReporte): string[] {
  return faltantesPorCampo(f).map((x) => x.mensaje);
}

/** Foco de teclado visible en los botones propios del módulo: contorno
 * sólido con separación, en el dorado oscuro (el dorado claro no llega a 3:1
 * sobre blanco o arena). */
export const FOCO_VISIBLE = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep';

/** Fecha y hora con año ('08/10/2026 14:32'): con el año en curso por defecto
 * en los rangos, una fecha sin año es ambigua. */
export function fechaHoraLarga(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Coordenadas para mostrar: 5 decimales (~1 m) alcanzan. */
export function coordenada(n: number): string {
  return n.toFixed(5);
}

/** 'YYYY-MM-DD' de hoy en hora local (el celular está en Argentina). */
export function hoyLocal(ahora: Date = new Date()): string {
  const mm = String(ahora.getMonth() + 1).padStart(2, '0');
  const dd = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mm}-${dd}`;
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY'. */
export function fechaCorta(clave: string): string {
  const [a, m, d] = clave.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export function signo(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}
