// Helpers de formateo compartidos por las pantallas de Liquidación — antes
// reimplementados de forma casi idéntica en varios archivos (cierres/page,
// cierre-detalle-dialog, cerrar-quincena-dialog, fila-empleado). Fix round 1
// del review de Task 10 (2026-08-30-cierre-liquidacion-export): una sola
// definición de cada uno en el repo.

/**
 * Los Decimal de Prisma llegan serializados por JSON como `string` en varios
 * endpoints (bono.valor, filas de detalle de quincena, detalle de cierre) y
 * como `number` en otros (cálculo en memoria) — por eso acepta
 * `number | string | null` y siempre pasa por `Number(...)` antes de
 * formatear. `null` se usa en los campos opcionales del detalle de cierre
 * (p.ej. precioBruto de un mensualizado).
 */
export function formatMoney(v: number | string | null): string {
  if (v == null) return '—';
  return Number(v).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
}

/** "1ª quincena de agosto 2026" / "2ª quincena de agosto 2026". */
export function nombreQuincena(quincena: number, mes: number, anio: number): string {
  const nombreMes = new Date(2000, mes - 1, 1).toLocaleDateString('es-AR', { month: 'long' });
  return `${quincena === 1 ? '1ª' : '2ª'} quincena de ${nombreMes} ${anio}`;
}
