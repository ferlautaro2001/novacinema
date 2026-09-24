import type { TipoButacaCodigo } from '../models/enumerados';

export type TipoButaca = TipoButacaCodigo;
export type EstadoButaca = 'disponible' | 'ocupada' | 'bloqueada';

export const FILAS: string[] = 'ABCDEFGHIJKLMNOPQRST'.split('');
export const FILAS_VIP: string[] = ['R', 'S', 'T'];
export const PASILLOS: number[] = [5, 26];
export const COLUMNAS_ACCESIBLES: number[] = [2, 3, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 28, 29];
export const TOTAL_COLUMNAS = 30;

export interface ButacaMapa {
  id: string; // ej: 'H11'
  fila: string;
  columna: number;
  filaIndex: number;
  tipo: TipoButaca;
  estado: EstadoButaca;
  seleccionada?: boolean;
}

export interface FilaMapa {
  letra: string;
  filaIndex: number;
  esVip: boolean;
  esAccesible: boolean;
  esCirculacion: boolean;
  posiciones: (ButacaMapa | null)[]; // 1 a 30 (longitud 30): null si es pasillo o vacío
}

export interface LayoutSala {
  filas: FilaMapa[];
  butacas: ButacaMapa[];
  totalButacas: number;
  totalComunes: number;
  totalVip: number;
  totalAccesibles: number;
}

export function esPasillo(columna: number): boolean {
  return PASILLOS.includes(columna);
}

export function esButacaValida(fila: string, columna: number): boolean {
  if (fila === 'K') return false;
  if (columna < 1 || columna > TOTAL_COLUMNAS) return false;
  if (esPasillo(columna)) return false;
  if (fila === 'J') {
    return COLUMNAS_ACCESIBLES.includes(columna);
  }
  return true;
}

export function tipoDeButaca(fila: string): TipoButaca {
  if (fila === 'J') return 'accesible';
  if (FILAS_VIP.includes(fila)) return 'vip';
  return 'comun';
}

export function generarDistribucionSala(
  ocupadas: string[] = [],
  bloqueadas: string[] = []
): LayoutSala {
  const butacas: ButacaMapa[] = [];
  const filas: FilaMapa[] = [];

  let totalComunes = 0;
  let totalVip = 0;
  let totalAccesibles = 0;

  FILAS.forEach((letra, filaIndex) => {
    const esCirculacion = letra === 'K';
    const esAccesible = letra === 'J';
    const esVip = FILAS_VIP.includes(letra);
    const posiciones: (ButacaMapa | null)[] = [];

    for (let c = 1; c <= TOTAL_COLUMNAS; c++) {
      if (!esButacaValida(letra, c)) {
        posiciones.push(null);
        continue;
      }

      const id = `${letra}${c}`;
      const tipo = tipoDeButaca(letra);
      const estado: EstadoButaca = ocupadas.includes(id)
        ? 'ocupada'
        : bloqueadas.includes(id)
          ? 'bloqueada'
          : 'disponible';

      if (tipo === 'comun') totalComunes++;
      else if (tipo === 'vip') totalVip++;
      else if (tipo === 'accesible') totalAccesibles++;

      const b: ButacaMapa = {
        id,
        fila: letra,
        columna: c,
        filaIndex,
        tipo,
        estado,
        seleccionada: false,
      };

      butacas.push(b);
      posiciones.push(b);
    }

    filas.push({
      letra,
      filaIndex,
      esVip,
      esAccesible,
      esCirculacion,
      posiciones,
    });
  });

  return {
    filas,
    butacas,
    totalButacas: butacas.length,
    totalComunes,
    totalVip,
    totalAccesibles,
  };
}
