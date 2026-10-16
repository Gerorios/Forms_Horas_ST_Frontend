import { describe, it, expect, vi } from 'vitest';
import { buscarLugar, nombrePhoton, sugerirLugares } from './buscar-lugar';

const json = (datos: unknown, status = 200) => new Response(JSON.stringify(datos), { status });
const urlDe = (fetcher: ReturnType<typeof vi.fn>) => new URL((fetcher.mock.calls[0] as unknown as [string])[0]);

describe('sugerirLugares (Photon, mientras se escribe)', () => {
  it('sugiere en Argentina, primero cerca de la provincia, con nombre legible', async () => {
    const fetcher = vi.fn(async () =>
      json({
        features: [
          {
            geometry: { coordinates: [-65.41, -24.79] },
            properties: { street: 'Avenida Belgrano', housenumber: '1200', city: 'Salta', state: 'Salta' },
          },
        ],
      }),
    );
    const r = await sugerirLugares('Belgrano 1200', { cerca: { latitud: -24.78, longitud: -65.42 }, fetcher: fetcher as never });
    expect(r).toEqual([{ nombre: 'Avenida Belgrano 1200 · Salta', latitud: -24.79, longitud: -65.41 }]);
    const url = urlDe(fetcher);
    expect(url.host).toBe('photon.komoot.io');
    expect(url.searchParams.get('bbox')).toBe('-73.6,-55.1,-53.6,-21.7');
    expect(url.searchParams.get('lat')).toBe('-24.78');
  });

  it('con menos de 3 letras no pide nada; si Photon falla, lo informa', async () => {
    const fetcher = vi.fn(async () => json({}, 502));
    expect(await sugerirLugares('Sa', { fetcher: fetcher as never })).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
    await expect(sugerirLugares('Salta', { fetcher: fetcher as never })).rejects.toThrow('502');
  });

  it('el nombre no repite la zona: una localidad sola es solo su nombre y su provincia', () => {
    expect(nombrePhoton({ name: 'Cafayate', city: 'Cafayate', state: 'Salta' })).toBe('Cafayate · Salta');
    expect(nombrePhoton({ name: 'Ruta Nacional 9', state: 'Jujuy' })).toBe('Ruta Nacional 9 · Jujuy');
  });
});

describe('buscarLugar (Nominatim, respaldo al apretar Buscar)', () => {
  it('busca en Argentina y devuelve nombre y coordenadas', async () => {
    const fetcher = vi.fn(async () => json([{ display_name: 'Av. Belgrano 1200, Salta', lat: '-24.79', lon: '-65.41' }]));
    expect(await buscarLugar('  Belgrano 1200 ', fetcher as never)).toEqual([
      { nombre: 'Av. Belgrano 1200, Salta', latitud: -24.79, longitud: -65.41 },
    ]);
    expect(urlDe(fetcher).searchParams.get('q')).toBe('Belgrano 1200');
    expect(urlDe(fetcher).searchParams.get('countrycodes')).toBe('ar');
  });

  it('sin texto no pide nada; un error del servicio se informa', async () => {
    const fetcher = vi.fn(async () => new Response('', { status: 503 }));
    expect(await buscarLugar('   ', fetcher as never)).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
    await expect(buscarLugar('Salta', fetcher as never)).rejects.toThrow('503');
  });
});
