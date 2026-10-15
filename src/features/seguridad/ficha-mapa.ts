import type { EstadoReporte, PuntoMapa, TipoReporte } from '@/lib/api/seguridad';
import { ORIGEN_PUNTO_LABEL } from './boton-ubicacion';
import { TIPO_LABEL } from './tipos';

/**
 * Lo que comparten el mapa de reportes y su leyenda (sin Leaflet, para poder
 * usarlo fuera del navegador y testearlo): el color de cada tipo y la ficha
 * del pin.
 */

/** Color del pin por tipo, de la paleta del tema (globals.css). La
 * paralización, la única alarma, en el rojo de peligro. */
export const COLOR_TIPO: Record<TipoReporte, string> = {
  paralizacion: 'var(--color-danger)',
  incidente: 'var(--color-chart-4)',
  aviso_riesgo: 'var(--color-chart-2)',
  propuesta_mejora: 'var(--color-chart-3)',
  inspeccion: 'var(--color-graphite)',
};

export const ORDEN_TIPOS: TipoReporte[] = ['paralizacion', 'incidente', 'aviso_riesgo', 'propuesta_mejora', 'inspeccion'];

const ESTADO_LABEL: Record<EstadoReporte, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  desaprobado: 'Desaprobado',
  anulado: 'Anulado',
};

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const fechaCorta = (dia: string) => {
  const [a, m, d] = dia.split('-');
  return `${d}/${m}/${a}`;
};

/** HTML de la ficha que abre el pin (Leaflet recibe un string). Todo va
 * escapado: los nombres de catálogo los carga gente. */
export function fichaHtml(p: PuntoMapa): string {
  const estado = p.estado === 'aprobado' && p.puntaje != null ? `Aprobado · ${p.puntaje} pts` : ESTADO_LABEL[p.estado];
  const detalle = p.naturaleza ?? p.motivoParalizacion;
  const error = p.punto.errorMetros != null ? ` ±${Math.round(p.punto.errorMetros)} m` : '';
  const filas = [
    `<strong style="color:${COLOR_TIPO[p.tipo]}">${escapar(TIPO_LABEL[p.tipo])}</strong>`,
    `${fechaCorta(p.fechaReporte)} · ${escapar(estado)}`,
    `${escapar(p.contrato)} › ${escapar(p.tarea)}`,
    detalle ? escapar(detalle) : null,
    `<span style="color:var(--color-slate)">${escapar(p.provincia)} · punto: ${escapar(ORIGEN_PUNTO_LABEL[p.punto.origen])}${error}</span>`,
    `<a href="/seguridad/${p.id}" target="_blank" rel="noopener">Ver el reporte</a>`,
  ];
  return `<div style="display:grid;gap:2px;font-size:13px;line-height:1.35">${filas.filter(Boolean).join('<br>')}</div>`;
}
