import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// El vencimiento de la tarjeta, "MM/AA" (US-07.07). Una tarjeta sirve hasta el
// último día de su mes: "09/26" vence el 30/09/2026, así que el 05/10/2026 ya
// está vencida (AC-07.07.02).
//
// Si el texto no tiene la forma MM/AA no dice nada: de eso se encarga el
// Validators.pattern del campo. La fecha de hoy se recibe para poder probar
// el validador con cualquier día.
export const PATRON_VENCIMIENTO = /^(0[1-9]|1[0-2])\/\d{2}$/;

export function tarjetaNoVencida(hoy: () => Date): ValidatorFn {
  const validador: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as string;

    let errores: ValidationErrors | null = null;

    if (typeof valor === 'string' && PATRON_VENCIMIENTO.test(valor)) {
      const fecha = hoy();
      const partes = valor.split('/');
      const mes = Number(partes[0]);
      const anio = 2000 + Number(partes[1]);
      const mesActual = fecha.getMonth() + 1;
      const anioActual = fecha.getFullYear();

      let vencida = false;

      if (anio < anioActual) {
        vencida = true;
      } else if (anio === anioActual && mes < mesActual) {
        vencida = true;
      }

      if (vencida) {
        errores = { vencida: true };
      }
    }

    return errores;
  };

  return validador;
}
