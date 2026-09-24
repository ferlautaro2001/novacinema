// Funciones puras de fechas que usan el selector rápido y el validador DD/MM/AAAA.
// Todo trabaja en hora local y a medianoche: acá importa el día, no la hora.

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

export function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function diasConsecutivos(desde: Date, cantidad: number): Date[] {
  const inicio = inicioDelDia(desde);
  return Array.from({ length: cantidad }, (_, i) => sumarDias(inicio, i));
}

// "Hoy", "Mañana" o el día corto con su número: "Mié 7".
export function etiquetaDia(dia: Date, hoy: Date): string {
  if (mismoDia(dia, hoy)) return 'Hoy';
  if (mismoDia(dia, sumarDias(hoy, 1))) return 'Mañana';
  return `${DIAS[dia.getDay()]} ${dia.getDate()}`;
}

// Para lectores de pantalla: "miércoles 7 de octubre".
export function fechaLarga(dia: Date): string {
  return `${DIAS_LARGOS[dia.getDay()]} ${dia.getDate()} de ${MESES[dia.getMonth()]}`;
}

// "octubre de 2026", o "octubre y noviembre de 2026" si la semana cruza de mes.
export function mesesDe(dias: Date[]): string {
  const primero = dias[0];
  const ultimo = dias[dias.length - 1];
  if (primero.getMonth() === ultimo.getMonth()) {
    return `${MESES[primero.getMonth()]} de ${primero.getFullYear()}`;
  }
  if (primero.getFullYear() === ultimo.getFullYear()) {
    return `${MESES[primero.getMonth()]} y ${MESES[ultimo.getMonth()]} de ${ultimo.getFullYear()}`;
  }
  return `${MESES[primero.getMonth()]} de ${primero.getFullYear()} y ${MESES[ultimo.getMonth()]} de ${ultimo.getFullYear()}`;
}

// Devuelve la fecha si el texto es DD/MM/AAAA y existe en el calendario; si no,
// null. "31/02/2000" da null porque new Date lo pasaría al 2 de marzo.
export function leerDDMMAAAA(texto: string): Date | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!partes) return null;
  const [dia, mes, anio] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const fecha = new Date(anio, mes - 1, dia);
  const existe =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  return existe ? fecha : null;
}
