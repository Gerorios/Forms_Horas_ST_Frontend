import { describe, it, expect, vi } from 'vitest';
import { MARCA, NOMBRE_APP } from '@/lib/marca';

// next/font/google solo existe dentro del compilador de Next; en vitest cada
// fuente se reemplaza por un objeto con la clase de la variable CSS.
vi.mock('next/font/google', () => {
  const fuente = () => ({ variable: 'font-var', className: 'font-class' });
  return { Space_Grotesk: fuente, IBM_Plex_Sans: fuente, IBM_Plex_Mono: fuente };
});

describe('RootLayout — metadata (2026-09-23)', () => {
  it('la pestaña del navegador lleva el nombre de la app y la descripción la marca', async () => {
    const { metadata } = await import('./layout');
    expect(metadata.title).toBe(NOMBRE_APP);
    expect(NOMBRE_APP).toBe('Central SER&TEC');
    expect(metadata.description).toContain(`Sistema interno de ${MARCA}:`);
  });
});
