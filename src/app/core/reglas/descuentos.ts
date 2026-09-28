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

// El descuento que queda aplicado en la compra (US-07.06). La base vuelve a
// calcular el monto al guardar compra_cupones: este es el que ve el cliente.
export interface DescuentoElegido {
  cuponId: string;
  codigo: string;
  porcentaje: number;
  etiqueta: string;
  monto: number;
}

// Cada compra admite un solo descuento y gana el de mayor porcentaje
// (AC-07.06.03). Si empatan se queda el ingresado, así el de primera compra
// no se gasta de más.
export function elegirCupon(primeraCompra: Cupon | null, ingresado: Cupon | null): Cupon | null {
  let elegido: Cupon | null = ingresado;

  if (primeraCompra !== null) {
    if (ingresado === null) {
      elegido = primeraCompra;
    } else if (primeraCompra.porcentaje > ingresado.porcentaje) {
      elegido = primeraCompra;
    }
  }

  return elegido;
}

// El monto se redondea a centavos igual que calcular_descuento en la base, así
// el resumen y lo que se cobra no difieren en un peso.
export function aplicarCupon(cupon: Cupon, subtotal: number): DescuentoElegido {
  const monto = Math.round(subtotal * cupon.porcentaje) / 100;
  const etiqueta = etiquetaDeCupon(cupon);
  const descuento: DescuentoElegido = {
    cuponId: cupon.id,
    codigo: cupon.codigo,
    porcentaje: cupon.porcentaje,
    etiqueta,
    monto,
  };

  return descuento;
}

// ─── Auxiliares ─────────────────────────────────────────────────────

// "Descuento primera compra" (AC-07.06.01) o "Cupón MAYORES20".
function etiquetaDeCupon(cupon: Cupon): string {
  let etiqueta = `Cupón ${cupon.codigo}`;

  if (cupon.tipo === 'primera_compra') {
    etiqueta = 'Descuento primera compra';
  }

  return etiqueta;
}
