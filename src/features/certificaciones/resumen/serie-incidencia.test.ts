import { describe, it, expect } from 'vitest';
import { construirSerie } from './serie-incidencia';

const mo = [{ anio: 2026, mes: 7, contratos: [{ codigo: 'K6', montoMo: 30 }], sinAsignar: null },
            { anio: 2026, mes: 8, contratos: [{ codigo: 'K6', montoMo: 12 }, { codigo: 'K9', montoMo: 9 }], sinAsignar: null }];
const cert = [{ periodo: '2026-07', contrato: 'K6', monto: 100 },
              { periodo: '2026-08', contrato: 'K6', monto: 40 }, { periodo: '2026-08', contrato: 'K9', monto: 30 }];

describe('construirSerie', () => {
  it('calcula pct por K y global por mes', () => {
    const s = construirSerie(cert, mo);
    expect(s[0]).toMatchObject({ etiqueta: 'jul 26', global: 30, porK: { K6: 30 } });
    expect(s[1].porK).toEqual({ K6: 30, K9: 30 });
    expect(s[1].global).toBe(30); // (12+9)/(40+30)
  });

  it('K con MO pero sin certificado en el mes: pct null (no infinito)', () => {
    const s = construirSerie([], mo);
    expect(s[1].porK.K6).toBeNull();
    expect(s[1].global).toBeNull();
  });
});
