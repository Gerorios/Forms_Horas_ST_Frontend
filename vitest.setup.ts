import '@testing-library/jest-dom/vitest';

// jsdom no implementa ResizeObserver; lo necesitan los componentes que
// posicionan un popover/dropdown (ej. Popover de base-ui usado por MovilesSelect).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// Tampoco implementa scrollIntoView, que cmdk usa para llevar el ítem
// resaltado a la vista dentro de la lista del Command.
Element.prototype.scrollIntoView ??= () => {};
