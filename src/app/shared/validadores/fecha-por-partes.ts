import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { inicioDelDia, leerDDMMAAAA } from '../utilidades/fechas';

export const ANIO_MINIMO = 1909;

export interface OpcionesFechaPorPartes {
  anioMinimo?: number;
  // Por defecto, el año en curso.
  anioMaximo?: number;
  // Para la fecha de nacimiento: solo se aceptan días anteriores a hoy.
  soloAnteriorAHoy?: boolean;
}

interface PartesFecha {
  dia: string;
  mes: string;
  anio: string;
}

// Validador de grupo para una fecha cargada en tres partes (día, mes, año).
// Devuelve un solo error, el primero que encuentra, para mostrar un mensaje claro:
//   { fechaIncompleta }   falta alguna de las tres partes
//   { diaInvalido }       el día no es un número del 1 al 31
//   { anioFueraDeRango }  el año no tiene 4 cifras o está fuera del rango
//   { fechaInvalida }     la combinación no existe (31 de febrero)
//   { fechaNoAnterior }   es hoy o una fecha futura (con soloAnteriorAHoy)
export function fechaPorPartes(opciones: OpcionesFechaPorPartes = {}): ValidatorFn {
  const anioMinimo = opciones.anioMinimo ?? ANIO_MINIMO;
  return (grupo: AbstractControl): ValidationErrors | null => {
    const { dia, mes, anio } = grupo.value as PartesFecha;
    const anioMaximo = opciones.anioMaximo ?? new Date().getFullYear();

    if (!dia || !mes || !anio) return { fechaIncompleta: true };

    const numeroDia = Number(dia);
    if (!/^\d{1,2}$/.test(dia) || numeroDia < 1 || numeroDia > 31) return { diaInvalido: true };

    const numeroAnio = Number(anio);
    if (!/^\d{4}$/.test(anio) || numeroAnio < anioMinimo || numeroAnio > anioMaximo) {
      return { anioFueraDeRango: { minimo: anioMinimo, maximo: anioMaximo } };
    }

    const fecha = leerDDMMAAAA(`${dia.padStart(2, '0')}/${mes}/${anio}`);
    if (!fecha) return { fechaInvalida: true };

    if (opciones.soloAnteriorAHoy && fecha >= inicioDelDia(new Date())) {
      return { fechaNoAnterior: true };
    }
    return null;
  };
}

// La fecha del grupo en ISO ("1990-02-14"), lista para guardar. Supone que el
// grupo ya pasó por fechaPorPartes.
export function isoDePartes({ dia, mes, anio }: PartesFecha): string {
  return `${anio}-${mes}-${dia.padStart(2, '0')}`;
}
