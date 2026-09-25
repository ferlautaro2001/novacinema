import type { Preventa } from '../models/precio';

// Para calcular la ventana solo me importan estos dos datos.
type Ventana = Pick<Preventa, 'habilitada' | 'dias_antes'>;

// La fecha de estreno viene de la base como 'AAAA-MM-DD'. La paso a Date local a las 00:00.
export function diaDeEstreno(fechaEstreno: string): Date {
  const partesFecha = fechaEstreno.split('-');
  const anio = Number(partesFecha[0]);
  const mes = Number(partesFecha[1]);
  const dia = Number(partesFecha[2]);

  const estreno = new Date(anio, mes - 1, dia);

  return estreno;
}

// Con preventa, la venta abre dias_antes días antes del estreno a las 00:00.
// Sin preventa (o si la película no tiene una cargada), abre el día del estreno.
export function aperturaDeVenta(fechaEstreno: string, preventa: Ventana | null): Date {
  const apertura = diaDeEstreno(fechaEstreno);

  if (preventa !== null && preventa !== undefined && preventa.habilitada) {
    apertura.setDate(apertura.getDate() - preventa.dias_antes);
  }

  return apertura;
}

// La venta está abierta desde la apertura (preventa o estreno) en adelante.
export function ventaAbierta(fechaEstreno: string, preventa: Ventana | null, fecha: Date): boolean {
  let abierta = false;

  const apertura = aperturaDeVenta(fechaEstreno, preventa);

  if (fecha >= apertura) {
    abierta = true;
  }

  return abierta;
}

// Está en preventa desde la apertura hasta el día anterior al estreno inclusive.
export function estaEnPreventa(
  fechaEstreno: string,
  preventa: Ventana | null,
  fecha: Date,
): boolean {
  let enPreventa = false;

  if (preventa !== null && preventa !== undefined && preventa.habilitada) {
    const apertura = aperturaDeVenta(fechaEstreno, preventa);
    const estreno = diaDeEstreno(fechaEstreno);

    if (fecha >= apertura && fecha < estreno) {
      enPreventa = true;
    }
  }

  return enPreventa;
}
