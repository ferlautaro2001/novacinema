import type { Sala } from '../models/sala';

export interface IntervaloHorario {
  comienza_en: string | Date;
  termina_en?: string | Date;
  duracion_min?: number;
  sala_id: string;
}

export interface OcurrenciaProgramacion {
  fecha: string; // 'AAAA-MM-DD'
  hora: string; // 'HH:MM'
  fechaHora: Date;
  diaSemana: number; // 0 = domingo, como Date.getDay()
  diaNombre: string;
}

export interface AsignacionResultado {
  ocurrencia: OcurrenciaProgramacion;
  sala: Sala | null;
  mensaje?: string;
}

const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function parseFechaHora(valor: string | Date): Date {
  return valor instanceof Date ? valor : new Date(valor);
}

export function calcularFin(comienza: Date, duracionMinutos: number): Date {
  return new Date(comienza.getTime() + duracionMinutos * 60 * 1000);
}

// Entre una función y otra de la misma sala tiene que quedar el tiempo de limpieza,
// tanto antes como después de la nueva.
export function salaLibre(
  funcionesDeLaSala: IntervaloHorario[],
  nuevoInicio: string | Date,
  duracionMinutos: number,
  intervaloLimpiezaMinutos = 30,
): boolean {
  const inicioNuevo = parseFechaHora(nuevoInicio);
  const finNuevo = calcularFin(inicioNuevo, duracionMinutos);
  const limpiezaMs = intervaloLimpiezaMinutos * 60 * 1000;

  for (const f of funcionesDeLaSala) {
    const fInicio = parseFechaHora(f.comienza_en);
    let fFin = fInicio;
    if (f.termina_en) {
      fFin = parseFechaHora(f.termina_en);
    } else if (f.duracion_min) {
      fFin = calcularFin(fInicio, f.duracion_min);
    }

    const empiezaDespues = inicioNuevo.getTime() >= fFin.getTime() + limpiezaMs;
    const terminaAntes = fInicio.getTime() >= finNuevo.getTime() + limpiezaMs;
    if (!empiezaDespues && !terminaAntes) {
      return false;
    }
  }

  return true;
}

// Elige la sala activa libre de menor número.
export function asignarSala(
  salas: Sala[],
  funcionesExistentes: IntervaloHorario[],
  nuevoInicio: string | Date,
  duracionMinutos: number,
  intervaloLimpiezaMinutos = 30,
): Sala | null {
  const salasActivas = salas.filter((s) => s.activa).sort((a, b) => a.numero - b.numero);

  for (const sala of salasActivas) {
    const funcionesDeSala = funcionesExistentes.filter((f) => f.sala_id === sala.id);
    if (salaLibre(funcionesDeSala, nuevoInicio, duracionMinutos, intervaloLimpiezaMinutos)) {
      return sala;
    }
  }

  return null;
}

// Días de la semana de 1 (lunes) a 7 (domingo); también acepta 0 como domingo.
export function calcularOcurrencias(
  fechaInicioStr: string,
  semanas: number,
  diasSemana: number[],
  horarios: string[],
): OcurrenciaProgramacion[] {
  const ocurrencias: OcurrenciaProgramacion[] = [];
  const [año, mes, dia] = fechaInicioStr.split('-').map(Number);
  // Date.getDay() usa 0 para el domingo.
  const dias = diasSemana.map((d) => (d === 7 ? 0 : d));

  for (let i = 0; i < semanas * 7; i++) {
    const fecha = new Date(año, mes - 1, dia + i);
    const diaSemana = fecha.getDay();
    if (!dias.includes(diaSemana)) continue;

    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    const fechaTexto = `${fecha.getFullYear()}-${m}-${d}`;

    for (const hora of horarios) {
      if (!hora || !hora.includes(':')) continue;
      const [horas, minutos] = hora.split(':').map(Number);
      ocurrencias.push({
        fecha: fechaTexto,
        hora,
        fechaHora: new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), horas, minutos),
        diaSemana,
        diaNombre: NOMBRES_DIAS[diaSemana],
      });
    }
  }

  ocurrencias.sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime());
  return ocurrencias;
}

export function formatearDiaFechaHora(fechaStr: string, hora: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  const dia = String(d).padStart(2, '0');
  const mes = String(m).padStart(2, '0');
  return `${NOMBRES_DIAS[fecha.getDay()]} ${dia}/${mes} ${hora}`;
}
