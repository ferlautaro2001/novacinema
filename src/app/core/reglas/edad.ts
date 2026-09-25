// Años cumplidos en una fecha. fechaNacimiento viene de la base como 'AAAA-MM-DD'.
export function edadEn(fechaNacimiento: string, fecha: Date): number {
  const partesFecha = fechaNacimiento.split('-');
  const anio = Number(partesFecha[0]);
  const mes = Number(partesFecha[1]);
  const dia = Number(partesFecha[2]);

  let edad = fecha.getFullYear() - anio;

  // Si todavía no llegó el cumpleaños de este año, le falta uno.
  const mesActual = fecha.getMonth() + 1;
  const diaActual = fecha.getDate();

  let faltaCumpleanios = false;

  if (mesActual < mes) {
    faltaCumpleanios = true;
  } else if (mesActual === mes && diaActual < dia) {
    faltaCumpleanios = true;
  }

  if (faltaCumpleanios) {
    edad--;
  }

  return edad;
}
