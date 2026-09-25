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
  let anioMinimo = ANIO_MINIMO;

  if (opciones.anioMinimo !== undefined && opciones.anioMinimo !== null) {
    anioMinimo = opciones.anioMinimo;
  }

  const validador: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
    const partes = grupo.value as PartesFecha;

    let anioMaximo: number;

    if (opciones.anioMaximo !== undefined && opciones.anioMaximo !== null) {
      anioMaximo = opciones.anioMaximo;
    } else {
      anioMaximo = new Date().getFullYear();
    }

    let errores: ValidationErrors | null = null;

    if (estaVacio(partes.dia) || estaVacio(partes.mes) || estaVacio(partes.anio)) {
      errores = { fechaIncompleta: true };
    } else if (diaValido(partes.dia) === false) {
      errores = { diaInvalido: true };
    } else if (anioValido(partes.anio, anioMinimo, anioMaximo) === false) {
      errores = { anioFueraDeRango: { minimo: anioMinimo, maximo: anioMaximo } };
    } else {
      errores = erroresDeFecha(partes, opciones);
    }

    return errores;
  };

  return validador;
}

// La fecha en ISO ("1990-02-14") para guardarla. Supone que el grupo ya es válido.
export function isoDePartes(partes: PartesFecha): string {
  const dia = partes.dia.padStart(2, '0');
  const iso = `${partes.anio}-${partes.mes}-${dia}`;

  return iso;
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function estaVacio(valor: string | null | undefined): boolean {
  let bandera = false;

  if (valor === null || valor === undefined || valor === '') {
    bandera = true;
  }

  return bandera;
}

function diaValido(dia: string): boolean {
  const numeroDia = Number(dia);

  let esValido = false;

  if (/^\d{1,2}$/.test(dia) && numeroDia >= 1 && numeroDia <= 31) {
    esValido = true;
  }

  return esValido;
}

function anioValido(anio: string, anioMinimo: number, anioMaximo: number): boolean {
  const numeroAnio = Number(anio);

  let esValido = false;

  if (/^\d{4}$/.test(anio) && numeroAnio >= anioMinimo && numeroAnio <= anioMaximo) {
    esValido = true;
  }

  return esValido;
}

function erroresDeFecha(
  partes: PartesFecha,
  opciones: OpcionesFechaPorPartes,
): ValidationErrors | null {
  let errores: ValidationErrors | null = null;

  const dia = partes.dia.padStart(2, '0');
  const fecha = leerDDMMAAAA(`${dia}/${partes.mes}/${partes.anio}`);

  if (fecha === null) {
    errores = { fechaInvalida: true };
  } else if (opciones.soloAnteriorAHoy === true) {
    const hoy = inicioDelDia(new Date());

    if (fecha >= hoy) {
      errores = { fechaNoAnterior: true };
    }
  }

  return errores;
}
