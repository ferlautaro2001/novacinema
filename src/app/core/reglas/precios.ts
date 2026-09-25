import type { TipoButacaCodigo } from '../models/enumerados';

// La entrada sale la tarifa de la butaca más el adicional del formato. Si hay
// preventa le descuento el porcentaje al total y redondeo a pesos enteros.
export function precioEntrada(tarifa: number, adicional: number, porcentajePreventa = 0): number {
  const total = tarifa + adicional;
  return Math.round(total - (total * porcentajePreventa) / 100);
}

// Solo la VIP tiene tarifa propia: la accesible paga lo mismo que la común.
export function tarifaButaca(tipo: TipoButacaCodigo, comun: number, vip: number): number {
  if (tipo === 'vip') return vip;
  return comun;
}
