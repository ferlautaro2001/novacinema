// Años cumplidos en una fecha. fechaNacimiento viene de la base como 'AAAA-MM-DD'.
export function edadEn(fechaNacimiento: string, fecha: Date): number {
  const [anio, mes, dia] = fechaNacimiento.split('-').map(Number);
  let edad = fecha.getFullYear() - anio;
  // Si todavía no llegó el cumpleaños de este año, le falta uno.
  const mesActual = fecha.getMonth() + 1;
  if (mesActual < mes || (mesActual === mes && fecha.getDate() < dia)) {
    edad--;
  }
  return edad;
}
