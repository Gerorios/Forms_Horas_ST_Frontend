'use client';

import { useEffect, useState } from 'react';

type Estado = 'capturando' | 'ok' | 'denegado' | 'no-soportado';

function soportado(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
}

export function useGeolocation() {
  const [estado, setEstado] = useState<Estado>(() =>
    soportado() ? 'capturando' : 'no-soportado',
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!soportado()) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setEstado('ok');
      },
      () => setEstado('denegado'),
    );
  }, []);

  return { estado, coords };
}
