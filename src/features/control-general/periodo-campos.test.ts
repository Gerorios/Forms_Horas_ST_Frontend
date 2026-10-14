import { describe, it, expect } from 'vitest';
import { errorRango, periodoEfectivo, quincenaDelPeriodo } from './periodo-campos';

describe('errorRango (ADR-030)', () => {
  it('sin fechas o con un rango válido no hay error', () => {
    expect(errorRango('', '')).toBeNull();
    expect(errorRango('2026-03-05', '2026-06-20')).toBeNull();
    expect(errorRango('2025-10-15', '2026-10-14')).toBeNull(); // 12 meses justos
  });

  it('avisa si falta una fecha, si está invertido o si pasa de 12 meses', () => {
    expect(errorRango('2026-03-05', '')).toMatch(/dos fechas/);
    expect(errorRango('', '2026-03-05')).toMatch(/dos fechas/);
    expect(errorRango('2026-06-20', '2026-03-05')).toMatch(/anterior/);
    expect(errorRango('2025-10-15', '2026-10-15')).toMatch(/12 meses/);
  });
});

describe('periodoEfectivo', () => {
  it('con un rango válido lo manda; con uno inválido queda el mes', () => {
    const base = { anio: 2026, mes: 8, parte: 1 as const };
    expect(periodoEfectivo({ ...base, desde: '2026-03-05', hasta: '2026-06-20' })).toEqual({
      ...base,
      desde: '2026-03-05',
      hasta: '2026-06-20',
    });
    expect(periodoEfectivo({ ...base, desde: '2026-03-05', hasta: '' })).toEqual(base);
  });
});

describe('quincenaDelPeriodo', () => {
  it('mes con quincena → esa quincena; mes completo → null', () => {
    expect(quincenaDelPeriodo({ anio: 2026, mes: 8, parte: 2 })).toEqual({ anio: 2026, mes: 8, parte: 2 });
    expect(quincenaDelPeriodo({ anio: 2026, mes: 8, parte: null })).toBeNull();
  });

  it('un rango es quincena solo si coincide exacto', () => {
    const base = { anio: 2026, mes: 8, parte: 1 as const };
    expect(quincenaDelPeriodo({ ...base, desde: '2026-02-16', hasta: '2026-02-28' })).toEqual({
      anio: 2026,
      mes: 2,
      parte: 2,
    });
    expect(quincenaDelPeriodo({ ...base, desde: '2026-02-01', hasta: '2026-02-15' })).toEqual({
      anio: 2026,
      mes: 2,
      parte: 1,
    });
    expect(quincenaDelPeriodo({ ...base, desde: '2026-02-16', hasta: '2026-02-27' })).toBeNull();
    expect(quincenaDelPeriodo({ ...base, desde: '2026-02-02', hasta: '2026-02-15' })).toBeNull();
  });
});
