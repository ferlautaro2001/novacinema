import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth-service';

// rolGuard no vuelve a correr al moverse dentro del Panel, así que acá reviso en
// cada subsección que la sesión no se haya cerrado en otra pestaña.
export const adminHijosGuard: CanActivateChildFn = async () => {
  // inject() solo funciona antes del primer await.
  const auth = inject(AuthService);
  const router = inject(Router);
  if ((await auth.sesionVigente()) && auth.perfil()?.rol === 'administrador') {
    return true;
  }
  return router.createUrlTree(['/auth/login']);
};
