import { describe, it, expect } from 'vitest';
import { redondearHoras } from './horas';

describe('redondearHoras', () => {
  it('corta la cola binaria de una suma en coma flotante', () => {
    // 0.1 + 0.2 + 0.3 === 0.6000000000000001 en JS: es lo que se veía en las
    // tarjetas de totales.
    expect(redondearHoras(0.1 + 0.2 + 0.3)).toBe(0.6);
  });

  it('redondea hacia arriba en el medio decimal', () => {
    expect(redondearHoras(8.25)).toBe(8.3);
  });

  it('redondea hacia abajo por debajo del medio decimal', () => {
    expect(redondearHoras(8.24)).toBe(8.2);
  });

  it('deja los enteros como enteros (8 se sigue viendo "8", no "8,0")', () => {
    expect(redondearHoras(8)).toBe(8);
  });

  it('deja intacto lo que ya tiene un decimal', () => {
    expect(redondearHoras(12.5)).toBe(12.5);
  });

  it('el cero queda en cero', () => {
    expect(redondearHoras(0)).toBe(0);
  });
});
