import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { inicioDelDia, leerDDMMAAAA } from '../utilidades/fechas';

export interface OpcionesFecha {
  // Para la fecha de nacimiento: solo días anteriores a hoy.
  soloAnteriorAHoy?: boolean;
}

// Fecha escrita DD/MM/AAAA. El vacío lo dejo pasar: si es obligatorio, eso lo dice
// Validators.required.
export function fechaDDMMAAAA(opciones: OpcionesFecha = {}): ValidatorFn {
  const validador: ValidatorFn = (
    control: AbstractControl<string | null>,
  ): ValidationErrors | null => {
    let errores: ValidationErrors | null = null;

    const valor = control.value;

    if (valor !== null && valor !== undefined) {
      const texto = valor.trim();

      if (texto !== '') {
        errores = erroresDeFecha(texto, opciones);
      }
    }

    return errores;
  };

  return validador;
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function erroresDeFecha(texto: string, opciones: OpcionesFecha): ValidationErrors | null {
  let errores: ValidationErrors | null = null;

  const fecha = leerDDMMAAAA(texto);

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
