import { describe, it, expect } from 'vitest';
import { normalizarPatente, coincideMovil } from './moviles';

const hilux = { identificador: 'AA615NF', descripcion: 'Camioneta Toyota Hilux' };
const moto = { identificador: 'A166LHV', descripcion: 'Moto Guardia' };
const sinDescripcion = { identificador: '301IEG', descripcion: null };

describe('normalizarPatente', () => {
  it('pasa a mayúsculas y descarta todo lo que no sea letra o número', () => {
    expect(normalizarPatente('aa 615 nf')).toBe('AA615NF');
    expect(normalizarPatente('aa-615-nf')).toBe('AA615NF');
    expect(normalizarPatente('AA615NF')).toBe('AA615NF');
  });

  it('un texto sin letras ni números queda vacío', () => {
    expect(normalizarPatente('- .')).toBe('');
  });
});

describe('coincideMovil', () => {
  it('encuentra la patente aunque se tipee con espacios o guiones', () => {
    expect(coincideMovil(hilux, 'aa 615')).toBe(true);
    expect(coincideMovil(hilux, 'aa-615')).toBe(true);
    expect(coincideMovil(hilux, 'AA615NF')).toBe(true);
  });

  it('una patente distinta no coincide', () => {
    expect(coincideMovil(hilux, 'a166')).toBe(false);
    expect(coincideMovil(hilux, 'zzz')).toBe(false);
  });

  it('también busca por descripción, sin distinguir mayúsculas ni tildes', () => {
    expect(coincideMovil(hilux, 'hilux')).toBe(true);
    expect(coincideMovil(moto, 'moto')).toBe(true);
    expect(coincideMovil(moto, 'GUARDIA')).toBe(true);
  });

  it('la descripción nula no rompe: solo se puede encontrar por patente', () => {
    expect(coincideMovil(sinDescripcion, '301')).toBe(true);
    expect(coincideMovil(sinDescripcion, 'moto')).toBe(false);
  });

  it('la búsqueda vacía o de puros espacios deja pasar todo', () => {
    expect(coincideMovil(hilux, '')).toBe(true);
    expect(coincideMovil(hilux, '   ')).toBe(true);
    expect(coincideMovil(sinDescripcion, '')).toBe(true);
  });

  it('una búsqueda que al normalizar queda vacía no matchea patentes, pero sí evalúa la descripción', () => {
    // Tipear solo "-" no puede devolver la flota entera por patente; si el
    // símbolo aparece en la descripción, esa vía sigue valiendo.
    expect(coincideMovil(sinDescripcion, '-')).toBe(false);
    expect(coincideMovil({ identificador: 'AA615NF', descripcion: 'Pick-up' }, '-')).toBe(true);
  });
});
