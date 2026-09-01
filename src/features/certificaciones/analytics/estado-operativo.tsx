'use client';

import { useMemo } from 'react';
import type { EstadoCargaContrato } from '@/lib/api/certificaciones';
import { etiquetaPeriodo } from './colores';

/** Con más de este número de períodos la matriz deja de entrar cómodo en
 * pantalla (una columna por período) — se muestran los N más recientes. El
 * histórico completo sigue disponible filtrando el rango de fechas arriba. */
const MAX_PERIODOS = 12;

export interface MatrizOperativa {
  contratos: string[];
  periodos: string[];
  celdas: Map<string, EstadoCargaContrato>;
}

function clave(contrato: string, periodo: string): string {
  return `${contrato}__${periodo}`;
}

/** Arma la matriz contrato×período a partir del histórico plano de
 * `/analytics/estado-cargas`: contratos y períodos ordenados, con los
 * últimos {@link MAX_PERIODOS} períodos únicamente (más recientes primero
 * en la lista de columnas visibles la resuelve el componente). Pura y
 * testeable sin Recharts ni DOM. */
export function armarMatrizOperativa(filas: EstadoCargaContrato[]): MatrizOperativa {
  const contratos = [...new Set(filas.map((f) => f.contrato))].sort();
  const periodosTodos = [...new Set(filas.map((f) => f.periodo))].sort();
  const periodos = periodosTodos.slice(-MAX_PERIODOS);

  const celdas = new Map<string, EstadoCargaContrato>();
  for (const f of filas) celdas.set(clave(f.contrato, f.periodo), f);

  return { contratos, periodos, celdas };
}

function Celda({ dato }: { dato: EstadoCargaContrato | undefined }) {
  if (!dato) {
    return (
      <td className="px-2 py-1.5 text-center text-slate/50" title="Sin registro para este contrato y período">
        —
      </td>
    );
  }
  if (dato.cargado) {
    const detalle = [
      dato.usuario ? `Cargado por ${dato.usuario}` : null,
      dato.cargado_en ? `el ${dato.cargado_en}` : null,
      dato.filas_cargadas !== null ? `(${dato.filas_cargadas} filas)` : null,
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <td className="px-2 py-1.5 text-center" title={detalle || 'Cargado'}>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-approved/15 text-approved">
          ✓
        </span>
      </td>
    );
  }
  return (
    <td className="px-2 py-1.5 text-center" title="Sin carga">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-danger/15 text-danger">
        !
      </span>
    </td>
  );
}

/** Matriz contrato×período: filas = contratos, columnas = período (últimos
 * {@link MAX_PERIODOS}), celda = cargado (✓ verde) / falta (! rojo). Es la
 * vista de cumplimiento operativo — reemplaza al típico listado plano del
 * portal viejo por algo que se lee de un vistazo (dónde hay huecos). */
export function EstadoOperativo({ datos }: { datos: EstadoCargaContrato[] }) {
  const matriz = useMemo(() => armarMatrizOperativa(datos), [datos]);

  if (matriz.contratos.length === 0 || matriz.periodos.length === 0)
    return <p className="text-sm text-slate">Sin registros de carga para el período filtrado.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" aria-label="Matriz de carga por contrato y período">
        <thead>
          <tr className="border-b border-line text-left uppercase tracking-wide text-slate">
            <th className="sticky left-0 bg-surface px-2 py-1.5 font-medium">Contrato</th>
            {matriz.periodos.map((p) => (
              <th key={p} className="px-2 py-1.5 text-center font-medium">
                {etiquetaPeriodo(p)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matriz.contratos.map((contrato) => (
            <tr key={contrato} className="border-b border-line text-ink last:border-0">
              <td className="sticky left-0 bg-surface px-2 py-1.5 font-medium">{contrato}</td>
              {matriz.periodos.map((p) => (
                <Celda key={p} dato={matriz.celdas.get(clave(contrato, p))} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
