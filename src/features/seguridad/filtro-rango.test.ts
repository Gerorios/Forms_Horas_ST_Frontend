import { describe, it, expect } from 'vitest';
import { rangoDe, textoRango } from './filtro-rango';

const HOY = '2026-10-08';

describe('rangoDe', () => {
  it('los atajos van desde el inicio del lapso hasta hoy', () => {
    expect(rangoDe({ modo: 'anio', desde: '', hasta: '' }, HOY)).toEqual({ desde: '2026-01-01', hasta: HOY });
    expect(rangoDe({ modo: 'semestre', desde: '', hasta: '' }, HOY)).toEqual({ desde: '2026-07-01', hasta: HOY });
    expect(rangoDe({ modo: 'trimestre', desde: '', hasta: '' }, HOY)).toEqual({ desde: '2026-10-01', hasta: HOY });
    expect(rangoDe({ modo: 'mes', desde: '', hasta: '' }, HOY)).toEqual({ desde: '2026-10-01', hasta: HOY });
  });
  it('el primer semestre y trimestre', () => {
    expect(rangoDe({ modo: 'semestre', desde: '', hasta: '' }, '2026-03-15')).toEqual({ desde: '2026-01-01', hasta: '2026-03-15' });
    expect(rangoDe({ modo: 'trimestre', desde: '', hasta: '' }, '2026-05-20')).toEqual({ desde: '2026-04-01', hasta: '2026-05-20' });
  });
  it('el rango libre usa lo elegido y omite lo vacío', () => {
    expect(rangoDe({ modo: 'libre', desde: '2026-02-01', hasta: '' }, HOY)).toEqual({ desde: '2026-02-01' });
  });
});

describe('textoRango', () => {
  it('formatea las fechas', () => {
    expect(textoRango({ desde: '2026-01-01', hasta: '2026-10-08' })).toBe('01/01/2026 al 08/10/2026');
  });
});
