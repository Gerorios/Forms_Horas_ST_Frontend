import { describe, it, expect } from 'vitest';
import { NAV_ITEMS } from './nav';
import { NAV_ICONS, NavIcon } from './nav-icons';

describe('NAV_ICONS', () => {
  it('todo ítem de navegación tiene ícono', () => {
    for (const item of NAV_ITEMS) {
      expect(NAV_ICONS[item.href], `falta ícono para ${item.href}`).toBeTruthy();
    }
  });

  it('NavIcon devuelve null para href desconocido', () => {
    expect(NavIcon({ href: '/no-existe' })).toBeNull();
  });
});
