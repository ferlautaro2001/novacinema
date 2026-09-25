import type { Cupon } from '../models/precio';

// Un cupón sin vigente_hasta no vence nunca.
export function cuponVigente(cupon: Cupon, fecha: Date): boolean {
  const desde = new Date(cupon.vigente_desde);

  let estaVigente = true;

  if (fecha < desde) {
    estaVigente = false;
  } else if (cupon.vigente_hasta !== null && cupon.vigente_hasta !== '') {
    const hasta = new Date(cupon.vigente_hasta);

    if (fecha > hasta) {
      estaVigente = false;
    }
  }

  return estaVigente;
}

// Devuelve por qué no se puede usar el cupón, o null si se puede. La edad la calcula
// quien llama con edadEn(), así esta función no depende del usuario.
export function motivoCuponRechazado(cupon: Cupon, edad: number, ahora: Date): string | null {
  const vigente = cuponVigente(cupon, ahora);

  let estaDisponible = true;

  if (cupon.activo === false) {
    estaDisponible = false;
  } else if (vigente === false) {
    estaDisponible = false;
  }

  // Para los de mayores de 50 guardo edad_minima = 51 (51 años cumplidos o más).
  let edadMinima = 51;

  if (cupon.edad_minima !== null && cupon.edad_minima !== undefined) {
    edadMinima = cupon.edad_minima;
  }

  let faltaEdad = false;

  if (cupon.tipo === 'edad_minima' && edad < edadMinima) {
    faltaEdad = true;
  }

  let motivo: string | null = null;

  if (estaDisponible) {
    if (faltaEdad) {
      motivo = 'Este cupón es exclusivo para mayores de 50 años';
    }
  } else {
    motivo = 'El cupón no está disponible';
  }

  return motivo;
}
