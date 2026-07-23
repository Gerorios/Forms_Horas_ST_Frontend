import { describe, it, expect } from 'vitest';
import { infoCorreccion, type CorreccionInput } from './correccion';

function item(overrides: Partial<CorreccionInput> = {}): CorreccionInput {
  return {
    id: 1,
    loteId: 'lote-a',
    loteIdOrigen: null,
    contrato: { id: 1 },
    horas: 8,
    motivoDesaprobacion: null,
    ...overrides,
  };
}

describe('infoCorreccion', () => {
  it('sin relación, devuelve null', () => {
    const todas = [item({ id: 1, loteId: 'lote-a' }), item({ id: 2, loteId: 'lote-b' })];
    expect(infoCorreccion(todas[0], todas)).toBeNull();
  });

  it('la fila con loteIdOrigen detecta que corrige a la original, con la fila original completa', () => {
    const original = item({
      id: 1,
      loteId: 'lote-viejo',
      contrato: { id: 1 },
      horas: 12,
      motivoDesaprobacion: 'según recorrido son 8hs',
    });
    const corregida = item({ id: 2, loteId: 'lote-nuevo', loteIdOrigen: 'lote-viejo', contrato: { id: 1 }, horas: 8 });
    const todas = [original, corregida];
    expect(infoCorreccion(corregida, todas)).toEqual({ tipo: 'corrige', original });
  });

  it('la fila original detecta que fue reemplazada, con la fila nueva completa', () => {
    const original = item({ id: 1, loteId: 'lote-viejo', contrato: { id: 1 }, horas: 12 });
    const corregida = item({ id: 2, loteId: 'lote-nuevo', loteIdOrigen: 'lote-viejo', contrato: { id: 1 }, horas: 8 });
    const todas = [original, corregida];
    expect(infoCorreccion(original, todas)).toEqual({ tipo: 'reemplazada', nueva: corregida });
  });

  it('no cruza contratos distintos aunque compartan loteId/loteIdOrigen', () => {
    const original = item({ id: 1, loteId: 'lote-viejo', contrato: { id: 1 }, horas: 12 });
    const otroContrato = item({ id: 2, loteId: 'lote-nuevo', loteIdOrigen: 'lote-viejo', contrato: { id: 2 }, horas: 5 });
    const todas = [original, otroContrato];
    expect(infoCorreccion(otroContrato, todas)).toBeNull();
    expect(infoCorreccion(original, todas)).toBeNull();
  });
});
