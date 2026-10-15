'use client';

import { useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/button';
import { buscarLugar, type LugarEncontrado } from './buscar-lugar';
import type { Centro } from './centro-provincia';
import type { Coordenadas } from './mapa-punto';
import { FOCO_VISIBLE } from './tipos';

// Leaflet usa `window`: solo en el navegador, y se baja recién al abrir el
// mapa (no pesa en el formulario).
const MapaPunto = dynamic(() => import('./mapa-punto'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-slate">Cargando el mapa…</div>,
});

/** Zoom al ir a un lugar buscado: se ve la calle. */
const ZOOM_LUGAR = 16;

/**
 * Marcar en el mapa dónde pasó lo reportado (ADR-027, revisión 2026-10-15):
 * para quien carga el reporte más tarde, o bajo techo sin señal de GPS. Se
 * toca el mapa o se arrastra el pin; se puede buscar una dirección o
 * localidad.
 */
export function MarcarEnMapaDialog({
  titulo = 'Marcá dónde pasó',
  inicial,
  centro,
  onConfirmar,
  onCancelar,
}: {
  titulo?: string;
  inicial: Coordenadas | null;
  /** Dónde arranca la vista si no hay punto (la capital de la provincia). */
  centro: Centro;
  onConfirmar: (c: Coordenadas) => void;
  onCancelar: () => void;
}) {
  const [punto, setPunto] = useState<Coordenadas | null>(inicial);
  const [vista, setVista] = useState<Centro>(inicial ? { ...inicial, zoom: ZOOM_LUGAR } : centro);
  const [texto, setTexto] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<LugarEncontrado[] | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  async function buscar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim() || buscando) return;
    setBuscando(true);
    setErrorBusqueda(null);
    try {
      const r = await buscarLugar(texto);
      setResultados(r);
      if (r.length === 1) irA(r[0]);
    } catch {
      setResultados(null);
      setErrorBusqueda('No se pudo buscar ahora. Mové el mapa y tocá el lugar.');
    } finally {
      setBuscando(false);
    }
  }

  function irA(l: LugarEncontrado) {
    const c = { latitud: l.latitud, longitud: l.longitud };
    setVista({ ...c, zoom: ZOOM_LUGAR });
    setPunto(c);
    setResultados(null);
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCancelar()}>
      <DialogContent className="bg-surface sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-ink">{titulo}</DialogTitle>
          <DialogDescription className="text-sm text-slate">
            Tocá el mapa en el lugar exacto o arrastrá el pin. Si no lo encontrás, buscá la calle, la ruta o la localidad.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={buscar} className="flex gap-2" role="search">
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej.: Av. Belgrano 1200, Salta"
            aria-label="Buscar un lugar"
            className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-brand-deep focus:ring-2 focus:ring-brand/40 sm:text-sm"
          />
          <Button type="submit" variant="secondary" disabled={buscando || !texto.trim()} className="min-h-11">
            {buscando ? 'Buscando…' : 'Buscar'}
          </Button>
        </form>
        {errorBusqueda && (
          <p role="alert" className="text-xs text-danger">
            {errorBusqueda}
          </p>
        )}
        {resultados && resultados.length === 0 && <p className="text-xs text-slate">No encontramos ese lugar. Probá con menos palabras.</p>}
        {resultados && resultados.length > 1 && (
          <ul className="max-h-40 divide-y divide-line overflow-y-auto rounded-md border border-line text-sm">
            {resultados.map((l) => (
              <li key={`${l.latitud},${l.longitud}`}>
                <button type="button" onClick={() => irA(l)} className={`min-h-11 w-full px-3 py-2 text-left text-ink hover:bg-sand ${FOCO_VISIBLE}`}>
                  {l.nombre}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="h-[50dvh] min-h-64 overflow-hidden rounded-lg border border-line">
          <MapaPunto centro={vista} valor={punto} onChange={setPunto} />
        </div>
        <p className="text-xs text-slate" aria-live="polite">
          {punto ? `Punto: ${punto.latitud.toFixed(5)}, ${punto.longitud.toFixed(5)}` : 'Todavía no marcaste el punto.'}
        </p>

        <DialogFooter className="bg-sand">
          <Button variant="ghost" onClick={onCancelar} className="min-h-11">
            Cancelar
          </Button>
          <Button variant="primary" disabled={!punto} onClick={() => punto && onConfirmar(punto)} className="min-h-11 font-semibold">
            Usar este punto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
