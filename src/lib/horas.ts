/** Redondea un total de horas a un decimal.
 *
 * La base guarda las horas con 2 decimales como mucho, pero sumarlas en JS
 * arrastra la cola binaria de la coma flotante (`0.1 + 0.2 + 0.3` da
 * `0.6000000000000001`) y eso se veía crudo en las tarjetas de totales.
 *
 * Devuelve `number`, no string: la convención de render de estas pantallas es
 * el número pelado + " hs", sin ceros de relleno ni coma es-AR, así que un
 * total entero se sigue viendo "8" y no "8,0". */
export function redondearHoras(n: number): number {
  return Math.round(n * 10) / 10;
}
