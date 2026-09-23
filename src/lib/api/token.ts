const TOKEN_KEY = 'sth_token';

// Respaldo para cuando localStorage no deja escribir (modo privado estricto,
// datos de sitio bloqueados, cuota llena): la sesión dura lo que la pestaña.
// Solo se usa si falló el guardado; con storage sano manda localStorage.
let respaldo: string | null = null;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  if (respaldo !== null) return respaldo;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    respaldo = null;
  } catch {
    respaldo = token;
    // Si quedó un token anterior persistido (cuota llena), al recargar
    // volvería esa sesión y no la nueva: se borra.
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Storage bloqueado del todo: no hay nada persistido.
    }
  }
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  respaldo = null;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Sin storage no hay nada persistido que borrar.
  }
}
