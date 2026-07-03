import { describe, it, expect } from 'vitest';
import { navForRole } from './nav';
import { canAccess } from '@/lib/auth/guards';

describe('navForRole', () => {
  it('Operario ve Reporte diario y Mis registros, no Admin', () => {
    const hrefs = navForRole('Operario').map((i) => i.href);
    expect(hrefs).toContain('/reporte');
    expect(hrefs).toContain('/mis-registros');
    expect(hrefs).not.toContain('/admin');
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
  it('Admin puede entrar a /admin', () => {
    expect(canAccess('Admin', '/admin')).toBe(true);
  });
  it('rutas fuera del catálogo son accesibles (ej. home)', () => {
    expect(canAccess('Operario', '/')).toBe(true);
  });
});
