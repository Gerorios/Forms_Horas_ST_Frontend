import type { TipoReporte } from '@/lib/api/seguridad';

/** Espejo de `CAMPOS_POR_TIPO` del backend (src/seguridad/reglas.ts): qué pide
 * cada tipo además de los campos comunes. El backend vuelve a validarlo. */
export interface CamposDelTipo {
  naturaleza: boolean;
  motivoParalizacion: boolean;
  controlRiesgo: boolean;
  involucrados: 'no' | 'opcional' | 'obligatorio';
  fotosControl: boolean;
}

export const CAMPOS_POR_TIPO: Record<TipoReporte, CamposDelTipo> = {
  aviso_riesgo: { naturaleza: true, motivoParalizacion: false, controlRiesgo: true, involucrados: 'opcional', fotosControl: true },
  incidente: { naturaleza: true, motivoParalizacion: false, controlRiesgo: true, involucrados: 'opcional', fotosControl: true },
  paralizacion: { naturaleza: false, motivoParalizacion: true, controlRiesgo: true, involucrados: 'opcional', fotosControl: true },
  propuesta_mejora: { naturaleza: false, motivoParalizacion: false, controlRiesgo: false, involucrados: 'no', fotosControl: false },
  inspeccion: { naturaleza: true, motivoParalizacion: false, controlRiesgo: true, involucrados: 'obligatorio', fotosControl: true },
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
}

/** Qué falta para poder enviar (vacío = listo). Mismos mensajes que el
 * backend, para que el operario lea lo mismo en los dos lados. */
export function faltantes(f: FormularioReporte): string[] {
  if (!f.tipo) return ['Elegí qué querés reportar'];
  const reglas = CAMPOS_POR_TIPO[f.tipo];
  const lista: string[] = [];
  if (!f.fechaReporte) lista.push('Falta la fecha');
  if (f.provinciaId == null) lista.push('Falta la provincia');
  if (f.contratoId == null) lista.push('Falta el contrato');
  if (f.tareaId == null) lista.push('Falta la tarea');
  if (reglas.naturaleza && f.naturalezaId == null) lista.push('Falta la naturaleza del riesgo');
  if (reglas.motivoParalizacion && f.motivoParalizacionId == null) lista.push('Falta el motivo de la paralización');
  if (f.descripcion.trim() === '') lista.push(f.tipo === 'propuesta_mejora' ? 'Falta tu propuesta' : 'Falta contar qué viste');
  if (reglas.controlRiesgo && f.controlRiesgo.trim() === '') lista.push('Falta lo que hiciste para controlar el riesgo');
  if (reglas.involucrados === 'obligatorio' && f.involucrados.length === 0) {
    lista.push('Una inspección necesita al menos una persona observada');
  }
  return lista;
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
