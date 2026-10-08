import { describe, it, expect } from 'vitest';
import { faltantes, hoyLocal, signo, type FormularioReporte } from './tipos';

const completo: FormularioReporte = {
  tipo: 'aviso_riesgo',
  naturalezaId: 5,
  motivoParalizacionId: null,
  controlRiesgo: 'Vallé la zanja',
  involucrados: [],
  descripcion: 'Zanja abierta',
  fechaReporte: '2026-10-06',
  provinciaId: 1,
  contratoId: 2,
  tareaId: 3,
};

describe('faltantes', () => {
  it('un aviso completo está listo', () => {
    expect(faltantes(completo)).toEqual([]);
  });
  it('sin tipo, lo primero es elegirlo', () => {
    expect(faltantes({ ...completo, tipo: null })).toEqual(['Elegí qué querés reportar']);
  });
  it('la inspección exige personas observadas', () => {
    expect(faltantes({ ...completo, tipo: 'inspeccion' })).toEqual(['Una inspección necesita al menos una persona observada']);
  });
  it('la propuesta no pide naturaleza ni control', () => {
    expect(faltantes({ ...completo, tipo: 'propuesta_mejora', naturalezaId: null, controlRiesgo: '' })).toEqual([]);
  });
  it('la paralización pide el motivo y el punto GPS (salvo en la corrección de HyS)', () => {
    expect(faltantes({ ...completo, tipo: 'paralizacion', tienePunto: false })).toEqual([
      'Falta el motivo de la paralización',
      'Falta tomar la ubicación: hay que saber de qué obra se trata',
    ]);
    expect(faltantes({ ...completo, tipo: 'paralizacion', motivoParalizacionId: 2, naturalezaId: null })).toEqual([]);
  });
});

describe('formato', () => {
  it('hoyLocal arma YYYY-MM-DD en hora local', () => {
    expect(hoyLocal(new Date(2026, 9, 7, 23, 30))).toBe('2026-10-07');
  });
  it('signo usa el menos tipográfico', () => {
    expect([signo(8), signo(-6), signo(0)]).toEqual(['+8', '−6', '0']);
  });
});
