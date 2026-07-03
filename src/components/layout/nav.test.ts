import { describe, it, expect } from 'vitest';
import { navForRole } from './nav';
import { canAccess } from '@/lib/auth/guards';

describe('navForRole', () => {
  it('Operario solo consulta (Mis registros), NO carga (sin Reporte diario)', () => {
    const hrefs = navForRole('Operario').map((i) => i.href);
    expect(hrefs).toContain('/mis-registros');
    expect(hrefs).not.toContain('/reporte');
    expect(hrefs).not.toContain('/admin');
  });

  it('JefeCuadrilla carga y consulta (Reporte diario + Mis registros)', () => {
    const hrefs = navForRole('JefeCuadrilla').map((i) => i.href);
    expect(hrefs).toContain('/reporte');
    expect(hrefs).toContain('/mis-registros');
    expect(hrefs).not.toContain('/aprobaciones');
  });

  it('JefeContrato ve Aprobaciones', () => {
    const hrefs = navForRole('JefeContrato').map((i) => i.href);
    expect(hrefs).toContain('/aprobaciones');
  });

  it('HyS solo ve Ausencias', () => {
    const hrefs = navForRole('HyS').map((i) => i.href);
    expect(hrefs).toEqual(['/ausencias']);
  });

  it('Admin ve el panel Admin', () => {
    const hrefs = navForRole('Admin').map((i) => i.href);
    expect(hrefs).toContain('/admin');
  });
});

describe('canAccess', () => {
  it('Operario no puede entrar a /admin', () => {
    expect(canAccess('Operario', '/admin')).toBe(false);
  });
  it('Operario no puede entrar a /reporte (no carga)', () => {
    expect(canAccess('Operario', '/reporte')).toBe(false);
  });
  it('JefeCuadrilla sí puede entrar a /reporte', () => {
    expect(canAccess('JefeCuadrilla', '/reporte')).toBe(true);
  });
  it('Admin puede entrar a /admin', () => {
    expect(canAccess('Admin', '/admin')).toBe(true);
  });
  it('rutas fuera del catálogo son accesibles (ej. home)', () => {
    expect(canAccess('Operario', '/')).toBe(true);
  });
});
