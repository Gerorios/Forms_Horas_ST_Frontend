import { describe, it, expect } from 'vitest';
import type { PuntoMapa } from '@/lib/api/seguridad';
import { fichaHtml } from './ficha-mapa';

const PUNTO: PuntoMapa = {
  id: 12,
  tipo: 'paralizacion',
  estado: 'aprobado',
  fechaReporte: '2026-10-05',
  puntaje: 8,
  provincia: 'Salta',
  contrato: 'K2',
  tarea: 'Conexión',
  naturaleza: null,
  motivoParalizacion: 'Viento / clima',
  punto: { latitud: -24.78, longitud: -65.41, errorMetros: null, origen: 'mapa' },
};

describe('fichaHtml', () => {
  it('muestra tipo, fecha, estado con puntaje, contrato, motivo, origen del punto y link al reporte', () => {
    const html = fichaHtml(PUNTO);
    expect(html).toContain('Paralización de trabajos');
    expect(html).toContain('05/10/2026 · Aprobado · 8 pts');
    expect(html).toContain('K2 › Conexión');
    expect(html).toContain('Viento / clima');
    expect(html).toContain('punto: marcado en el mapa');
    expect(html).toContain('href="/seguridad/12"');
  });

  it('escapa lo que viene de catálogos cargados por gente', () => {
    const html = fichaHtml({ ...PUNTO, tarea: '<img src=x onerror=alert(1)>', estado: 'pendiente', puntaje: null });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('Pendiente');
  });

  it('un punto de GPS o de foto muestra su precisión', () => {
    expect(fichaHtml({ ...PUNTO, punto: { ...PUNTO.punto, origen: 'foto', errorMetros: 8.6 } })).toContain('foto de cámara ±9 m');
  });
});
