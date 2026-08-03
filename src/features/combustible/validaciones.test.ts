import { describe, it, expect } from 'vitest';
import { advertenciaKm } from './validaciones';

describe('advertenciaKm', () => {
  it('null si no hay km previo', () => expect(advertenciaKm(100, null)).toBeNull());
  it('null si el km avanza', () => expect(advertenciaKm(120001, 120000)).toBeNull());
  it('advierte si el km retrocede', () =>
    expect(advertenciaKm(119000, 120000)).toBe('El último km registrado para este móvil fue 120.000. ¿Confirmás 119.000?'));
});
