import type { TipoButacaCodigo } from '../models/enumerados';

// La entrada sale la tarifa de la butaca más el adicional del formato. Si hay
// preventa le descuento el porcentaje al total y redondeo a centavos, igual que
// calcular_precio_entrada en la base: así lo que se muestra es lo que se cobra.
export function precioEntrada(tarifa: number, adicional: number, porcentajePreventa = 0): number {
  const total = tarifa + adicional;
  const centavos = Math.round(total * (100 - porcentajePreventa));

  const precio = centavos / 100;

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
