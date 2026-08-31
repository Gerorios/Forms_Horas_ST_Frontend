import { describe, it, expect } from 'vitest';
import { navForRole } from './nav';
import { canAccess } from '@/lib/auth/guards';
import type { Rol, Perfil } from '@/types/domain';

function perfil(
  rol: Rol,
  tiposNovedadHabilitados: { tipoNovedad: { id: number; nombre: string } }[] = [],
  puedeCargarKmPorTantos = false,
  cert: Perfil['cert'] = null,
) {
  return { rol: { nombre: rol }, tiposNovedadHabilitados, puedeCargarKmPorTantos, cert };
}

describe('navForRole', () => {
  it('Operario solo consulta (Mis registros), NO carga (sin Reporte diario)', () => {
    const hrefs = navForRole(perfil('Operario')).map((i) => i.href);
    expect(hrefs).toContain('/mis-registros');
    expect(hrefs).not.toContain('/reporte');
    expect(hrefs).not.toContain('/admin');
  });

  it('JefeCuadrilla carga y consulta (Reporte diario + Mis registros)', () => {
    const hrefs = navForRole(perfil('JefeCuadrilla')).map((i) => i.href);
    expect(hrefs).toContain('/reporte');
    expect(hrefs).toContain('/mis-registros');
    expect(hrefs).not.toContain('/aprobaciones');
  });

  it('JefeCuadrilla sin tipos de novedad habilitados NO ve Novedades', () => {
    const hrefs = navForRole(perfil('JefeCuadrilla')).map((i) => i.href);
    expect(hrefs).not.toContain('/novedades');
  });

  it('JefeCuadrilla con al menos un tipo habilitado SÍ ve Novedades', () => {
    const hrefs = navForRole(perfil('JefeCuadrilla', [{ tipoNovedad: { id: 1, nombre: 'Viáticos' } }])).map(
      (i) => i.href,
    );
    expect(hrefs).toContain('/novedades');
  });

  it('Supervisor ve Novedades siempre, sin depender de tipos habilitados', () => {
    const hrefs = navForRole(perfil('Supervisor')).map((i) => i.href);
    expect(hrefs).toContain('/novedades');
  });

  it('JefeContrato ve Aprobaciones y Control general', () => {
    const hrefs = navForRole(perfil('JefeContrato')).map((i) => i.href);
    expect(hrefs).toContain('/aprobaciones');
    expect(hrefs).toContain('/control-general');
  });

  it('Admin ve Control general (además de Aprobaciones lo ve solo JefeContrato)', () => {
    const hrefs = navForRole(perfil('Admin')).map((i) => i.href);
    expect(hrefs).toContain('/control-general');
    expect(hrefs).not.toContain('/aprobaciones');
  });

  it('HyS ve Ausencias y Novedades', () => {
    const hrefs = navForRole(perfil('HyS')).map((i) => i.href);
    expect(hrefs).toEqual(['/novedades', '/ausencias']);
  });

  it('JefeContrato, Liquidador y Admin ven Novedades (lectura, no solo carga)', () => {
    expect(navForRole(perfil('JefeContrato')).map((i) => i.href)).toContain('/novedades');
    expect(navForRole(perfil('Liquidador')).map((i) => i.href)).toContain('/novedades');
    expect(navForRole(perfil('Admin')).map((i) => i.href)).toContain('/novedades');
  });

  it('Operario NO ve Novedades', () => {
    expect(navForRole(perfil('Operario')).map((i) => i.href)).not.toContain('/novedades');
  });

  it('Admin ve el panel Admin', () => {
    const hrefs = navForRole(perfil('Admin')).map((i) => i.href);
    expect(hrefs).toContain('/admin');
  });

  it('JefeCuadrilla NO ve Combustible (gating temporal Admin)', () => {
    expect(navForRole(perfil('JefeCuadrilla')).map((i) => i.href)).not.toContain('/combustible');
  });

  it('JefeContrato NO ve Combustible (gating temporal Admin)', () => {
    expect(navForRole(perfil('JefeContrato')).map((i) => i.href)).not.toContain('/combustible');
  });

  it('Operario NO ve Combustible', () => {
    expect(navForRole(perfil('Operario')).map((i) => i.href)).not.toContain('/combustible');
  });

  it('Admin ve Combustible', () => {
    expect(navForRole(perfil('Admin')).map((i) => i.href)).toContain('/combustible');
  });

  it('JefeContrato sin el flag NO ve Km por tantos', () => {
    expect(navForRole(perfil('JefeContrato')).map((i) => i.href)).not.toContain('/km-por-tantos');
  });

  it('JefeContrato con el flag habilitado SÍ ve Km por tantos', () => {
    expect(navForRole(perfil('JefeContrato', [], true)).map((i) => i.href)).toContain('/km-por-tantos');
  });

  it('Admin ve Km por tantos siempre', () => {
    expect(navForRole(perfil('Admin')).map((i) => i.href)).toContain('/km-por-tantos');
  });

  it('Admin ve Ausencias (además de HyS, por las acciones de Reabrir/Exportar)', () => {
    expect(navForRole(perfil('Admin')).map((i) => i.href)).toContain('/ausencias');
  });

  it('Admin sin claim cert NO ve Certificaciones', () => {
    expect(navForRole(perfil('Admin')).map((i) => i.href)).not.toContain('/certificaciones');
  });

  it('Un rol sin acceso a nada de Horas (Operario) SÍ ve Certificaciones si tiene el claim cert', () => {
    const conCert = perfil('Operario', [], false, { nivel: 'lectura', ks: [], inc: false });
    expect(navForRole(conCert).map((i) => i.href)).toContain('/certificaciones');
  });

  it('Admin con claim cert ve Certificaciones', () => {
    const conCert = perfil('Admin', [], false, { nivel: 'admin', ks: [], inc: true });
    expect(navForRole(conCert).map((i) => i.href)).toContain('/certificaciones');
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
  it('Operario no puede entrar a /novedades', () => {
    expect(canAccess('Operario', '/novedades')).toBe(false);
  });
  it('HyS, JefeContrato, Supervisor, Liquidador, Admin y JefeCuadrilla pueden entrar a /novedades', () => {
    for (const rol of ['HyS', 'JefeContrato', 'Supervisor', 'Liquidador', 'Admin', 'JefeCuadrilla'] as const) {
      expect(canAccess(rol, '/novedades')).toBe(true);
    }
  });
  it('HyS y Admin pueden entrar a /ausencias', () => {
    expect(canAccess('HyS', '/ausencias')).toBe(true);
    expect(canAccess('Admin', '/ausencias')).toBe(true);
  });
  it('Supervisor no puede entrar a /ausencias', () => {
    expect(canAccess('Supervisor', '/ausencias')).toBe(false);
  });
});
