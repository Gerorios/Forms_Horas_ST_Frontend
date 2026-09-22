import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FOTOS } from './fotos';

// Las fotos reales del ADR-025 están encendidas: cada ruta apunta a un archivo
// que existe en `public/` y pesa 400 KB o menos (móviles con datos).
describe('FOTOS', () => {
  it.each(Object.entries(FOTOS))('%s apunta a un archivo real de ≤ 400 KB', (_clave, ruta) => {
    expect(ruta).toBeTruthy();
    const archivo = join(process.cwd(), 'public', ruta as string);
    expect(existsSync(archivo)).toBe(true);
    expect(statSync(archivo).size).toBeLessThanOrEqual(400 * 1024);
  });
});
