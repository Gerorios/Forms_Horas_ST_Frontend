import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getToken, setToken, clearToken } from './token';

// Almacenamiento bloqueado (modo privado estricto, datos de sitio bloqueados,
// cuota llena): los métodos de Storage tiran SecurityError/QuotaExceededError.
function bloquear(metodo: 'getItem' | 'setItem' | 'removeItem') {
  vi.spyOn(Storage.prototype, metodo).mockImplementation(() => {
    throw new DOMException('bloqueado', 'SecurityError');
  });
}

describe('token con localStorage bloqueado', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearToken();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    clearToken();
  });

  it('setToken no tira y el token queda disponible en memoria', () => {
    bloquear('setItem');
    bloquear('getItem');
    expect(() => setToken('tok-mem')).not.toThrow();
    expect(getToken()).toBe('tok-mem');
  });

  it('getToken no tira y devuelve null si nunca hubo token', () => {
    bloquear('getItem');
    expect(() => getToken()).not.toThrow();
    expect(getToken()).toBeNull();
  });

  it('clearToken no tira y borra también el token en memoria', () => {
    bloquear('setItem');
    bloquear('getItem');
    bloquear('removeItem');
    setToken('tok-mem');
    expect(() => clearToken()).not.toThrow();
    expect(getToken()).toBeNull();
  });

  it('con cuota llena, un login nuevo no deja vivo el token anterior tras recargar', async () => {
    window.localStorage.setItem('sth_token', 'tok-A');
    bloquear('setItem');
    setToken('tok-B');
    expect(getToken()).toBe('tok-B');
    // Recarga: el módulo arranca de cero y el respaldo en memoria se pierde.
    vi.resetModules();
    const recargado = await import('./token');
    expect(recargado.getToken()).not.toBe('tok-A');
  });
});
