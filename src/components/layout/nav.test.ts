import { describe, it, expect } from 'vitest';
import { navForRole } from './nav';
import { canAccess } from '@/lib/auth/guards';
import type { Rol } from '@/types/domain';

function perfil(rol: Rol, tiposNovedadHabilitados: { tipoNovedad: { id: number; nombre: string } }[] = []) {
  return { rol: { nombre: rol }, tiposNovedadHabilitados };
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

  it('JefeContrato ve Aprobaciones', () => {
    const hrefs = navForRole(perfil('JefeContrato')).map((i) => i.href);
    expect(hrefs).toContain('/aprobaciones');
  });

  it('HyS solo ve Ausencias', () => {
    const hrefs = navForRole(perfil('HyS')).map((i) => i.href);
    expect(hrefs).toEqual(['/ausencias']);
  });

  it('Admin ve el panel Admin', () => {
    const hrefs = navForRole(perfil('Admin')).map((i) => i.href);
    expect(hrefs).toContain('/admin');
  });

  it('JefeCuadrilla ve Combustible', () => {
    expect(navForRole(perfil('JefeCuadrilla')).map((i) => i.href)).toContain('/combustible');
  });

  it('JefeContrato ve Combustible', () => {
    expect(navForRole(perfil('JefeContrato')).map((i) => i.href)).toContain('/combustible');
  });

  it('Operario NO ve Combustible', () => {
    expect(navForRole(perfil('Operario')).map((i) => i.href)).not.toContain('/combustible');
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
