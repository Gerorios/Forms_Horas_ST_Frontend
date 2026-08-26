'use client';

import { useEffect, useState } from 'react';

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M16 11.5A6.5 6.5 0 0 1 8.5 4a6.5 6.5 0 1 0 7.5 7.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="10" r="3.5" />
      <path
        d="M10 3v1.5M10 15.5V17M17 10h-1.5M4.5 10H3M14.8 5.2l-1.1 1.1M6.3 13.7l-1.1 1.1M14.8 14.8l-1.1-1.1M6.3 6.3 5.2 5.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Prende/apaga la clase `dark` en <html> y persiste en localStorage. El
 * estado inicial (antes de montar) ya lo resuelve el script inline de
 * layout.tsx (evita el flash del tema incorrecto) — acá solo se sincroniza
 * para no pisarlo. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    // No usar un initializer perezoso de useState acá: en SSR `document` no
    // existe, y si se lee en el primer render del cliente (durante hidratación)
    // el resultado puede diferir de lo que el server mandó, mismatch. Mismo
    // patrón que `plegado` en app-shell.tsx (localStorage post-mount).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOscuro(document.documentElement.classList.contains('dark'));
  }, []);

  function alternar() {
    const next = !oscuro;
    setOscuro(next);
    document.documentElement.classList.toggle('dark', next);
    window.localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={alternar}
        aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={oscuro ? 'Modo claro' : 'Modo oscuro'}
        className="rounded-md p-1.5 text-slate transition-colors hover:bg-accent/60 hover:text-ink"
      >
        {oscuro ? <SunIcon /> : <MoonIcon />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={oscuro}
      className="mt-2 flex w-full items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-slate transition-colors hover:border-brand/40 hover:bg-accent/60 hover:text-ink"
    >
      {oscuro ? <SunIcon /> : <MoonIcon />}
      {oscuro ? 'Modo claro' : 'Modo oscuro'}
    </button>
  );
}
