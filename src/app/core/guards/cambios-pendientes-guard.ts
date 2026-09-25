import { CanDeactivateFn } from '@angular/router';

// La implementa cada pantalla con formulario: true si hay cambios sin guardar.
export interface FormularioConCambios {
  noGuardado(): boolean;
}

export const MENSAJE_CAMBIOS_SIN_GUARDAR = 'Tenés cambios sin guardar. ¿Querés salir igual?';

export const cambiosPendientesGuard: CanDeactivateFn<FormularioConCambios> = (componente) => {
  let puedeSalir = true;

  if (componente.noGuardado()) {
    puedeSalir = confirm(MENSAJE_CAMBIOS_SIN_GUARDAR);
  }

  return puedeSalir;
};
