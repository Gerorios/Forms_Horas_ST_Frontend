import { describe, it, expect } from 'vitest';
import { rangoQuincena, rangoQuincenaISO, quincenaDeFecha, enQuincena, quincenaAnterior } from './quincena';

describe('rangoQuincenaISO', () => {
  it('devuelve strings YYYY-MM-DD del rango, sin corrimiento por zona horaria', () => {
    expect(rangoQuincenaISO({ anio: 2026, mes: 8, parte: 1 })).toEqual({
      desde: '2026-08-01',
      hasta: '2026-08-15',
    });
    expect(rangoQuincenaISO({ anio: 2026, mes: 2, parte: 2 })).toEqual({
      desde: '2026-02-16',
      hasta: '2026-02-28',
    });
  });
});

describe('rangoQuincena', () => {
  it('1ª quincena de julio 2026 = 1 al 15', () => {
    const { desde, hasta } = rangoQuincena({ anio: 2026, mes: 7, parte: 1 });
    expect(desde.getDate()).toBe(1);
    expect(hasta.getDate()).toBe(15);
    expect(desde.getMonth()).toBe(6); // julio = índice 6
  });

  it('2ª quincena de febrero 2026 termina el 28', () => {
    const { desde, hasta } = rangoQuincena({ anio: 2026, mes: 2, parte: 2 });
    expect(desde.getDate()).toBe(16);
    expect(hasta.getDate()).toBe(28);
  });

  it('2ª quincena de febrero 2024 (bisiesto) termina el 29', () => {
    const { hasta } = rangoQuincena({ anio: 2024, mes: 2, parte: 2 });
    expect(hasta.getDate()).toBe(29);
  });
});

describe('quincenaDeFecha', () => {
  it('el día 15 cae en la 1ª quincena', () => {
    expect(quincenaDeFecha(new Date(2026, 6, 15)).parte).toBe(1);
  });
  it('el día 16 cae en la 2ª quincena', () => {
    expect(quincenaDeFecha(new Date(2026, 6, 16)).parte).toBe(2);
  });
});

describe('enQuincena', () => {
  const q = { anio: 2026, mes: 7, parte: 1 as const };
  it('una fecha del 10/07/2026 está en la 1ª quincena de julio', () => {
    expect(enQuincena('2026-07-10', q)).toBe(true);
  });
  it('una fecha del 20/07/2026 NO está en la 1ª quincena', () => {
    expect(enQuincena('2026-07-20', q)).toBe(false);
  });
  it('el borde 15 está en la 1ª y el 16 NO (aunque venga en ISO UTC)', () => {
    expect(enQuincena('2026-07-15T00:00:00.000Z', q)).toBe(true);
    expect(enQuincena('2026-07-16T00:00:00.000Z', q)).toBe(false);
  });
});

describe('quincenaAnterior', () => {
  it('de la 2ª quincena, la anterior es la 1ª del mismo mes', () => {
    expect(quincenaAnterior({ anio: 2026, mes: 7, parte: 2 })).toEqual({ anio: 2026, mes: 7, parte: 1 });
  });
  it('de la 1ª quincena, la anterior es la 2ª del mes previo', () => {
    expect(quincenaAnterior({ anio: 2026, mes: 7, parte: 1 })).toEqual({ anio: 2026, mes: 6, parte: 2 });
  });
  it('de enero, la anterior es diciembre del año previo', () => {
    expect(quincenaAnterior({ anio: 2026, mes: 1, parte: 1 })).toEqual({ anio: 2025, mes: 12, parte: 2 });
  });
});
