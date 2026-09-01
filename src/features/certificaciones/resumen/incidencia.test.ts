import { describe, it, expect } from 'vitest';
import { calcularIncidencia, semaforo } from './incidencia';

describe('calcularIncidencia', () => {
  it('cruza por codigo K y calcula pct', () => {
    const r = calcularIncidencia({ K6: 40_000_000 }, { K6: 12_000_000 });
    expect(r[0]).toMatchObject({ codigo: 'K6', pct: 30 });
  });
  it('K certificado sin MO imputada muestra pct 0 y mo 0', () => {
    expect(calcularIncidencia({ K9: 10 }, {})[0]).toMatchObject({ mo: 0, pct: 0 });
  });
  it('K con MO pero sin certificado no divide por cero', () => {
    expect(calcularIncidencia({}, { K9: 5 })[0].pct).toBeNull();
  });
});

describe('semaforo', () => {
  it('usa el umbral configurado (30)', () => {
    expect(semaforo(29)).toBe('ok');
    expect(semaforo(31)).toBe('alerta');
    expect(semaforo(50)).toBe('excedido'); // umbral * 1.5
  });
});
