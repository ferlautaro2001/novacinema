import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Para el grupo del cupón: la vigencia no puede terminar antes de empezar.
// Las fechas vienen como "2026-10-05", así que alcanza con compararlas como texto.
export const finNoAnterior: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const desde = valorDe(grupo, 'vigente_desde');
  const hasta = valorDe(grupo, 'vigente_hasta');

  let errores: ValidationErrors | null = null;

  if (tieneValor(desde) && tieneValor(hasta)) {
    if (hasta < desde) {
      const finAnterior: ValidationErrors = { finAnterior: true };
      errores = finAnterior;
    }
  }

  return errores;
};

// ─── Auxiliares ─────────────────────────────────────────────────────

function valorDe(grupo: AbstractControl, nombre: string): string | null | undefined {
  let valor: string | null | undefined = undefined;
  const control = grupo.get(nombre);

  if (control !== null) {
    valor = control.value;
  }

  return valor;
}

function tieneValor(valor: string | null | undefined): valor is string {
  let bandera = false;

  if (valor !== undefined && valor !== null && valor !== '') {
    bandera = true;
  }

  return bandera;
}
