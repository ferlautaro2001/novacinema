import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { inicioDelDia, leerDDMMAAAA } from '../utilidades/fechas';

export const ANIO_MINIMO = 1909;

export interface OpcionesFechaPorPartes {
  anioMinimo?: number;
  // Si no viene, uso el año en curso.
  anioMaximo?: number;
  // Para la fecha de nacimiento: solo días anteriores a hoy.
  soloAnteriorAHoy?: boolean;
}

interface PartesFecha {
  dia: string;
  mes: string;
  anio: string;
}

// Validador de grupo para la fecha en tres partes (nc-campo-fecha). Devuelvo solo el
// primer error que encuentro, así el mensaje es uno y claro.
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

// La fecha en ISO ("1990-02-14") para guardarla. Supone que el grupo ya es válido.
export function isoDePartes({ dia, mes, anio }: PartesFecha): string {
  return `${anio}-${mes}-${dia.padStart(2, '0')}`;
}
