import { describe, it, expect } from 'vitest';
import { mensajeDeError } from './liquidacion';

describe('mensajeDeError', () => {
  it('extrae un message string de la respuesta', () => {
    const e = { response: { data: { message: 'El período ya está cargado' } } };
    expect(mensajeDeError(e)).toBe('El período ya está cargado');
  });

  it('junta un array de message (class-validator) en un solo texto', () => {
    const e = { response: { data: { message: ['kmDesde debe ser mayor a 0', 'precioPorKm es requerido'] } } };
    expect(mensajeDeError(e)).toBe('kmDesde debe ser mayor a 0, precioPorKm es requerido');
  });

  it('cae al fallback genérico si no hay message aprovechable', () => {
    expect(mensajeDeError({})).toBe('Ocurrió un error inesperado');
    expect(mensajeDeError(new Error('network fail'))).toBe('Ocurrió un error inesperado');
  });

  it('usa el fallback específico que le pasa el caller', () => {
    expect(mensajeDeError({}, 'No se pudo guardar')).toBe('No se pudo guardar');
  });

  it('ignora un array vacío y cae al fallback', () => {
    const e = { response: { data: { message: [] } } };
    expect(mensajeDeError(e, 'No se pudo guardar')).toBe('No se pudo guardar');
  });
});
