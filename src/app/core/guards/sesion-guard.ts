import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../auth/auth-service';

// Protege la navegación, no los datos: eso lo hace RLS en la base.
export const sesionGuard: CanActivateFn = async () => {
  // inject() solo funciona antes del primer await.
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo();

  const usuario = auth.usuario();

  let resultado: boolean | UrlTree;

  if (usuario !== null) {
    resultado = true;
  } else {
    resultado = router.createUrlTree(['/auth/login']);
  }

  return resultado;
};
