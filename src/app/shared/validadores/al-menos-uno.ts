import { ValidatorFn } from '@angular/forms';

export const alMenosUno: ValidatorFn = (control) =>
  Array.isArray(control.value) && control.value.some((valor: unknown) => valor === true)
    ? null
    : { alMenosUno: true };

export const textoRequerido: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim() ? null : { required: true };
