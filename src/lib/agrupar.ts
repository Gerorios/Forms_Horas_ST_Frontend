import type { RegistroPorAprobar } from '@/types/domain';

export type GrupoAprobacion = {
  operarioCuil: string;
  operarioNombre: string;
  fecha: string;
  filas: RegistroPorAprobar[];
};

export function agruparPorOperarioFecha(filas: RegistroPorAprobar[]): GrupoAprobacion[] {
  const mapa = new Map<string, GrupoAprobacion>();
  for (const f of filas) {
    const fecha = f.fecha.slice(0, 10);
    const clave = `${f.operario.cuil}|${fecha}`;
    let grupo = mapa.get(clave);
    if (!grupo) {
      grupo = {
        operarioCuil: f.operario.cuil,
        operarioNombre: f.operario.apellido_nombre,
        fecha,
        filas: [],
      };
      mapa.set(clave, grupo);
    }
    grupo.filas.push(f);
  }
  return [...mapa.values()];
}
