import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Para el grupo del cupón: la vigencia no puede terminar antes de empezar.
// Las fechas vienen como "2026-10-05", así que alcanza con compararlas como texto.
export const finNoAnterior: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const desde = grupo.get('vigente_desde')?.value;
  const hasta = grupo.get('vigente_hasta')?.value;
  if (!desde || !hasta) return null;
  if (hasta < desde) {
    return { finAnterior: true };
  }
  return null;
};
