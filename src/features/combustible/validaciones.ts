export function advertenciaKm(kmIngresado: number, ultimoKm: number | null): string | null {
  if (ultimoKm === null || kmIngresado >= ultimoKm) return null;
  const fmt = (n: number) => n.toLocaleString('es-AR');
  return `El último km registrado para este móvil fue ${fmt(ultimoKm)}. ¿Confirmás ${fmt(kmIngresado)}?`;
}
