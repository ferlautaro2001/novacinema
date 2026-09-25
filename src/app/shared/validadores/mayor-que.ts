import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MENSAJE_VIP_MAYOR = 'La tarifa VIP debe ser mayor que la común';

// Validador de grupo: el grupo tiene que tener los controles "comun" y "vip".
// Si alguno está vacío no digo nada, de eso se encarga el required de cada campo.
export const vipMayorQueComun: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const comun = grupo.get('comun')?.value;
  const vip = grupo.get('vip')?.value;
  if (comun === null || comun === '' || vip === null || vip === '') {
    return null;
  }
  if (Number(vip) > Number(comun)) {
    return null;
  }
  return { vipMayorQueComun: MENSAJE_VIP_MAYOR };
};
