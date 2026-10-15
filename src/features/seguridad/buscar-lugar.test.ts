import { describe, it, expect, vi } from 'vitest';
import { buscarLugar } from './buscar-lugar';

describe('buscarLugar', () => {
  it('busca en Argentina y devuelve nombre y coordenadas', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify([{ display_name: 'Av. Belgrano 1200, Salta', lat: '-24.79', lon: '-65.41' }])),
    );
    expect(await buscarLugar('  Belgrano 1200 ', fetcher as never)).toEqual([
      { nombre: 'Av. Belgrano 1200, Salta', latitud: -24.79, longitud: -65.41 },
    ]);
    const url = new URL((fetcher.mock.calls[0] as unknown as [string])[0]);
    expect(url.searchParams.get('q')).toBe('Belgrano 1200');
    expect(url.searchParams.get('countrycodes')).toBe('ar');
  });

  it('sin texto no pide nada; un error del servicio se informa', async () => {
    const fetcher = vi.fn(async () => new Response('', { status: 503 }));
    expect(await buscarLugar('   ', fetcher as never)).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
    await expect(buscarLugar('Salta', fetcher as never)).rejects.toThrow('503');
  });
});
