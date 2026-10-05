import type { FilaDetalleEmpleado } from '@/lib/api/liquidacion';
import { fechaCorta, fechaLegible } from '@/features/novedades/baja';

/** Cómo se pinta una fila de la preliquidación según la Baja de Operario
 * (ADR-026 del backend). El color va en la fila COMPLETA (fondo + acento a la
 * izquierda) y el chip es corto, para no ensanchar la columna de alertas; la
 * explicación larga vive en el detalle desplegable:
 * - rojo: baja confirmada ANTES de la quincena y snuempleados todavía la
 *   tiene activa → $0 y pedido de regularización;
 * - gris: igual, pero snuempleados ya la marcó inactiva → $0;
 * - amarillo: baja dentro de la quincena → liquidación final;
 * - sin color, solo chip: baja informada que HyS no confirmó (sin efecto). */
export function estiloBaja(fila: Pick<FilaDetalleEmpleado, 'estadoBaja' | 'fechaBaja' | 'activo'>): {
  /** Fondo de la fila entera. */
  claseFila: string;
  /** Acento a la izquierda, para la primera celda. */
  claseAcento: string;
  chip: { texto: string; clase: string; title: string };
  /** Explicación completa, para el detalle. */
  detalle: string;
  claseDetalle: string;
} | null {
  if (!fila.estadoBaja || !fila.fechaBaja) return null;
  const corta = fechaCorta(fila.fechaBaja);
  const larga = fechaLegible(fila.fechaBaja);
  switch (fila.estadoBaja) {
    case 'previa':
      return fila.activo
        ? {
            claseFila: 'bg-danger/20 hover:bg-danger/25',
            claseAcento: 'border-l-4 border-l-danger',
            chip: { texto: `Baja ${corta}`, clase: 'bg-danger text-white', title: 'No se liquida: baja anterior a la quincena' },
            detalle: `Baja confirmada: último día trabajado ${larga}, anterior a esta quincena. No se liquida ($0). Sigue activo en la base de sueldos: sale en la hoja BAJAS A REGULARIZAR del Excel para que lo den de baja.`,
            claseDetalle: 'border-danger/40 bg-danger/10 text-danger',
          }
        : {
            claseFila: 'bg-slate/15 hover:bg-slate/20',
            claseAcento: 'border-l-4 border-l-slate',
            chip: { texto: `Baja ${corta}`, clase: 'bg-slate/20 text-slate', title: 'No se liquida: baja anterior a la quincena' },
            detalle: `Baja confirmada: último día trabajado ${larga}, anterior a esta quincena. No se liquida ($0). Ya figura inactivo en la base de sueldos: no se envía en el Excel.`,
            claseDetalle: 'border-slate/40 bg-slate/10 text-slate',
          };
    case 'en_quincena':
      return {
        claseFila: 'bg-yellow-100 hover:bg-yellow-200/70',
        claseAcento: 'border-l-4 border-l-yellow-400',
        chip: { texto: `Baja ${corta}`, clase: 'bg-yellow-300 text-yellow-900', title: 'Liquidación final' },
        detalle: `Baja confirmada: último día trabajado ${larga}. Es su liquidación final: no se liquida nada posterior a esa fecha (horas, plus de novedades, ausencias).`,
        claseDetalle: 'border-yellow-400 bg-yellow-50 text-yellow-900',
      };
    case 'sin_confirmar':
      return {
        claseFila: '',
        claseAcento: '',
        chip: { texto: 'Baja s/conf.', clase: 'bg-slate/10 text-slate', title: 'Baja informada, sin confirmar por HyS' },
        detalle: `Baja informada con último día trabajado ${larga}, pendiente de confirmación de HyS. Hasta que se confirme no tiene efecto en la liquidación.`,
        claseDetalle: 'border-line bg-sand/60 text-slate',
      };
  }
}
