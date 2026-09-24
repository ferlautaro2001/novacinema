import { CanDeactivateFn } from '@angular/router';

// La implementa cada pantalla con un formulario de alta o edición: devuelve true
// si hay cambios que se perderían al salir.
export interface FormularioConCambios {
  noGuardado(): boolean;
}

export const MENSAJE_CAMBIOS_SIN_GUARDAR = 'Tenés cambios sin guardar. ¿Querés salir igual?';

// Si el formulario tiene cambios sin guardar, pide confirmación antes de salir.
// Con "Cancelar" la navegación se cancela y el formulario queda como estaba.
export const cambiosPendientesGuard: CanDeactivateFn<FormularioConCambios> = (componente) => {
  if (componente.noGuardado()) {
    return confirm(MENSAJE_CAMBIOS_SIN_GUARDAR);
  }
  return true;
};
