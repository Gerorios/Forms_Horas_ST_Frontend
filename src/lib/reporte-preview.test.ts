import { describe, it, expect } from 'vitest';
import { contarFilas } from './reporte-preview';

describe('contarFilas', () => {
  it('4 operarios x 2 lineas = 8', () => expect(contarFilas(4, 2)).toBe(8));
  it('0 operarios = 0', () => expect(contarFilas(0, 3)).toBe(0));
  it('0 lineas = 0', () => expect(contarFilas(3, 0)).toBe(0));
});
