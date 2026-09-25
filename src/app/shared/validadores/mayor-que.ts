import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MENSAJE_VIP_MAYOR = 'La tarifa VIP debe ser mayor que la común';

// Validador de grupo: el grupo tiene que tener los controles "comun" y "vip".
// Si alguno está vacío no digo nada, de eso se encarga el required de cada campo.
export const vipMayorQueComun: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const comun = valorDeControl(grupo, 'comun');
  const vip = valorDeControl(grupo, 'vip');

  let hayVacio = false;

  if (comun === null || comun === '') {
    hayVacio = true;
  } else if (vip === null || vip === '') {
    hayVacio = true;
  }

  let vipEsMayor = false;

  if (Number(vip) > Number(comun)) {
    vipEsMayor = true;
  }

  let errores: ValidationErrors | null = { vipMayorQueComun: MENSAJE_VIP_MAYOR };

  if (hayVacio || vipEsMayor) {
    errores = null;
  }

  return errores;
};

// ─── Auxiliares ─────────────────────────────────────────────────────

function valorDeControl(grupo: AbstractControl, nombre: string): unknown {
  let valor: unknown = undefined;

  const control = grupo.get(nombre);

  if (control !== null) {
    valor = control.value;
  }

  return valor;
}
