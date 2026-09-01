export const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/** "mmm YY" es-AR a partir de anio/mes numéricos (ej. 2026, 7 -> "jul 26"). */
function etiquetaAnioMes(anio: number, mes: number): string {
  const nombre = MESES_CORTOS[mes - 1] ?? String(mes);
  return `${nombre} ${String(anio).slice(2)}`;
}

export interface CertPorMes {
  periodo: string;
  contrato: string;
  monto: number;
}

export interface ContratoMoSerie {
  codigo: string;
  montoMo: number;
}

export interface IncidenciaMesSerie {
  anio: number;
  mes: number;
  contratos: ContratoMoSerie[];
  sinAsignar: number | null;
}

export interface PuntoSerie {
  etiqueta: string;
  /** null si el certificado total del mes es 0 (no divide por cero). */
  global: number | null;
  /** pct por K; null si ese K no tiene certificado en el mes. */
  porK: Record<string, number | null>;
}

function pct(mo: number, certificado: number): number | null {
  return certificado === 0 ? null : Math.round((mo / certificado) * 1000) / 10;
}

/** Cruza la serie de MO imputada (Task 1, `/certificaciones/incidencia-mo/serie`)
 * con el monto certificado por contrato/mes (`usePorContratoMes`), mes a mes,
 * en el orden ascendente que ya trae `moSerie` — la MO es la que define los
 * puntos de la serie (12 meses fijos); el certificado solo se busca por
 * período+contrato para calcular el pct. */
export function construirSerie(certPorMes: CertPorMes[], moSerie: IncidenciaMesSerie[]): PuntoSerie[] {
  const certificadoPorPeriodoK = new Map<string, number>();
  for (const c of certPorMes) {
    const clave = `${c.periodo}|${c.contrato}`;
    certificadoPorPeriodoK.set(clave, (certificadoPorPeriodoK.get(clave) ?? 0) + c.monto);
  }

  return moSerie.map((punto) => {
    const periodo = `${punto.anio}-${String(punto.mes).padStart(2, '0')}`;
    const porK: Record<string, number | null> = {};
    let sumaMo = 0;
    let sumaCertificado = 0;
    for (const c of punto.contratos) {
      const certificado = certificadoPorPeriodoK.get(`${periodo}|${c.codigo}`) ?? 0;
      porK[c.codigo] = pct(c.montoMo, certificado);
      sumaMo += c.montoMo;
      sumaCertificado += certificado;
    }
    return {
      etiqueta: etiquetaAnioMes(punto.anio, punto.mes),
      global: pct(sumaMo, sumaCertificado),
      porK,
    };
  });
}
