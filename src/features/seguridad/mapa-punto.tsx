'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { Centro } from './centro-provincia';

/**
 * Mapa de OpenStreetMap (Leaflet) para marcar el punto de un reporte: se
 * toca donde pasó o se arrastra el pin. Solo corre en el navegador: se carga
 * con `next/dynamic` y `ssr: false` desde `MarcarEnMapaDialog`.
 */

// El ícono por defecto de Leaflet busca PNGs por URL relativa y el bundler
// los rompe: el pin es un SVG propio, con la punta en la coordenada.
const PIN = L.divIcon({
  className: '',
  html: `<svg width="34" height="44" viewBox="0 0 24 32" aria-hidden="true">
    <path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.5 12 32 12 32s12-11.5 12-20.3C24 5.2 18.6 0 12 0z" fill="var(--color-danger)" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="11.5" r="4.5" fill="#fff"/>
  </svg>`,
  iconSize: [34, 44],
  iconAnchor: [17, 44],
});

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

/** Lleva la vista al centro nuevo (resultado de una búsqueda). */
function Vista({ centro }: { centro: Centro }) {
  const map = useMap();
  useEffect(() => {
    map.setView([centro.latitud, centro.longitud], centro.zoom);
  }, [map, centro]);
  return null;
}

function AlTocar({ onTocar }: { onTocar: (c: Coordenadas) => void }) {
  useMapEvents({ click: (e) => onTocar({ latitud: e.latlng.lat, longitud: e.latlng.lng }) });
  return null;
}

export default function MapaPunto({
  centro,
  valor,
  onChange,
}: {
  centro: Centro;
  valor: Coordenadas | null;
  onChange: (c: Coordenadas) => void;
}) {
  return (
    <MapContainer
      center={[centro.latitud, centro.longitud]}
      zoom={centro.zoom}
      className="h-full w-full rounded-lg"
      attributionControl
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <Vista centro={centro} />
      <AlTocar onTocar={onChange} />
      {valor && (
        <Marker
          position={[valor.latitud, valor.longitud]}
          icon={PIN}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              onChange({ latitud: p.lat, longitud: p.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
