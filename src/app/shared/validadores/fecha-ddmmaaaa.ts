import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { inicioDelDia, leerDDMMAAAA } from '../utilidades/fechas';

export interface OpcionesFecha {
  // Para la fecha de nacimiento: solo se aceptan días anteriores a hoy.
  soloAnteriorAHoy?: boolean;
}

// Fecha escrita DD/MM/AAAA. El vacío lo deja pasar: si el campo es obligatorio,
// eso lo dice Validators.required.
//   { fechaInvalida: true }     no tiene el formato o el día no existe
//   { fechaNoAnterior: true }   es hoy o una fecha futura (con soloAnteriorAHoy)
export function fechaDDMMAAAA(opciones: OpcionesFecha = {}): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const texto = control.value?.trim();
    if (!texto) return null;

    const fecha = leerDDMMAAAA(texto);
    if (!fecha) return { fechaInvalida: true };

    if (opciones.soloAnteriorAHoy && fecha >= inicioDelDia(new Date())) {
      return { fechaNoAnterior: true };
    }
    return null;
  };
}
