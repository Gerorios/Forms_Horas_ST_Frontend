import type { RegistroPorAprobar } from '@/types/domain';

export type GrupoLote = {
  loteId: string;
  fecha: string;
  filas: RegistroPorAprobar[];
  accionables: RegistroPorAprobar[];
};

export function agruparPorLote(filas: RegistroPorAprobar[]): GrupoLote[] {
  const mapa = new Map<string, GrupoLote>();
  for (const f of filas) {
    let grupo = mapa.get(f.loteId);
    if (!grupo) {
      grupo = {
        loteId: f.loteId,
        fecha: f.fecha.slice(0, 10),
        filas: [],
        accionables: [],
      };
      mapa.set(f.loteId, grupo);
    }
    grupo.filas.push(f);
    if (f.accionable) grupo.accionables.push(f);
  }
  return [...mapa.values()];
}
