// La sala de 518 butacas que dibuja el mapa. La dejo en shared porque shared no puede
// importar de core; los códigos de tipo son los mismos de tipos_butaca.codigo.
export type TipoButaca = 'comun' | 'vip' | 'accesible';
export type EstadoButaca = 'disponible' | 'ocupada' | 'bloqueada';

export const FILAS: string[] = 'ABCDEFGHIJKLMNOPQRST'.split('');
export const FILAS_VIP: string[] = ['R', 'S', 'T'];
export const PASILLOS: number[] = [5, 26];
export const COLUMNAS_ACCESIBLES: number[] = [2, 3, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 28, 29];
export const TOTAL_COLUMNAS = 30;

export interface ButacaMapa {
  id: string; // por ejemplo 'H11'
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
  posiciones: (ButacaMapa | null)[]; // una por columna, null en pasillos y huecos
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
  if (fila === 'J') return COLUMNAS_ACCESIBLES.includes(columna);
  return true;
}

export function tipoDeButaca(fila: string): TipoButaca {
  if (fila === 'J') return 'accesible';
  if (FILAS_VIP.includes(fila)) return 'vip';
  return 'comun';
}

export function generarDistribucionSala(
  ocupadas: string[] = [],
  bloqueadas: string[] = [],
): LayoutSala {
  const butacas: ButacaMapa[] = [];
  const filas: FilaMapa[] = [];
  let totalComunes = 0;
  let totalVip = 0;
  let totalAccesibles = 0;

  FILAS.forEach((letra, filaIndex) => {
    const posiciones: (ButacaMapa | null)[] = [];

    for (let columna = 1; columna <= TOTAL_COLUMNAS; columna++) {
      if (!esButacaValida(letra, columna)) {
        posiciones.push(null);
        continue;
      }

      const id = `${letra}${columna}`;
      const tipo = tipoDeButaca(letra);

      let estado: EstadoButaca = 'disponible';
      if (ocupadas.includes(id)) estado = 'ocupada';
      else if (bloqueadas.includes(id)) estado = 'bloqueada';

      if (tipo === 'comun') totalComunes++;
      else if (tipo === 'vip') totalVip++;
      else totalAccesibles++;

      const butaca: ButacaMapa = {
        id,
        fila: letra,
        columna,
        filaIndex,
        tipo,
        estado,
        seleccionada: false,
      };
      butacas.push(butaca);
      posiciones.push(butaca);
    }

    filas.push({
      letra,
      filaIndex,
      esVip: FILAS_VIP.includes(letra),
      esAccesible: letra === 'J',
      esCirculacion: letra === 'K',
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
