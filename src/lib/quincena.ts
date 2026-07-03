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

export function quincenaDeFecha(d: Date): Quincena {
  return {
    anio: d.getFullYear(),
    mes: d.getMonth() + 1,
    parte: d.getDate() <= 15 ? 1 : 2,
  };
}

/** fechaISO: 'YYYY-MM-DD' o ISO completo. Compara por rango de la quincena. */
export function enQuincena(fechaISO: string, q: Quincena): boolean {
  const d = new Date(fechaISO);
  const { desde, hasta } = rangoQuincena(q);
  return d >= desde && d <= hasta;
}
