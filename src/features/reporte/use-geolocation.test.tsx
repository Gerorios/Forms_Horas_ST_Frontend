import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGeolocation } from './use-geolocation';

describe('useGeolocation', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('captura coordenadas cuando el usuario acepta', async () => {
    const getCurrentPosition = vi.fn((ok) =>
      ok({ coords: { latitude: -31.4, longitude: -64.2 } }),
    );
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });

    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.estado).toBe('ok'));
    expect(result.current.coords).toEqual({ lat: -31.4, lng: -64.2 });
  });

  it('queda en denegado si el usuario rechaza', async () => {
    const getCurrentPosition = vi.fn((_ok, err) => err({ code: 1 }));
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });

    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.estado).toBe('denegado'));
    expect(result.current.coords).toBeNull();
  });
});
