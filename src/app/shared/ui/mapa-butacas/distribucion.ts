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
  const bandera = PASILLOS.includes(columna);

  return bandera;
}

export function esButacaValida(fila: string, columna: number): boolean {
  let bandera = true;

  if (fila === 'K') {
    bandera = false;
  } else if (columna < 1 || columna > TOTAL_COLUMNAS) {
    bandera = false;
  } else if (esPasillo(columna)) {
    bandera = false;
  } else if (fila === 'J') {
    bandera = COLUMNAS_ACCESIBLES.includes(columna);
  }

  return bandera;
}

export function tipoDeButaca(fila: string): TipoButaca {
  let tipo: TipoButaca = 'comun';

  if (fila === 'J') {
    tipo = 'accesible';
  } else if (FILAS_VIP.includes(fila)) {
    tipo = 'vip';
  }

  return tipo;
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

  for (let filaIndex = 0; filaIndex < FILAS.length; filaIndex++) {
    const letra = FILAS[filaIndex];
    const posiciones: (ButacaMapa | null)[] = [];

    for (let columna = 1; columna <= TOTAL_COLUMNAS; columna++) {
      if (esButacaValida(letra, columna)) {
        const id = `${letra}${columna}`;
        const tipo = tipoDeButaca(letra);
        const estado = estadoDeButaca(id, ocupadas, bloqueadas);

        if (tipo === 'comun') {
          totalComunes++;
        } else if (tipo === 'vip') {
          totalVip++;
        } else {
          totalAccesibles++;
        }

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
      } else {
        posiciones.push(null);
      }
    }

    const fila = armarFila(letra, filaIndex, posiciones);

    filas.push(fila);
  }

  const layout: LayoutSala = {
    filas,
    butacas,
    totalButacas: butacas.length,
    totalComunes,
    totalVip,
    totalAccesibles,
  };

  return layout;
}

// Las mismas butacas con el estado al día. Devuelve un array nuevo con copias, así
// el mapa y la escena 3D ven el cambio por input sin que nadie mute el anterior
// (US-07.05).
export function aplicarEstados(
  butacas: ButacaMapa[],
  ocupadas: string[],
  bloqueadas: string[],
): ButacaMapa[] {
  const nuevas: ButacaMapa[] = [];

  for (const butaca of butacas) {
    const estado = estadoDeButaca(butaca.id, ocupadas, bloqueadas);

    nuevas.push({ ...butaca, estado });
  }

  return nuevas;
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function estadoDeButaca(id: string, ocupadas: string[], bloqueadas: string[]): EstadoButaca {
  let estado: EstadoButaca = 'disponible';

  if (ocupadas.includes(id)) {
    estado = 'ocupada';
  } else if (bloqueadas.includes(id)) {
    estado = 'bloqueada';
  }

  return estado;
}

function armarFila(letra: string, filaIndex: number, posiciones: (ButacaMapa | null)[]): FilaMapa {
  const esVip = FILAS_VIP.includes(letra);

  let esAccesible = false;
  let esCirculacion = false;

  if (letra === 'J') {
    esAccesible = true;
  }

  if (letra === 'K') {
    esCirculacion = true;
  }

  const fila: FilaMapa = {
    letra,
    filaIndex,
    esVip,
    esAccesible,
    esCirculacion,
    posiciones,
  };

  return fila;
}
