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

// Opciones del desplegable de mes, con el valor ya en dos dígitos ("01").
export const MESES_DEL_ANIO: { valor: string; nombre: string }[] = MESES.map((mes, i) => ({
  valor: String(i + 1).padStart(2, '0'),
  nombre: mes[0].toUpperCase() + mes.slice(1),
}));

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
  const dias: Date[] = [];
  for (let i = 0; i < cantidad; i++) {
    dias.push(sumarDias(inicio, i));
  }
  return dias;
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
  const mesPrimero = MESES[primero.getMonth()];
  const mesUltimo = MESES[ultimo.getMonth()];

  if (primero.getMonth() === ultimo.getMonth()) {
    return `${mesPrimero} de ${primero.getFullYear()}`;
  }
  if (primero.getFullYear() === ultimo.getFullYear()) {
    return `${mesPrimero} y ${mesUltimo} de ${ultimo.getFullYear()}`;
  }
  return `${mesPrimero} de ${primero.getFullYear()} y ${mesUltimo} de ${ultimo.getFullYear()}`;
}

// Devuelve la fecha si el texto es DD/MM/AAAA y el día existe; si no, null.
// Chequeo que no haya "dado la vuelta": new Date pasa el 31/02 al 2 de marzo.
export function leerDDMMAAAA(texto: string): Date | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!partes) return null;

  const dia = Number(partes[1]);
  const mes = Number(partes[2]);
  const anio = Number(partes[3]);
  const fecha = new Date(anio, mes - 1, dia);

  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    return null;
  }
  return fecha;
}

// Fecha local a ISO ("1990-02-14"), que es lo que Postgres entiende para una columna
// date sin depender de la configuración regional.
export function aISO(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}
