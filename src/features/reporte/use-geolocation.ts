'use client';

import { useEffect, useState } from 'react';

type Estado = 'capturando' | 'ok' | 'denegado' | 'no-soportado';

export function useGeolocation() {
  const [estado, setEstado] = useState<Estado>('capturando');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setEstado('no-soportado');
      return;
    }
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
