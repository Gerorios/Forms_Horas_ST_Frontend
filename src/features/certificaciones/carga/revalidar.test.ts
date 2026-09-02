import { describe, it, expect } from 'vitest';
import { revalidarFila, hojaCoincideConKs, validarArchivoCarga } from './revalidar';

const FILA_OK = {
  item_codigo: 'ITEM-01',
  contrato: 'K6',
  provincia: 'Salta',
  cantidades: '3',
  total_mes: '1000',
};
const PROVINCIAS = ['Salta', 'Jujuy', 'Tucumán'];

describe('revalidarFila', () => {
  it('fila completa y válida: sin error', () => {
    const r = revalidarFila(FILA_OK, { itemExiste: true, provinciasValidas: PROVINCIAS });
    expect(r).toEqual({ tieneError: false, detalle: null });
  });

  it('ítem no encontrado en el maestro', () => {
    const r = revalidarFila(FILA_OK, { itemExiste: false, provinciasValidas: PROVINCIAS });
    expect(r.tieneError).toBe(true);
    expect(r.detalle).toBe('Ítem ITEM-01 no encontrado en el maestro');
  });

  it('falta contrato K', () => {
    const r = revalidarFila({ ...FILA_OK, contrato: '' }, { itemExiste: true, provinciasValidas: PROVINCIAS });
    expect(r.detalle).toBe('Falta contrato K');
  });

  it('contrato solo espacios cuenta como faltante', () => {
    const r = revalidarFila({ ...FILA_OK, contrato: '   ' }, { itemExiste: true, provinciasValidas: PROVINCIAS });
    expect(r.detalle).toBe('Falta contrato K');
  });

  it('falta provincia', () => {
    const r = revalidarFila({ ...FILA_OK, provincia: '' }, { itemExiste: true, provinciasValidas: PROVINCIAS });
    expect(r.detalle).toBe('Falta provincia');
  });

  it('provincia inválida', () => {
    const r = revalidarFila({ ...FILA_OK, provincia: 'Marte' }, { itemExiste: true, provinciasValidas: PROVINCIAS });
    expect(r.detalle).toBe("Provincia 'Marte' inválida");
  });

  it('provincia válida por match case-insensitive', () => {
    const r = revalidarFila({ ...FILA_OK, provincia: 'SALTA' }, { itemExiste: true, provinciasValidas: PROVINCIAS });
    expect(r.tieneError).toBe(false);
  });

  it('falta cantidad (null)', () => {
    const r = revalidarFila({ ...FILA_OK, cantidades: null }, { itemExiste: true, provinciasValidas: PROVINCIAS });
    expect(r.detalle).toBe('Falta cantidad');
  });

  it('falta cantidad (0)', () => {
    const r = revalidarFila({ ...FILA_OK, cantidades: '0' }, { itemExiste: true, provinciasValidas: PROVINCIAS });
    expect(r.detalle).toBe('Falta cantidad');
  });

  it('falta total mes (null)', () => {
    const r = revalidarFila({ ...FILA_OK, total_mes: null }, { itemExiste: true, provinciasValidas: PROVINCIAS });
    expect(r.detalle).toBe('Falta total mes');
  });

  it('total mes en 0 es válido', () => {
    const r = revalidarFila({ ...FILA_OK, total_mes: '0' }, { itemExiste: true, provinciasValidas: PROVINCIAS });
    expect(r.tieneError).toBe(false);
  });

  it('tolera coma decimal es-AR en cantidades y total_mes (ronda de fix 1)', () => {
    const r = revalidarFila(
      { ...FILA_OK, cantidades: '5,5', total_mes: '10,25' },
      { itemExiste: true, provinciasValidas: PROVINCIAS },
    );
    expect(r).toEqual({ tieneError: false, detalle: null });
  });

  it('acumula varias faltas unidas por "; "', () => {
    const r = revalidarFila(
      { item_codigo: 'X', contrato: '', provincia: '', cantidades: null, total_mes: null },
      { itemExiste: false, provinciasValidas: PROVINCIAS },
    );
    expect(r.tieneError).toBe(true);
    expect(r.detalle).toBe(
      'Ítem X no encontrado en el maestro; Falta contrato K; Falta provincia; Falta cantidad; Falta total mes',
    );
  });
});

describe('hojaCoincideConKs (fix B9 — límites de palabra)', () => {
  it('K1 no matchea la hoja "CERTIF K12 NORTE"', () => {
    expect(hojaCoincideConKs('CERTIF K12 NORTE', ['K1'])).toBe(false);
  });

  it('K12 matchea la hoja "CERTIF K12 NORTE"', () => {
    expect(hojaCoincideConKs('CERTIF K12 NORTE', ['K12'])).toBe(true);
  });

  it('matchea sin distinguir mayúsculas/minúsculas', () => {
    expect(hojaCoincideConKs('certif k6 sur', ['K6'])).toBe(true);
  });

  it('sin ningún K coincidente devuelve false', () => {
    expect(hojaCoincideConKs('CERTIF K8', ['K6', 'K11'])).toBe(false);
  });
});

describe('validarArchivoCarga', () => {
  it('.xlsx es aceptado', () => {
    expect(validarArchivoCarga('planilla.xlsx', 1000)).toBeNull();
  });

  it('.xlsm es aceptado', () => {
    expect(validarArchivoCarga('planilla.xlsm', 1000)).toBeNull();
  });

  it('.pdf es aceptado', () => {
    expect(validarArchivoCarga('planilla.pdf', 1000)).toBeNull();
  });

  it('.xls pide conversión', () => {
    expect(validarArchivoCarga('planilla.xls', 1000)).toBe('Formato .xls no soportado: convertí el archivo a .xlsx.');
  });

  it('extensión desconocida', () => {
    expect(validarArchivoCarga('planilla.docx', 1000)).toBe(
      'Formato de archivo no soportado (.docx). Usá .xlsx, .xlsm o .pdf.',
    );
  });

  it('sin extensión', () => {
    expect(validarArchivoCarga('planilla', 1000)).toBe(
      'Formato de archivo no soportado (sin extensión). Usá .xlsx, .xlsm o .pdf.',
    );
  });

  it('rechaza archivos de más de 20 MB', () => {
    expect(validarArchivoCarga('planilla.xlsx', 20 * 1024 * 1024 + 1)).toBe('El archivo supera el máximo de 20 MB.');
  });

  it('acepta justo 20 MB', () => {
    expect(validarArchivoCarga('planilla.xlsx', 20 * 1024 * 1024)).toBeNull();
  });
});
