import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Para un FormArray de checkboxes: al menos uno tiene que estar marcado.
export const alMenosUno: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valores = control.value;
  if (Array.isArray(valores) && valores.some((v) => v === true)) {
    return null;
  }
  return { alMenosUno: true };
};

// Como Validators.required, pero un texto con solo espacios también cuenta como vacío.
export const textoRequerido: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value;
  if (typeof valor === 'string' && valor.trim().length > 0) {
    return null;
  }
  return { required: true };
};
