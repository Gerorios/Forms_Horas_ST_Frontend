'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/button';
import { MIN_LETRAS_SUGERENCIA, buscarLugar, sugerirLugares, type LugarEncontrado } from './buscar-lugar';
import { CENTRO_PAIS, type Centro } from './centro-provincia';
import type { Coordenadas } from './mapa-punto';

// Leaflet usa `window`: solo en el navegador, y se baja recién al abrir el
// mapa (no pesa en el formulario).
const MapaPunto = dynamic(() => import('./mapa-punto'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-slate">Cargando el mapa…</div>,
});

/** Zoom al ir a un lugar buscado: se ve la calle. */
const ZOOM_LUGAR = 16;

/** Espera desde la última tecla antes de pedir sugerencias. */
const ESPERA_SUGERENCIAS_MS = 500;

/**
 * Marcar en el mapa dónde pasó lo reportado (ADR-027, revisión 2026-10-15):
 * para quien carga el reporte más tarde, o bajo techo sin señal de GPS. Se
 * toca el mapa o se arrastra el pin. El buscador sugiere mientras se escribe
 * (Photon); si no responde, "Buscar" usa Nominatim; si tampoco, se marca a
 * mano.
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
  const [opciones, setOpciones] = useState<LugarEncontrado[]>([]);
  const [abierta, setAbierta] = useState(false);
  const [activa, setActiva] = useState(-1);
  const [cargando, setCargando] = useState(false);
  /** Photon no respondió: queda "Buscar" (Nominatim). */
  const [sinSugerencias, setSinSugerencias] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  /** El texto lo puso una elección, no la persona: no se vuelve a sugerir. */
  const elegido = useRef(false);
  const idLista = useId();

  // Sesgo a la provincia del reporte (no al país entero).
  const cerca = centro === CENTRO_PAIS ? undefined : { latitud: centro.latitud, longitud: centro.longitud };

  useEffect(() => {
    if (elegido.current) {
      elegido.current = false;
      return;
    }
    // Con pocas letras la lista ya la vació `escribir`.
    if (texto.trim().length < MIN_LETRAS_SUGERENCIA) return;
    const control = new AbortController();
    const t = setTimeout(async () => {
      setCargando(true);
      try {
        const r = await sugerirLugares(texto, { cerca, signal: control.signal });
        setOpciones(r);
        setActiva(-1);
        setAbierta(true);
        setSinSugerencias(false);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setSinSugerencias(true);
      } finally {
        if (!control.signal.aborted) setCargando(false);
      }
    }, ESPERA_SUGERENCIAS_MS);
    return () => {
      clearTimeout(t);
      control.abort();
    };
    // `cerca` deriva de `centro`, que no cambia con el diálogo abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  function escribir(valor: string) {
    setTexto(valor);
    if (valor.trim().length < MIN_LETRAS_SUGERENCIA) {
      setOpciones([]);
      setAbierta(false);
    }
  }

  function irA(l: LugarEncontrado) {
    const c = { latitud: l.latitud, longitud: l.longitud };
    setVista({ ...c, zoom: ZOOM_LUGAR });
    setPunto(c);
    elegido.current = true;
    setTexto(l.nombre);
    setAbierta(false);
    setOpciones([]);
  }

  /** Enter o "Buscar": la sugerencia marcada, o la primera; si no hay
   * sugerencias (Photon caído), busca en Nominatim. */
  async function buscar(e: FormEvent) {
    e.preventDefault();
    if (abierta && opciones.length) return irA(opciones[Math.max(activa, 0)]);
    if (!texto.trim() || cargando) return;
    setCargando(true);
    setErrorBusqueda(null);
    try {
      const r = await buscarLugar(texto);
      if (r.length === 1) return irA(r[0]);
      setOpciones(r);
      setActiva(-1);
      setAbierta(true);
    } catch {
      setErrorBusqueda('No se pudo buscar ahora. Mové el mapa y tocá el lugar.');
    } finally {
      setCargando(false);
    }
  }

  function tecla(e: KeyboardEvent<HTMLInputElement>) {
    if (!abierta || opciones.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const paso = e.key === 'ArrowDown' ? 1 : -1;
      setActiva((a) => (a + paso + opciones.length) % opciones.length);
    } else if (e.key === 'Escape') {
      // Cierra la lista, no el diálogo.
      e.preventDefault();
      e.stopPropagation();
      setAbierta(false);
    }
  }

  const listaVisible = abierta && opciones.length > 0;

  return (
    <Dialog open onOpenChange={(abiertoDialogo) => !abiertoDialogo && onCancelar()}>
      <DialogContent className="bg-surface sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-ink">{titulo}</DialogTitle>
          <DialogDescription className="text-sm text-slate">
            Tocá el mapa en el lugar exacto o arrastrá el pin. Si no lo encontrás, escribí la calle, la ruta o la localidad.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={buscar} className="relative flex gap-2" role="search">
          <input
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={listaVisible}
            aria-controls={idLista}
            aria-activedescendant={listaVisible && activa >= 0 ? `${idLista}-${activa}` : undefined}
            value={texto}
            onChange={(e) => escribir(e.target.value)}
            onKeyDown={tecla}
            onBlur={() => setTimeout(() => setAbierta(false), 150)}
            onFocus={() => opciones.length && setAbierta(true)}
            placeholder="Ej.: Ruta 9 km 1580, o Av. Belgrano 1200, Salta"
            aria-label="Buscar un lugar"
            autoComplete="off"
            className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-brand-deep focus:ring-2 focus:ring-brand/40 sm:text-sm"
          />
          <Button type="submit" variant="secondary" disabled={cargando || !texto.trim()} className="min-h-11">
            {cargando ? 'Buscando…' : 'Buscar'}
          </Button>
          {listaVisible && (
            <ul
              id={idLista}
              role="listbox"
              aria-label="Lugares sugeridos"
              className="absolute inset-x-0 top-full z-[1100] mt-1 max-h-60 divide-y divide-line overflow-y-auto rounded-md border border-line bg-surface text-sm shadow-lg"
            >
              {opciones.map((l, i) => (
                <li
                  key={`${l.latitud},${l.longitud},${i}`}
                  id={`${idLista}-${i}`}
                  role="option"
                  aria-selected={i === activa}
                  // mousedown: antes del blur del campo, que cierra la lista.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    irA(l);
                  }}
                  className={`flex min-h-11 cursor-pointer items-center px-3 py-2 text-ink ${i === activa ? 'bg-sand-deep' : 'hover:bg-sand'}`}
                >
                  {l.nombre}
                </li>
              ))}
            </ul>
          )}
        </form>
        {sinSugerencias && !errorBusqueda && (
          <p className="text-xs text-slate">Las sugerencias no están disponibles ahora: escribí el lugar y apretá Buscar.</p>
        )}
        {errorBusqueda && (
          <p role="alert" className="text-xs text-danger">
            {errorBusqueda}
          </p>
        )}
        {abierta && !cargando && opciones.length === 0 && (
          <p className="text-xs text-slate">No encontramos ese lugar. Probá con menos palabras o marcalo en el mapa.</p>
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
