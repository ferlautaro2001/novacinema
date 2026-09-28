// El código de una compra: el que ve el cliente al confirmarla, el que va en el
// QR y el que se dicta en boletería (AC-07.08.02). "NOVA-" y seis caracteres al
// azar.
//
// El alfabeto no tiene 0, O, 1 ni I, que el AC nombra como ambiguos, ni L, que
// se confunde con el 1 escrito a mano: así se puede digitar sin dudar. Con 31
// símbolos y 6 posiciones hay unos 887 millones de combinaciones; igual la base
// lo marca como único y, si choca, se genera otro.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LARGO = 6;

export const PREFIJO_CODIGO = 'NOVA-';

export function generarCodigoCompra(): string {
  const azar = new Uint32Array(LARGO);

  crypto.getRandomValues(azar);

  let codigo = PREFIJO_CODIGO;

  for (const numero of azar) {
    const posicion = numero % ALFABETO.length;

    codigo = codigo + ALFABETO[posicion];
  }

  return codigo;
}
