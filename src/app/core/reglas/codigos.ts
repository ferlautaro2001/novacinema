// El código de una compra, el que ve el cliente al confirmarla y el que se
// muestra en boletería (US-07.07). "NC-" y ocho caracteres al azar.
//
// El alfabeto no tiene 0, O, 1, I ni L para que no se confundan al dictarlo o
// leerlo de una pantalla. Con 31 símbolos y 8 posiciones hay unas 850 mil
// millones de combinaciones; igual la base lo marca como único, y si choca se
// genera otro.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LARGO = 8;

export function generarCodigoCompra(): string {
  const azar = new Uint32Array(LARGO);

  crypto.getRandomValues(azar);

  let codigo = 'NC-';

  for (const numero of azar) {
    const posicion = numero % ALFABETO.length;

    codigo = codigo + ALFABETO[posicion];
  }

  return codigo;
}
