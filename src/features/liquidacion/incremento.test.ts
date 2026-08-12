import { describe, it, expect } from 'vitest';
import { aplicarIncremento } from './incremento';

describe('aplicarIncremento', () => {
  it('aumenta cada valor por el % indicado, redondeado a 2 decimales', () => {
    expect(aplicarIncremento({ 1: '1000', 2: '800' }, 5)).toEqual({ 1: '1050.00', 2: '840.00' });
  });

  it('acepta porcentajes con decimales y negativos', () => {
    expect(aplicarIncremento({ 1: '2000' }, 7.5)).toEqual({ 1: '2150.00' });
    expect(aplicarIncremento({ 1: '1000' }, -10)).toEqual({ 1: '900.00' });
  });

  it('los campos vacíos o no numéricos quedan como están (no hay de dónde partir)', () => {
    expect(aplicarIncremento({ 1: '', 2: 'abc', 3: '100' }, 5)).toEqual({ 1: '', 2: 'abc', 3: '105.00' });
  });

  it('redondeo comercial sobre centavos', () => {
    // 1234.56 × 1.05 = 1296.288 → 1296.29
    expect(aplicarIncremento({ 1: '1234.56' }, 5)).toEqual({ 1: '1296.29' });
  });
});
