import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth-service';

// Secciones privadas (perfil, compras, Mis películas): sin sesión se va al ingreso.
// Protege la navegación, no los datos: eso lo hace RLS en la base.
export const sesionGuard: CanActivateFn = async () => {
  // inject() solo funciona antes del primer await.
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo();
  if (auth.usuario()) {
    return true;
  }
  return router.createUrlTree(['/auth/login']);
};
