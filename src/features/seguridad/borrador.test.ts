import { describe, it, expect } from 'vitest';
import { VENCE_DIAS, VERSION_BORRADOR, normalizarBorrador } from './borrador';

const AHORA = new Date('2026-10-08T15:00:00Z');

const valido = {
  version: VERSION_BORRADOR,
  guardadoEn: '2026-10-08T14:00:00Z',
  campos: { tipo: 'aviso_riesgo', descripcion: 'Zanja sin vallar' },
  fotos: [],
  reporteId: null,
};

describe('normalizarBorrador', () => {
  it('un borrador de esta versión y reciente se restaura, con los campos faltantes en vacío', () => {
    const b = normalizarBorrador(valido, AHORA);
    expect(b?.campos.tipo).toBe('aviso_riesgo');
    expect(b?.campos.descripcion).toBe('Zanja sin vallar');
    // Campos que el borrador no traía: vacíos, nunca undefined.
    expect(b?.campos.involucrados).toEqual([]);
    expect(b?.campos.controlRiesgo).toBe('');
    expect(b?.campos.punto).toBeNull();
  });

  it('uno guardado por otra versión de la app se descarta', () => {
    expect(normalizarBorrador({ ...valido, version: VERSION_BORRADOR + 1 }, AHORA)).toBeNull();
    // Los guardados antes de que existiera la versión tampoco se cargan.
    const sinVersion: Partial<typeof valido> = { ...valido };
    delete sinVersion.version;
    expect(normalizarBorrador(sinVersion, AHORA)).toBeNull();
  });

  it(`vence a los ${VENCE_DIAS} días`, () => {
    expect(normalizarBorrador({ ...valido, guardadoEn: '2026-10-02T15:00:00Z' }, AHORA)).not.toBeNull();
    expect(normalizarBorrador({ ...valido, guardadoEn: '2026-09-30T15:00:00Z' }, AHORA)).toBeNull();
  });

  it('basura o datos rotos no rompen nada', () => {
    expect(normalizarBorrador(null, AHORA)).toBeNull();
    expect(normalizarBorrador('texto', AHORA)).toBeNull();
    expect(normalizarBorrador({ ...valido, guardadoEn: 'no es fecha' }, AHORA)).toBeNull();
    const b = normalizarBorrador({ ...valido, fotos: [{ grupo: 'riesgo' }], campos: { involucrados: 'x' } }, AHORA);
    expect(b?.fotos).toEqual([]);
    expect(b?.campos.involucrados).toEqual([]);
  });
});
