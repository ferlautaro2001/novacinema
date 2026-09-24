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
  diaSemana: number; // 0=Domingo, 1=Lunes, ...
  diaNombre: string; // 'lunes', 'martes', etc.
}

export interface AsignacionResultado {
  ocurrencia: OcurrenciaProgramacion;
  sala: Sala | null;
  mensaje?: string;
}

const NOMBRES_DIAS: Record<number, string> = {
  0: 'domingo',
  1: 'lunes',
  2: 'martes',
  3: 'miércoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sábado',
};

export function parseFechaHora(valor: string | Date): Date {
  return valor instanceof Date ? valor : new Date(valor);
}

export function calcularFin(comienza: Date, duracionMinutos: number): Date {
  return new Date(comienza.getTime() + duracionMinutos * 60 * 1000);
}

// Verifica si una sala está libre para una nueva función, exigiendo un intervalo
// mínimo de limpieza (por defecto 30 minutos) antes y después de cada función (AC-04.04.01, AC-04.04.02).
export function salaLibre(
  funcionesDeLaSala: IntervaloHorario[],
  nuevoInicio: string | Date,
  duracionMinutos: number,
  intervaloLimpiezaMinutos = 30
): boolean {
  const inicioNuevo = parseFechaHora(nuevoInicio);
  const finNuevo = calcularFin(inicioNuevo, duracionMinutos);
  const limpiezaMs = intervaloLimpiezaMinutos * 60 * 1000;

  for (const f of funcionesDeLaSala) {
    const fInicio = parseFechaHora(f.comienza_en);
    const fFin = f.termina_en
      ? parseFechaHora(f.termina_en)
      : f.duracion_min
        ? calcularFin(fInicio, f.duracion_min)
        : fInicio;

    // Para que no haya solape ni conflicto de limpieza:
    // La nueva debe empezar al menos 30 min después de fFin, O
    // fInicio debe empezar al menos 30 min después de finNuevo.
    const despues = inicioNuevo.getTime() >= fFin.getTime() + limpiezaMs;
    const antes = fInicio.getTime() >= finNuevo.getTime() + limpiezaMs;

    if (!despues && !antes) {
      return false;
    }
  }

  return true;
}

// Asigna automáticamente la sala activa de menor número disponible (AC-04.03.02).
export function asignarSala(
  salas: Sala[],
  funcionesExistentes: IntervaloHorario[],
  nuevoInicio: string | Date,
  duracionMinutos: number,
  intervaloLimpiezaMinutos = 30
): Sala | null {
  const salasActivas = salas
    .filter((s) => s.activa)
    .sort((a, b) => a.numero - b.numero);

  for (const sala of salasActivas) {
    const funcionesDeSala = funcionesExistentes.filter((f) => f.sala_id === sala.id);
    if (salaLibre(funcionesDeSala, nuevoInicio, duracionMinutos, intervaloLimpiezaMinutos)) {
      return sala;
    }
  }

  return null;
}

// Calcula las ocurrencias a partir de fecha de inicio, cantidad de semanas,
// días de la semana (1=Lun ... 7=Dom o 0=Dom) y lista de horarios 'HH:MM' (AC-04.03.01).
export function calcularOcurrencias(
  fechaInicioStr: string,
  semanas: number,
  diasSemana: number[],
  horarios: string[]
): OcurrenciaProgramacion[] {
  const ocurrencias: OcurrenciaProgramacion[] = [];
  const [año, mes, dia] = fechaInicioStr.split('-').map(Number);
  const totalDias = semanas * 7;

  // Normalizamos días seleccionados (si vienen 1..7 donde 7 es Domingo, se mapea a 0)
  const diasNormalizados = diasSemana.map((d) => (d === 7 ? 0 : d));

  for (let offset = 0; offset < totalDias; offset++) {
    const fechaActual = new Date(año, mes - 1, dia + offset);
    const diaActualSemana = fechaActual.getDay();

    if (!diasNormalizados.includes(diaActualSemana)) {
      continue;
    }

    const y = fechaActual.getFullYear();
    const m = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const d = String(fechaActual.getDate()).padStart(2, '0');
    const fechaFmt = `${y}-${m}-${d}`;
    const diaNombre = NOMBRES_DIAS[diaActualSemana];

    for (const h of horarios) {
      if (!h || !h.includes(':')) continue;
      const [horas, minutos] = h.split(':').map(Number);
      const fechaHora = new Date(y, fechaActual.getMonth(), fechaActual.getDate(), horas, minutos, 0, 0);

      ocurrencias.push({
        fecha: fechaFmt,
        hora: h,
        fechaHora,
        diaSemana: diaActualSemana,
        diaNombre,
      });
    }
  }

  ocurrencias.sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime());
  return ocurrencias;
}

export function formatearDiaFechaHora(fechaStr: string, hora: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  const diaNombre = NOMBRES_DIAS[fecha.getDay()];
  const dia = String(d).padStart(2, '0');
  const mes = String(m).padStart(2, '0');
  return `${diaNombre} ${dia}/${mes} ${hora}`;
}
