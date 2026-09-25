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

interface OpcionMes {
  valor: string;
  nombre: string;
}

// Opciones del desplegable de mes, con el valor ya en dos dígitos ("01").
export const MESES_DEL_ANIO: { valor: string; nombre: string }[] = opcionesDeMes();

export function inicioDelDia(fecha: Date): Date {
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

  return inicio;
}

export function sumarDias(fecha: Date, dias: number): Date {
  const diaBuscado = fecha.getDate() + dias;
  const resultado = new Date(fecha.getFullYear(), fecha.getMonth(), diaBuscado);

  return resultado;
}

export function mismoDia(a: Date, b: Date): boolean {
  let bandera = false;

  if (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  ) {
    bandera = true;
  }

  return bandera;
}

export function diasConsecutivos(desde: Date, cantidad: number): Date[] {
  const inicio = inicioDelDia(desde);
  const dias: Date[] = [];

  for (let indice = 0; indice < cantidad; indice++) {
    const dia = sumarDias(inicio, indice);
    dias.push(dia);
  }

  return dias;
}

// "Hoy", "Mañana" o el día corto con su número: "Mié 7".
export function etiquetaDia(dia: Date, hoy: Date): string {
  const manana = sumarDias(hoy, 1);

  let etiqueta: string;

  if (mismoDia(dia, hoy)) {
    etiqueta = 'Hoy';
  } else if (mismoDia(dia, manana)) {
    etiqueta = 'Mañana';
  } else {
    etiqueta = `${DIAS[dia.getDay()]} ${dia.getDate()}`;
  }

  return etiqueta;
}

// Para lectores de pantalla: "miércoles 7 de octubre".
export function fechaLarga(dia: Date): string {
  const texto = `${DIAS_LARGOS[dia.getDay()]} ${dia.getDate()} de ${MESES[dia.getMonth()]}`;

  return texto;
}

// "octubre de 2026", o "octubre y noviembre de 2026" si la semana cruza de mes.
export function mesesDe(dias: Date[]): string {
  const primero = dias[0];
  const ultimo = dias[dias.length - 1];
  const mesPrimero = MESES[primero.getMonth()];
  const mesUltimo = MESES[ultimo.getMonth()];

  let texto: string;

  if (primero.getMonth() === ultimo.getMonth()) {
    texto = `${mesPrimero} de ${primero.getFullYear()}`;
  } else if (primero.getFullYear() === ultimo.getFullYear()) {
    texto = `${mesPrimero} y ${mesUltimo} de ${ultimo.getFullYear()}`;
  } else {
    texto = `${mesPrimero} de ${primero.getFullYear()} y ${mesUltimo} de ${ultimo.getFullYear()}`;
  }

  return texto;
}

// Devuelve la fecha si el texto es DD/MM/AAAA y el día existe; si no, null.
// Chequeo que no haya "dado la vuelta": new Date pasa el 31/02 al 2 de marzo.
export function leerDDMMAAAA(texto: string): Date | null {
  const textoLimpio = texto.trim();
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(textoLimpio);

  let resultado: Date | null = null;

  if (partes !== null) {
    const dia = Number(partes[1]);
    const mes = Number(partes[2]);
    const anio = Number(partes[3]);
    const fecha = new Date(anio, mes - 1, dia);

    if (fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia) {
      resultado = fecha;
    }
  }

  return resultado;
}

// Fecha local a ISO ("1990-02-14"), que es lo que Postgres entiende para una columna
// date sin depender de la configuración regional.
export function aISO(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  const iso = `${fecha.getFullYear()}-${mes}-${dia}`;

  return iso;
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function opcionesDeMes(): OpcionMes[] {
  const opciones: OpcionMes[] = [];

  for (let indice = 0; indice < MESES.length; indice++) {
    const mes = MESES[indice];
    const valor = String(indice + 1).padStart(2, '0');
    const nombre = mes[0].toUpperCase() + mes.slice(1);

    opciones.push({ valor, nombre });
  }

  return opciones;
}
