import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../auth/auth-service';

// Protege la navegación, no los datos: eso lo hace RLS en la base.
//
// Sin sesión manda a ingresar con la dirección pedida en ?volver=, así el login
// lo devuelve adonde iba: por ejemplo, a la compra que empezó desde el detalle
// de una película (AC-07.01.03).
export const sesionGuard: CanActivateFn = async (_ruta, state) => {
  // inject() solo funciona antes del primer await.
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.listo();

  const usuario = auth.usuario();

  let resultado: boolean | UrlTree;

  if (usuario !== null) {
    resultado = true;
  } else {
    resultado = router.createUrlTree(['/auth/login'], { queryParams: { volver: state.url } });
  }

  return resultado;
};
