'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Perfil } from '@/types/domain';
import { login as apiLogin, fetchPerfil } from '@/lib/api/auth';
import { getToken, setToken, clearToken } from '@/lib/api/token';

interface SessionValue {
  perfil: Perfil | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const SessionContext = createContext<SessionValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  // Se inicializa determinista (igual en server y cliente) para evitar
  // hydration mismatch: leer localStorage acá daría distinto en SSR.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Al montar: si hay token, intentar recuperar el perfil. El setState se
    // hace en callbacks async (no en el cuerpo síncrono del effect) para no
    // disparar cascading renders. loading arranca determinista en true.
    let cancelado = false;
    async function cargar() {
      if (!getToken()) return;
      try {
        const p = await fetchPerfil();
        if (!cancelado) setPerfil(p);
      } catch {
        clearToken();
      }
    }
    cargar().finally(() => {
      if (!cancelado) setLoading(false);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { access_token } = await apiLogin(email, password);
    setToken(access_token);
    const p = await fetchPerfil();
    setPerfil(p);
  }

  function signOut() {
    clearToken();
    setPerfil(null);
  }

  return (
    <SessionContext.Provider value={{ perfil, loading, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
}
