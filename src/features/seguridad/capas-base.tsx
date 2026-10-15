'use client';

import { TileLayer } from 'react-leaflet';
import { FOCO_VISIBLE } from './tipos';

/**
 * Mapa base de los mapas de Seguridad (ADR-027, revisión 2026-10-15). Abre en
 * SATÉLITE: en una ruta o en el campo el lugar se reconoce por la vegetación,
 * los caminos y las construcciones. "Calles" (OpenStreetMap) sirve más en la
 * ciudad. Solo para módulos que ya cargan Leaflet en el navegador.
 */

export type Base = 'satelite' | 'calles';

// Imágenes satelitales de Esri: gratis, sin clave, con atribución. Encima,
// rutas y nombres de lugares transparentes para no perderse en el campo.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const ATRIBUCION_ESRI = 'Imágenes &copy; Esri, Maxar, Earthstar Geographics';
/** Hasta dónde hay foto en casi todo el país; más cerca se amplía la última. */
const ZOOM_NATIVO_SATELITE = 18;
export const ZOOM_MAXIMO = 19;

export function CapasBase({ base }: { base: Base }) {
  return base === 'satelite' ? (
    <>
      <TileLayer
        key="satelite"
        url={`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`}
        attribution={ATRIBUCION_ESRI}
        maxNativeZoom={ZOOM_NATIVO_SATELITE}
        maxZoom={ZOOM_MAXIMO}
      />
      <TileLayer
        key="rutas"
        url={`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`}
        maxNativeZoom={ZOOM_NATIVO_SATELITE}
        maxZoom={ZOOM_MAXIMO}
      />
      <TileLayer
        key="lugares"
        url={`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`}
        maxNativeZoom={ZOOM_NATIVO_SATELITE}
        maxZoom={ZOOM_MAXIMO}
      />
    </>
  ) : (
    <TileLayer
      key="calles"
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      maxZoom={ZOOM_MAXIMO}
    />
  );
}

/** Botón que alterna satélite / calles. Va FUERA del MapContainer (posición
 * absoluta sobre el mapa): así tocarlo no cuenta como un toque en el mapa. */
export function BotonCapaBase({ base, onChange }: { base: Base; onChange: (b: Base) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(base === 'satelite' ? 'calles' : 'satelite')}
      aria-label={base === 'satelite' ? 'Cambiar a vista de calles' : 'Cambiar a vista satelital'}
      className={`absolute right-2 top-2 z-[1000] inline-flex min-h-11 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-sm font-semibold text-ink shadow-md hover:bg-sand ${FOCO_VISIBLE}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m12 2 10 5-10 5L2 7l10-5z" />
        <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
      </svg>
      {base === 'satelite' ? 'Calles' : 'Satélite'}
    </button>
  );
}
