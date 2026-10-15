import type { ReporteSeguridad } from '@/lib/api/seguridad';

/**
 * Qué le pasa a los puntos de quién cuando HyS califica, desaprueba o reabre
 * un reporte (crítica de diseño 2026-10-08, P1: las acciones que mueven puntos
 * de personas se confirman nombrando a los afectados).
 *
 * `null` = no hace falta confirmar: aprobar por primera vez un reporte común
 * (suma al autor y es lo esperado) o desaprobar uno que todavía no tenía
 * puntos.
 */
export type AccionCalificacion = { tipo: 'aprobar'; puntaje: number } | { tipo: 'desaprobar' } | { tipo: 'reabrir' };

export interface EfectoPuntos {
  titulo: string;
  detalle: string;
  /** Nombres de las personas cuyos puntos cambian. */
  afectados: string[];
  /** Texto del botón que confirma: un verbo, no "Aceptar". */
  verbo: string;
  variante: 'approve' | 'danger-solid' | 'primary';
}

const nombre = (p: { nombre: string; cuil: string }) => p.nombre || p.cuil;

export function efectoEnPuntos(
  r: Pick<ReporteSeguridad, 'tipo' | 'estado' | 'puntaje' | 'autor' | 'involucrados'>,
  accion: AccionCalificacion,
): EfectoPuntos | null {
  const esInspeccion = r.tipo === 'inspeccion';
  const afectados = esInspeccion ? r.involucrados.map(nombre) : [nombre(r.autor)];
  // Puntos que hoy están aplicados (solo un aprobado los tiene).
  const previo = r.estado === 'aprobado' ? r.puntaje : null;
  const quien = esInspeccion ? (afectados.length === 1 ? 'la persona observada' : 'cada persona observada') : 'el autor';

  if (accion.tipo === 'aprobar') {
    const p = accion.puntaje;
    if (esInspeccion) {
      if (previo == null && p === 0) return null;
      if (previo === p) return null;
      return previo == null
        ? {
            titulo: `Restar ${p} ${p === 1 ? 'punto' : 'puntos'} a ${quien}`,
            detalle: 'Cada una pierde estos puntos en el ranking. Se puede corregir después, pero conviene revisar los nombres.',
            afectados,
            verbo: `Restar ${p}`,
            variante: 'danger-solid',
          }
        : {
            titulo: `Cambiar la quita de −${previo} a −${p}`,
            detalle: `Se recalculan los puntos de ${quien}.`,
            afectados,
            verbo: 'Cambiar la quita',
            variante: 'danger-solid',
          };
    }
    if (previo == null || previo === p) return null;
    return {
      titulo: `Cambiar de +${previo} a +${p}`,
      detalle: 'Se recalculan los puntos del autor.',
      afectados,
      verbo: 'Cambiar el puntaje',
      variante: 'approve',
    };
  }

  if (accion.tipo === 'desaprobar') {
    if (previo == null) return null;
    return esInspeccion
      ? {
          titulo: `Se devuelven los −${previo} puntos`,
          detalle: 'Al desaprobar la inspección, las personas observadas recuperan lo que se les había restado.',
          afectados,
          verbo: 'Desaprobar',
          variante: 'danger-solid',
        }
      : {
          titulo: `Se quitan los +${previo} puntos`,
          detalle: 'Al desaprobar, el autor pierde los puntos que ya tenía por este reporte.',
          afectados,
          verbo: 'Desaprobar',
          variante: 'danger-solid',
        };
  }

  // Reabrir: vuelve a pendiente y se borran sus puntos y el comentario.
  if (previo == null) {
    return {
      titulo: 'Vuelve a pendiente',
      detalle: 'No tiene puntos asignados. Se borra el comentario de HyS y el autor puede corregirlo.',
      afectados: [],
      verbo: 'Reabrir',
      variante: 'primary',
    };
  }
  return esInspeccion
    ? {
        titulo: `Se devuelven los −${previo} puntos`,
        detalle: 'Vuelve a pendiente: las personas observadas recuperan lo restado hasta que se vuelva a aprobar.',
        afectados,
        verbo: 'Reabrir',
        variante: 'primary',
      }
    : {
        titulo: `Se quitan los +${previo} puntos`,
        detalle: 'Vuelve a pendiente: el autor pierde estos puntos hasta que se vuelva a aprobar, y puede corregirlo.',
        afectados,
        verbo: 'Reabrir',
        variante: 'primary',
      };
}
