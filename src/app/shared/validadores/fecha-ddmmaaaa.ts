import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { inicioDelDia, leerDDMMAAAA } from '../utilidades/fechas';

export interface OpcionesFecha {
  // Para la fecha de nacimiento: solo días anteriores a hoy.
  soloAnteriorAHoy?: boolean;
}

// Fecha escrita DD/MM/AAAA. El vacío lo dejo pasar: si es obligatorio, eso lo dice
// Validators.required.
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
