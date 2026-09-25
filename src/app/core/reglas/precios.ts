import type { TipoButacaCodigo } from '../models/enumerados';

// La entrada sale la tarifa de la butaca más el adicional del formato. Si hay
// preventa le descuento el porcentaje al total y redondeo a pesos enteros.
export function precioEntrada(tarifa: number, adicional: number, porcentajePreventa = 0): number {
  const total = tarifa + adicional;
  const descuento = (total * porcentajePreventa) / 100;

  const precio = Math.round(total - descuento);

  return precio;
}

// Solo la VIP tiene tarifa propia: la accesible paga lo mismo que la común.
export function tarifaButaca(tipo: TipoButacaCodigo, comun: number, vip: number): number {
  let tarifa = comun;

  if (tipo === 'vip') {
    tarifa = vip;
  }

  return tarifa;
}
