import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Para un FormArray de checkboxes: al menos uno tiene que estar marcado.
export const alMenosUno: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valores = control.value;

  let hayMarcado = false;

  if (Array.isArray(valores)) {
    for (const valor of valores) {
      if (valor === true) {
        hayMarcado = true;
        break;
      }
    }
  }

  let errores: ValidationErrors | null = { alMenosUno: true };

  if (hayMarcado) {
    errores = null;
  }

  return errores;
};

// Como Validators.required, pero un texto con solo espacios también cuenta como vacío.
export const textoRequerido: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value;

  let tieneTexto = false;

  if (typeof valor === 'string' && valor.trim().length > 0) {
    tieneTexto = true;
  }

  let errores: ValidationErrors | null = { required: true };

  if (tieneTexto) {
    errores = null;
  }

  return errores;
};
