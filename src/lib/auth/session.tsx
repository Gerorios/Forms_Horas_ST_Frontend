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
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    // Al montar: si hay token, intentar recuperar el perfil.
    if (!getToken()) return;
    fetchPerfil()
      .then(setPerfil)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
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
