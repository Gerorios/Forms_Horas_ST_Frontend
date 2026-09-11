import { contieneTexto } from '@/lib/facetado';
import type { MovilAdmin } from '@/lib/api/admin';

/** Deja solo letras y números en mayúscula. Misma regla que usa el Backend
 * para matchear patentes leídas de un ticket (extraccion-ticket.service.ts),
 * para que buscar "aa 615" o "aa-615" encuentre igual a AA615NF: las patentes
 * están guardadas sin separadores, pero nadie las tipea así. */
export function normalizarPatente(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** ¿El móvil entra en la búsqueda? Coincide por patente (normalizada de los
 * dos lados) o por descripción, que es el tipo de vehículo y puede ser nula.
 * Búsqueda vacía = pasa todo.
 *
 * Si lo tipeado queda vacío al normalizar (alguien escribió solo "-"), la vía
 * de la patente no se evalúa: `''.includes('')` daría true y devolvería la
 * flota entera. La descripción sí se sigue mirando. */
export function coincideMovil(
  movil: Pick<MovilAdmin, 'identificador' | 'descripcion'>,
  busqueda: string,
): boolean {
  if (busqueda.trim() === '') return true;

  const buscada = normalizarPatente(busqueda);
  if (buscada !== '' && normalizarPatente(movil.identificador).includes(buscada)) return true;

  return movil.descripcion !== null && contieneTexto(movil.descripcion, busqueda);
}
