export type Quincena = { anio: number; mes: number; parte: 1 | 2 };

/** mes: 1–12. Devuelve el rango [desde, hasta] local que cubre la quincena. */
export function rangoQuincena(q: Quincena): { desde: Date; hasta: Date } {
  const mesIdx = q.mes - 1;
  if (q.parte === 1) {
    return {
      desde: new Date(q.anio, mesIdx, 1, 0, 0, 0, 0),
      hasta: new Date(q.anio, mesIdx, 15, 23, 59, 59, 999),
    };
  }
  const ultimoDia = new Date(q.anio, mesIdx + 1, 0).getDate();
  return {
    desde: new Date(q.anio, mesIdx, 16, 0, 0, 0, 0),
    hasta: new Date(q.anio, mesIdx, ultimoDia, 23, 59, 59, 999),
  };
}

/** El rango de la quincena como strings YYYY-MM-DD (para query params del
 * backend). Formateo manual: toISOString correría el día por la zona horaria. */
export function rangoQuincenaISO(q: Quincena): { desde: string; hasta: string } {
  const { desde, hasta } = rangoQuincena(q);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { desde: iso(desde), hasta: iso(hasta) };
}

export function quincenaDeFecha(d: Date): Quincena {
  return {
    anio: d.getFullYear(),
    mes: d.getMonth() + 1,
    parte: d.getDate() <= 15 ? 1 : 2,
  };
}

/** Días que faltan (inclusive) para el cierre de la quincena, contando desde
 * `hoy` a medianoche local — 0 el último día, nunca negativo. */
export function diasParaCierreQuincena(q: Quincena, hoy: Date = new Date()): number {
  const { hasta } = rangoQuincena(q);
  const hoyMidnight = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const hastaMidnight = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  const ms = hastaMidnight.getTime() - hoyMidnight.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** La quincena inmediata anterior — ya cerrada, sin el ruido de "todavía no
 * le tocaba cargar" de la quincena en curso. */
export function quincenaAnterior(q: Quincena): Quincena {
  if (q.parte === 2) return { anio: q.anio, mes: q.mes, parte: 1 };
  const mesAnterior = q.mes === 1 ? 12 : q.mes - 1;
  const anioAnterior = q.mes === 1 ? q.anio - 1 : q.anio;
  return { anio: anioAnterior, mes: mesAnterior, parte: 2 };
}

/** fechaISO: 'YYYY-MM-DD' o ISO completo. Compara por rango de la quincena. */
export function enQuincena(fechaISO: string, q: Quincena): boolean {
  // Se parsea solo la parte YYYY-MM-DD como fecha LOCAL, para no correrse de día
  // por zona horaria (p. ej. "2026-07-16T00:00:00.000Z" en UTC-3 sería el 15 local).
  const [y, m, d] = fechaISO.slice(0, 10).split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  const { desde, hasta } = rangoQuincena(q);
  return fecha >= desde && fecha <= hasta;
}
