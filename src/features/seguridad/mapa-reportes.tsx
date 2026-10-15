'use client';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import L from './leaflet-global';
import 'leaflet.markercluster';
import 'leaflet.heat';
import { useEffect, useState } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import type { PuntoMapa } from '@/lib/api/seguridad';
import { BotonCapaBase, CapasBase, ZOOM_MAXIMO, type Base } from './capas-base';
import { CENTRO_PAIS } from './centro-provincia';
import { COLOR_TIPO, fichaHtml } from './ficha-mapa';

/**
 * Mapa de reportes de HyS (ADR-027, revisión 2026-10-15). Dos vistas:
 * - "pines": uno por reporte, del color de su tipo; los cercanos se agrupan
 *   en un círculo con la cantidad, que se abre al acercarse.
 * - "calor": densidad, para el estudio de fin de período, cuando hay muchos
 *   datos (con pocos, cada reporte suelto parece una zona caliente).
 * Solo corre en el navegador: se carga con `next/dynamic` y `ssr: false`.
 */

export type VistaMapa = 'pines' | 'calor';

const pinDe = (color: string) =>
  L.divIcon({
    className: '',
    html: `<svg width="26" height="34" viewBox="0 0 24 32" aria-hidden="true" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">
      <path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.5 12 32 12 32s12-11.5 12-20.3C24 5.2 18.6 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.8"/>
      <circle cx="12" cy="11.5" r="4" fill="#fff"/>
    </svg>`,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -30],
  });

/** Círculo de un grupo: grafito con borde blanco, se lee sobre el satélite. */
const grupoDe = (cluster: L.MarkerCluster) => {
  const n = cluster.getChildCount();
  const lado = n < 10 ? 34 : n < 100 ? 40 : 46;
  return L.divIcon({
    className: '',
    html: `<div style="width:${lado}px;height:${lado}px;border-radius:50%;background:var(--color-graphite);color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font:600 13px/1 system-ui,sans-serif">${n}</div>`,
    iconSize: [lado, lado],
  });
};

/** Leaflet calcula su tamaño una sola vez: si el contenedor crece (pantalla
 * completa, girar el celular) quedan zonas grises. Se le avisa en cada cambio. */
function AjusteTamano() {
  const map = useMap();
  useEffect(() => {
    const obs = new ResizeObserver(() => map.invalidateSize());
    obs.observe(map.getContainer());
    return () => obs.disconnect();
  }, [map]);
  return null;
}

/** Encuadra todos los puntos (o el país, si no hay). */
function Encuadre({ puntos }: { puntos: PuntoMapa[] }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length === 0) {
      map.setView([CENTRO_PAIS.latitud, CENTRO_PAIS.longitud], CENTRO_PAIS.zoom);
      return;
    }
    const limites = L.latLngBounds(puntos.map((p) => [p.punto.latitud, p.punto.longitud] as [number, number]));
    map.fitBounds(limites, { padding: [40, 40], maxZoom: 15 });
  }, [map, puntos]);
  return null;
}

function Pines({ puntos }: { puntos: PuntoMapa[] }) {
  const map = useMap();
  useEffect(() => {
    const grupo = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45, iconCreateFunction: grupoDe });
    for (const p of puntos) {
      L.marker([p.punto.latitud, p.punto.longitud], { icon: pinDe(COLOR_TIPO[p.tipo]), title: `Reporte ${p.id}` })
        .bindPopup(fichaHtml(p), { maxWidth: 280 })
        .addTo(grupo);
    }
    map.addLayer(grupo);
    return () => {
      map.removeLayer(grupo);
    };
  }, [map, puntos]);
  return null;
}

function Calor({ puntos }: { puntos: PuntoMapa[] }) {
  const map = useMap();
  useEffect(() => {
    const capa = L.heatLayer(
      puntos.map((p) => [p.punto.latitud, p.punto.longitud, 1] as [number, number, number]),
      { radius: 28, blur: 22, maxZoom: 14, minOpacity: 0.35 },
    );
    map.addLayer(capa);
    return () => {
      map.removeLayer(capa);
    };
  }, [map, puntos]);
  return null;
}

export default function MapaReportes({ puntos, vista }: { puntos: PuntoMapa[]; vista: VistaMapa }) {
  const [base, setBase] = useState<Base>('satelite');
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[CENTRO_PAIS.latitud, CENTRO_PAIS.longitud]}
        zoom={CENTRO_PAIS.zoom}
        maxZoom={ZOOM_MAXIMO}
        className="h-full w-full"
      >
        <CapasBase base={base} />
        <AjusteTamano />
        <Encuadre puntos={puntos} />
        {vista === 'pines' ? <Pines puntos={puntos} /> : <Calor puntos={puntos} />}
      </MapContainer>
      <BotonCapaBase base={base} onChange={setBase} />
    </div>
  );
}
