import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/combustible/comprimir-imagen', () => ({
  comprimirImagen: vi.fn(async () => new Blob(['chica'], { type: 'image/jpeg' })),
}));

import { capturar, esFotoRecien, FRESCURA_MS } from './captura-foto';

const AHORA = Date.parse('2026-10-07T12:00:00Z');

function archivo(lastModified: number) {
  return new File(['x'], 'foto.jpg', { type: 'image/jpeg', lastModified });
}

describe('esFotoRecien', () => {
  it('una foto de hace un minuto es de recién', () => {
    expect(esFotoRecien({ lastModified: AHORA - 60_000 }, AHORA)).toBe(true);
  });
  it('una foto de ayer no lo es (la eligieron de la galería)', () => {
    expect(esFotoRecien({ lastModified: AHORA - 24 * 3600_000 }, AHORA)).toBe(false);
  });
  it('el borde es la frescura exacta', () => {
    expect(esFotoRecien({ lastModified: AHORA - FRESCURA_MS }, AHORA)).toBe(true);
    expect(esFotoRecien({ lastModified: AHORA - FRESCURA_MS - 1 }, AHORA)).toBe(false);
  });
});

describe('capturar', () => {
  const getCurrentPosition = vi.fn();

  beforeEach(() => {
    getCurrentPosition.mockReset();
    getCurrentPosition.mockImplementation((ok: PositionCallback) =>
      ok({ coords: { latitude: -24.7859123, longitude: -65.4116456, accuracy: 8.4 } } as GeolocationPosition),
    );
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  });

  it('foto de cámara recién sacada: guarda la ubicación de ese momento', async () => {
    const foto = await capturar(archivo(Date.now()), 'riesgo', true);
    expect(foto).toMatchObject({
      grupo: 'riesgo',
      origen: 'camara',
      ubicacion: { latitud: -24.785912, longitud: -65.411646, errorMetros: 8.4 },
    });
  });

  it('galería: sin ubicación y sin pedir permiso', async () => {
    const foto = await capturar(archivo(Date.now()), 'control', false);
    expect(foto).toMatchObject({ origen: 'galeria', ubicacion: null });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('"Sacar foto" con una foto vieja se toma como de galería', async () => {
    const foto = await capturar(archivo(Date.now() - 2 * 3600_000), 'riesgo', true);
    expect(foto).toMatchObject({ origen: 'galeria', ubicacion: null });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('sin permiso de ubicación la foto se guarda igual, sin punto', async () => {
    getCurrentPosition.mockImplementation((_ok: PositionCallback, err: PositionErrorCallback) =>
      err({ code: 1 } as GeolocationPositionError),
    );
    const foto = await capturar(archivo(Date.now()), 'riesgo', true);
    expect(foto).toMatchObject({ origen: 'camara', ubicacion: null });
  });
});
