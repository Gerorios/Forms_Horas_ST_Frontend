import { UMBRAL_INCIDENCIA_PCT } from '../config';

export interface FilaIncidencia {
  codigo: string;
  certificado: number;
  mo: number;
  /** mo / certificado * 100, redondeado a 1 decimal. null si no hay certificado
   * para ese K (no divide por cero). */
  pct: number | null;
}

/** Cruza el monto certificado y la MO imputada por código de contrato (K),
 * unión de ambos sets de claves — un K puede aparecer en uno solo de los dos
 * mapas (certificó pero sin MO imputada aún, o viceversa). */
export function calcularIncidencia(
  certificadoPorK: Record<string, number>,
  moPorK: Record<string, number>,
): FilaIncidencia[] {
  const codigos = new Set([...Object.keys(certificadoPorK), ...Object.keys(moPorK)]);
  return Array.from(codigos).map((codigo) => {
    const certificado = certificadoPorK[codigo] ?? 0;
    const mo = moPorK[codigo] ?? 0;
    const pct = certificado === 0 ? null : Math.round((mo / certificado) * 1000) / 10;
    return { codigo, certificado, mo, pct };
  });
}

export type Semaforo = 'ok' | 'alerta' | 'excedido';

/** ok hasta el umbral, alerta por encima, excedido desde umbral × 1.5. */
export function semaforo(pct: number): Semaforo {
  if (pct > UMBRAL_INCIDENCIA_PCT * 1.5) return 'excedido';
  if (pct > UMBRAL_INCIDENCIA_PCT) return 'alerta';
  return 'ok';
}
