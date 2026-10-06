import { describe, it, expect } from 'vitest';
import { estiloBaja } from './baja-fila';

describe('estiloBaja (ADR-026)', () => {
  it('sin baja: sin estilo', () => {
    expect(estiloBaja({ estadoBaja: null, fechaBaja: null, activo: true })).toBeNull();
  });

  it('baja previa y todavía activo en sueldos: rojo, no se liquida', () => {
    const e = estiloBaja({ estadoBaja: 'previa', fechaBaja: '2026-09-28', activo: true })!;
    expect(e.claseFila).toContain('bg-danger');
    expect(e.chip.texto).toBe('Baja 28/09');
    expect(e.claseAcento).toContain('border-l-danger');
    expect(e.detalle).toContain('BAJAS A REGULARIZAR');
  });

  it('baja previa y ya inactivo: gris', () => {
    const e = estiloBaja({ estadoBaja: 'previa', fechaBaja: '2026-09-28', activo: false })!;
    expect(e.claseFila).toContain('bg-slate');
    expect(e.chip.texto).toBe('Baja 28/09');
    expect(e.detalle).toContain('no se envía en el Excel');
  });

  it('baja dentro de la quincena: amarillo, liquidación final', () => {
    const e = estiloBaja({ estadoBaja: 'en_quincena', fechaBaja: '2026-10-05', activo: true })!;
    expect(e.claseFila).toContain('bg-yellow');
    expect(e.chip.texto).toBe('Baja 05/10');
    expect(e.detalle).toContain('liquidación final');
  });

  it('baja sin confirmar: solo la leyenda, la fila no se pinta', () => {
    const e = estiloBaja({ estadoBaja: 'sin_confirmar', fechaBaja: '2026-10-05', activo: true })!;
    expect(e.claseFila).toBe('');
    expect(e.chip.texto).toBe('Baja s/conf.');
    expect(e.detalle).toContain('05/10/2026');
  });
});
