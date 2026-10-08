import { describe, it, expect } from 'vitest';
import { efectoEnPuntos } from './efecto-puntos';

const autor = { cuil: '20111', nombre: 'PEREZ JUAN' };
const base = { tipo: 'aviso_riesgo' as const, estado: 'pendiente' as const, puntaje: null, autor, involucrados: [] };
const insp = {
  ...base,
  tipo: 'inspeccion' as const,
  involucrados: [
    { cuil: '20444', nombre: 'GOMEZ LUIS' },
    { cuil: '20555', nombre: '' },
  ],
};

describe('efectoEnPuntos', () => {
  it('aprobar por primera vez un reporte común no pide confirmar', () => {
    expect(efectoEnPuntos(base, { tipo: 'aprobar', puntaje: 7 })).toBeNull();
    expect(efectoEnPuntos(base, { tipo: 'desaprobar' })).toBeNull();
  });

  it('restar en una inspección nombra a cada observado (CUIL si no hay nombre)', () => {
    const e = efectoEnPuntos(insp, { tipo: 'aprobar', puntaje: 5 });
    expect(e).toMatchObject({ titulo: 'Restar 5 puntos a cada persona observada', verbo: 'Restar 5', variante: 'danger-solid' });
    expect(e?.afectados).toEqual(['GOMEZ LUIS', '20555']);
  });

  it('aprobar una inspección sin restar no pide confirmar', () => {
    expect(efectoEnPuntos(insp, { tipo: 'aprobar', puntaje: 0 })).toBeNull();
  });

  it('recalificar cambia los puntos de quien ya los tenía', () => {
    expect(efectoEnPuntos({ ...base, estado: 'aprobado', puntaje: 8 }, { tipo: 'aprobar', puntaje: 5 })?.titulo).toBe('Cambiar de +8 a +5');
    expect(efectoEnPuntos({ ...insp, estado: 'aprobado', puntaje: 6 }, { tipo: 'aprobar', puntaje: 2 })?.titulo).toBe('Cambiar la quita de −6 a −2');
    expect(efectoEnPuntos({ ...base, estado: 'aprobado', puntaje: 8 }, { tipo: 'aprobar', puntaje: 8 })).toBeNull();
  });

  it('desaprobar o reabrir un aprobado dice qué se quita o se devuelve', () => {
    expect(efectoEnPuntos({ ...base, estado: 'aprobado', puntaje: 7 }, { tipo: 'desaprobar' })).toMatchObject({
      titulo: 'Se quitan los +7 puntos',
      afectados: ['PEREZ JUAN'],
    });
    expect(efectoEnPuntos({ ...insp, estado: 'aprobado', puntaje: 5 }, { tipo: 'reabrir' })).toMatchObject({
      titulo: 'Se devuelven los −5 puntos',
      verbo: 'Reabrir',
    });
  });

  it('reabrir un desaprobado confirma sin afectados: no tenía puntos', () => {
    expect(efectoEnPuntos({ ...base, estado: 'desaprobado' }, { tipo: 'reabrir' })).toMatchObject({ titulo: 'Vuelve a pendiente', afectados: [] });
  });
});
