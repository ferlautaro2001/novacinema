import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const alMenosUno: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valores = control.value;
  if (Array.isArray(valores) && valores.some((v) => v === true)) {
    return null;
  }
  return { alMenosUno: true };
};

export const textoRequerido: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value;
  if (typeof valor === 'string' && valor.trim().length > 0) {
    return null;
  }
  return { required: true };
};
