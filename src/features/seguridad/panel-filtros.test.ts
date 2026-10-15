import { describe, it, expect } from 'vitest';
import { filtrosDeUrl, siguientePendiente, urlDeFiltros } from './panel-filtros';
import { rangoDeUrl, urlDeRango } from './ranking-url';

describe('filtros del panel en la URL', () => {
  it('sin nada en la URL, la bandeja de pendientes', () => {
    expect(filtrosDeUrl(new URLSearchParams())).toEqual({ estado: 'pendiente' });
    expect(urlDeFiltros({ estado: 'pendiente' })).toBe('');
  });

  it('ida y vuelta con todos los filtros', () => {
    const f = { estado: 'aprobado' as const, tipo: 'inspeccion' as const, desde: '2026-07-01', hasta: '2026-09-30' };
    const url = urlDeFiltros(f);
    expect(url).toBe('?estado=aprobado&tipo=inspeccion&desde=2026-07-01&hasta=2026-09-30');
    expect(filtrosDeUrl(new URLSearchParams(url))).toEqual(f);
  });

  it('"Todos" se guarda explícito para no volver a Pendientes al recargar', () => {
    expect(urlDeFiltros({})).toBe('?estado=todos');
    expect(filtrosDeUrl(new URLSearchParams('estado=todos'))).toEqual({});
  });
});

describe('siguientePendiente', () => {
  const lista = [
    { id: 1, estado: 'pendiente' as const },
    { id: 2, estado: 'aprobado' as const },
    { id: 3, estado: 'pendiente' as const },
    { id: 4, estado: 'pendiente' as const },
  ];

  it('el próximo pendiente más abajo', () => {
    expect(siguientePendiente(lista, 1)).toBe(3);
    expect(siguientePendiente(lista, 3)).toBe(4);
  });

  it('si no hay más abajo, vuelve al primero de arriba; si no queda ninguno, null', () => {
    expect(siguientePendiente(lista, 4)).toBe(1);
    expect(siguientePendiente([{ id: 9, estado: 'pendiente' }], 9)).toBeNull();
  });
});

describe('rango del ranking en la URL', () => {
  it('por defecto el año; los atajos y el rango libre van y vuelven', () => {
    expect(rangoDeUrl(new URLSearchParams())).toEqual({ modo: 'anio', desde: '', hasta: '' });
    expect(urlDeRango({ modo: 'anio', desde: '', hasta: '' })).toBe('');
    expect(rangoDeUrl(new URLSearchParams(urlDeRango({ modo: 'mes', desde: '', hasta: '' })))).toMatchObject({ modo: 'mes' });
    const libre = { modo: 'libre' as const, desde: '2026-02-01', hasta: '2026-03-31' };
    expect(rangoDeUrl(new URLSearchParams(urlDeRango(libre)))).toEqual(libre);
  });

  it('un rango desconocido en la URL cae al año', () => {
    expect(rangoDeUrl(new URLSearchParams('rango=cualquiera'))).toMatchObject({ modo: 'anio' });
  });
});
