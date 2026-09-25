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
  let fecha: Date;

  if (valor instanceof Date) {
    fecha = valor;
  } else {
    fecha = new Date(valor);
  }

  return fecha;
}

export function calcularFin(comienza: Date, duracionMinutos: number): Date {
  const duracionMs = duracionMinutos * 60 * 1000;
  const fin = new Date(comienza.getTime() + duracionMs);

  return fin;
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

  let estaLibre = true;

  for (const funcion of funcionesDeLaSala) {
    const inicioFuncion = parseFechaHora(funcion.comienza_en);
    const finFuncion = finDeFuncion(funcion, inicioFuncion);

    const finFuncionConLimpieza = finFuncion.getTime() + limpiezaMs;
    const finNuevoConLimpieza = finNuevo.getTime() + limpiezaMs;

    let empiezaDespues = false;

    if (inicioNuevo.getTime() >= finFuncionConLimpieza) {
      empiezaDespues = true;
    }

    let terminaAntes = false;

    if (inicioFuncion.getTime() >= finNuevoConLimpieza) {
      terminaAntes = true;
    }

    let seSuperpone = true;

    if (empiezaDespues) {
      seSuperpone = false;
    } else if (terminaAntes) {
      seSuperpone = false;
    }

    if (seSuperpone) {
      estaLibre = false;
    }
  }

  return estaLibre;
}

// Elige la sala activa libre de menor número.
export function asignarSala(
  salas: Sala[],
  funcionesExistentes: IntervaloHorario[],
  nuevoInicio: string | Date,
  duracionMinutos: number,
  intervaloLimpiezaMinutos = 30,
): Sala | null {
  const salasActivas = salas.filter(estaActiva).sort(compararPorNumero);

  let salaAsignada: Sala | null = null;

  for (const sala of salasActivas) {
    if (salaAsignada === null) {
      const funcionesDeSala = funcionesDeUnaSala(funcionesExistentes, sala.id);
      const libre = salaLibre(
        funcionesDeSala,
        nuevoInicio,
        duracionMinutos,
        intervaloLimpiezaMinutos,
      );

      if (libre) {
        salaAsignada = sala;
      }
    }
  }

  return salaAsignada;
}

// Días de la semana de 1 (lunes) a 7 (domingo); también acepta 0 como domingo.
export function calcularOcurrencias(
  fechaInicioStr: string,
  semanas: number,
  diasSemana: number[],
  horarios: string[],
): OcurrenciaProgramacion[] {
  const ocurrencias: OcurrenciaProgramacion[] = [];
  const partesFecha = fechaInicioStr.split('-');
  const anio = Number(partesFecha[0]);
  const mes = Number(partesFecha[1]);
  const dia = Number(partesFecha[2]);

  // Date.getDay() usa 0 para el domingo.
  const dias: number[] = [];

  for (const diaElegido of diasSemana) {
    let diaGetDay = diaElegido;

    if (diaElegido === 7) {
      diaGetDay = 0;
    }

    dias.push(diaGetDay);
  }

  for (let diasDesdeInicio = 0; diasDesdeInicio < semanas * 7; diasDesdeInicio++) {
    const fecha = new Date(anio, mes - 1, dia + diasDesdeInicio);
    const diaSemana = fecha.getDay();

    if (dias.includes(diaSemana)) {
      const ocurrenciasDelDia = ocurrenciasDeUnDia(fecha, horarios);

      for (const ocurrencia of ocurrenciasDelDia) {
        ocurrencias.push(ocurrencia);
      }
    }
  }

  ocurrencias.sort(compararPorFechaHora);

  return ocurrencias;
}

export function formatearDiaFechaHora(fechaStr: string, hora: string): string {
  const partesFecha = fechaStr.split('-');
  const anio = Number(partesFecha[0]);
  const mes = Number(partesFecha[1]);
  const dia = Number(partesFecha[2]);

  const fecha = new Date(anio, mes - 1, dia);
  const nombreDia = NOMBRES_DIAS[fecha.getDay()];
  const diaTexto = String(dia).padStart(2, '0');
  const mesTexto = String(mes).padStart(2, '0');

  const texto = `${nombreDia} ${diaTexto}/${mesTexto} ${hora}`;

  return texto;
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function finDeFuncion(funcion: IntervaloHorario, inicioFuncion: Date): Date {
  let finFuncion = inicioFuncion;

  if (funcion.termina_en !== undefined && funcion.termina_en !== '') {
    finFuncion = parseFechaHora(funcion.termina_en);
  } else if (funcion.duracion_min !== undefined && funcion.duracion_min !== 0) {
    finFuncion = calcularFin(inicioFuncion, funcion.duracion_min);
  }

  return finFuncion;
}

function estaActiva(sala: Sala): boolean {
  const activa = sala.activa;

  return activa;
}

function compararPorNumero(salaA: Sala, salaB: Sala): number {
  const diferencia = salaA.numero - salaB.numero;

  return diferencia;
}

function funcionesDeUnaSala(funciones: IntervaloHorario[], salaId: string): IntervaloHorario[] {
  const funcionesDeSala: IntervaloHorario[] = [];

  for (const funcion of funciones) {
    if (funcion.sala_id === salaId) {
      funcionesDeSala.push(funcion);
    }
  }

  return funcionesDeSala;
}

function ocurrenciasDeUnDia(fecha: Date, horarios: string[]): OcurrenciaProgramacion[] {
  const ocurrencias: OcurrenciaProgramacion[] = [];
  const diaSemana = fecha.getDay();
  const mesTexto = String(fecha.getMonth() + 1).padStart(2, '0');
  const diaTexto = String(fecha.getDate()).padStart(2, '0');
  const fechaTexto = `${fecha.getFullYear()}-${mesTexto}-${diaTexto}`;

  for (const hora of horarios) {
    let esHoraValida = false;

    if (hora !== '' && hora.includes(':')) {
      esHoraValida = true;
    }

    if (esHoraValida) {
      const partesHora = hora.split(':');
      const horas = Number(partesHora[0]);
      const minutos = Number(partesHora[1]);

      const fechaHora = new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        fecha.getDate(),
        horas,
        minutos,
      );

      const ocurrencia: OcurrenciaProgramacion = {
        fecha: fechaTexto,
        hora: hora,
        fechaHora: fechaHora,
        diaSemana: diaSemana,
        diaNombre: NOMBRES_DIAS[diaSemana],
      };

      ocurrencias.push(ocurrencia);
    }
  }

  return ocurrencias;
}

function compararPorFechaHora(
  ocurrenciaA: OcurrenciaProgramacion,
  ocurrenciaB: OcurrenciaProgramacion,
): number {
  const diferencia = ocurrenciaA.fechaHora.getTime() - ocurrenciaB.fechaHora.getTime();

  return diferencia;
}
