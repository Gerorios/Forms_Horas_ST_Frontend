import { describe, it, expect } from 'vitest';
import { CENTRO_PAIS, centroDeProvincia } from './centro-provincia';

describe('centroDeProvincia', () => {
  it('arranca en la capital de la provincia, sin importar tildes ni mayúsculas', () => {
    expect(centroDeProvincia('Tucumán')).toMatchObject({ latitud: -26.8083, longitud: -65.2176 });
    expect(centroDeProvincia('SALTA')).toMatchObject({ latitud: -24.7821 });
  });

  it('"Buenos Aires" es La Plata, no CABA; y el nombre más largo gana', () => {
    expect(centroDeProvincia('Buenos Aires').latitud).toBe(-34.9214);
    expect(centroDeProvincia('Ciudad Autónoma de Buenos Aires').latitud).toBe(-34.6037);
    expect(centroDeProvincia('Santiago del Estero').latitud).toBe(-27.7951);
  });

  it('sin provincia o desconocida, el país entero', () => {
    expect(centroDeProvincia(null)).toBe(CENTRO_PAIS);
    expect(centroDeProvincia('Atlántida')).toBe(CENTRO_PAIS);
  });
});
