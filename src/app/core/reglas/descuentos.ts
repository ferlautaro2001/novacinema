import type { Cupon } from '../models/precio';

// Un cupón sin vigente_hasta no vence nunca.
export function cuponVigente(cupon: Cupon, fecha: Date): boolean {
  if (fecha < new Date(cupon.vigente_desde)) {
    return false;
  }
  if (cupon.vigente_hasta && fecha > new Date(cupon.vigente_hasta)) {
    return false;
  }
  return true;
}

// Devuelve por qué no se puede usar el cupón, o null si se puede. La edad la calcula
// quien llama con edadEn(), así esta función no depende del usuario.
export function motivoCuponRechazado(cupon: Cupon, edad: number, ahora: Date): string | null {
  if (!cupon.activo || !cuponVigente(cupon, ahora)) {
    return 'El cupón no está disponible';
  }
  // Para los de mayores de 50 guardo edad_minima = 51 (51 años cumplidos o más).
  if (cupon.tipo === 'edad_minima' && edad < (cupon.edad_minima ?? 51)) {
    return 'Este cupón es exclusivo para mayores de 50 años';
  }
  return null;
}
