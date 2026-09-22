// Fotos de fondo (ADR-025); en null se ve el marcador grafito + luz dorada.
// Viven en `public/fotos/`, ≤ 400 KB cada una (`fotos.test.ts` lo exige):
// inicio 1920×700 (franja panorámica), login 1440×1920 (vertical, a pantalla completa).
export const FOTOS: { inicio: string | null; login: string | null } = {
  inicio: '/fotos/inicio.jpg',
  login: '/fotos/login.jpg',
};
