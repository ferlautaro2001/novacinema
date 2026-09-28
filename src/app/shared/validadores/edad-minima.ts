import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { leerDDMMAAAA } from '../utilidades/fechas';

// El adulto responsable tiene que tener 18 años cumplidos a la fecha de
// referencia (la función). Validador de grupo para la fecha en tres partes
// (nc-campo-fecha). Si la fecha está incompleta o no existe no dice nada: de
// eso se encarga fechaPorPartes.
//
// No usa reglas/edad porque shared no puede importar de core: la cuenta es la
// misma que hace edadEn, escrita con las partes que ya trae el grupo.
export function esMayorDeEdad(fecha: Date): ValidatorFn {
  const validador: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
    const valor = grupo.value as { dia: string; mes: string; anio: string };

    let errores: ValidationErrors | null = null;

    if (fechaCompleta(valor)) {
      const dia = valor.dia.padStart(2, '0');
      const nacimiento = leerDDMMAAAA(`${dia}/${valor.mes}/${valor.anio}`);

      if (nacimiento !== null) {
        const edad = edadEnPartes(valor, fecha);

        if (edad < 18) {
          errores = { menorDeEdad: true };
        }
      }
    }

    return errores;
  };

  return validador;
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function fechaCompleta(valor: { dia: string; mes: string; anio: string }): boolean {
  let completa = false;

  if (
    valor.dia !== null &&
    valor.dia !== undefined &&
    valor.dia !== '' &&
    valor.mes !== null &&
    valor.mes !== undefined &&
    valor.mes !== '' &&
    valor.anio !== null &&
    valor.anio !== undefined &&
    valor.anio !== ''
  ) {
    completa = true;
  }

  return completa;
}

// Años cumplidos a la fecha de referencia, con las partes del grupo.
function edadEnPartes(valor: { dia: string; mes: string; anio: string }, fecha: Date): number {
  let edad = fecha.getFullYear() - Number(valor.anio);

  if (faltaCumpleanios(valor, fecha)) {
    edad--;
  }

  return edad;
}

// Si todavía no llegó el cumpleaños de este año, falta uno.
function faltaCumpleanios(valor: { dia: string; mes: string; anio: string }, fecha: Date): boolean {
  const mes = Number(valor.mes);
  const dia = Number(valor.dia);
  const mesActual = fecha.getMonth() + 1;
  const diaActual = fecha.getDate();

  let falta = false;

  if (mesActual < mes) {
    falta = true;
  } else if (mesActual === mes && diaActual < dia) {
    falta = true;
  }

  return falta;
}
