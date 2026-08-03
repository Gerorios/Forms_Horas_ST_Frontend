import type { RegistroPorAprobar } from '@/types/domain';

export type GrupoContrato = {
  contrato: { id: number; codigo: string; nombre: string };
  accionable: boolean;
  filas: RegistroPorAprobar[];
  subtotalHoras: number;
  tareas: string[];
  /** Texto de la línea (una sola, compartida por todos los operarios de esa
   * carga en ese contrato — no se concatena ni se suma). Ver ADR-005. */
  observacion: string | null;
};

export type GrupoLote = {
  loteId: string;
  fecha: string;
  filas: RegistroPorAprobar[];
  accionables: RegistroPorAprobar[];
  operarios: { cuil: string; apellido_nombre: string }[];
  vehiculos: { id: number; identificador: string }[];
  totalHoras: number;
  contratos: GrupoContrato[];
  /** Quién envió este lote — un solo cargador por loteId (ver ADR-004). */
  cargadoPor: { cuil: string; nombre: string };
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
        operarios: [],
        vehiculos: [],
        totalHoras: 0,
        contratos: [],
        cargadoPor: f.cargadoPor,
      };
      mapa.set(f.loteId, grupo);
    }

    grupo.filas.push(f);
    if (f.accionable) grupo.accionables.push(f);

    if (!grupo.operarios.some((o) => o.cuil === f.operario.cuil)) {
      grupo.operarios.push(f.operario);
    }
    for (const { movil } of f.moviles) {
      if (!grupo.vehiculos.some((v) => v.id === movil.id)) grupo.vehiculos.push(movil);
    }

    let porContrato = grupo.contratos.find((c) => c.contrato.id === f.contrato.id);
    if (!porContrato) {
      // Las horas de una línea de carga se aplican una vez por contrato, iguales
      // para todos los operarios del envío (se repiten por fila para poder
      // liquidarle a cada uno individualmente) — no se suman por operario, si no
      // el total dejaría de ser "horas trabajadas por la cuadrilla" y pasaría a
      // ser horas × cantidad de gente. Una fila desaprobada no cuenta como hora
      // real (fue rechazada), así que no aporta al subtotal.
      porContrato = {
        contrato: f.contrato,
        accionable: f.accionable,
        filas: [],
        subtotalHoras: f.estado === 'desaprobado' ? 0 : Number(f.horas),
        tareas: [],
        observacion: f.observacion,
      };
      grupo.contratos.push(porContrato);
    } else {
      if (porContrato.subtotalHoras === 0 && f.estado !== 'desaprobado') {
        // La primera fila del grupo era un rechazo; esta es válida y sí cuenta.
        porContrato.subtotalHoras = Number(f.horas);
      }
      if (!porContrato.observacion && f.observacion) porContrato.observacion = f.observacion;
    }
    porContrato.filas.push(f);
    for (const { tarea } of f.tareas) {
      if (!porContrato.tareas.includes(tarea.nombre)) porContrato.tareas.push(tarea.nombre);
    }
  }
  for (const grupo of mapa.values()) {
    grupo.totalHoras = grupo.contratos.reduce((s, c) => s + c.subtotalHoras, 0);
  }
  return [...mapa.values()];
}
