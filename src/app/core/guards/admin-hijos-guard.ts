import { inject } from '@angular/core';
import { CanActivateChildFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../auth/auth-service';

// rolGuard no vuelve a correr al moverse dentro del Panel, así que acá reviso en
// cada subsección que la sesión no se haya cerrado en otra pestaña.
export const adminHijosGuard: CanActivateChildFn = async () => {
  // inject() solo funciona antes del primer await.
  const auth = inject(AuthService);
  const router = inject(Router);

  const sesionVigente = await auth.sesionVigente();

  let esAdministrador = false;

  if (sesionVigente) {
    const perfil = auth.perfil();

    if (perfil !== null && perfil.rol === 'administrador') {
      esAdministrador = true;
    }
  }

  let resultado: boolean | UrlTree;

  if (esAdministrador) {
    resultado = true;
  } else {
    resultado = router.createUrlTree(['/auth/login']);
  }

  return resultado;
};
