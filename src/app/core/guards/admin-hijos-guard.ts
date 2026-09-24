import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth-service';

// Cada subsección del Panel vuelve a verificar que la sesión de administrador siga
// vigente: si se cerró en otra pestaña mientras el Panel estaba abierto, rolGuard
// ya había dejado entrar y no vuelve a correr al moverse entre subsecciones.
export const adminHijosGuard: CanActivateChildFn = async () => {
  // inject() solo funciona antes del primer await.
  const auth = inject(AuthService);
  const router = inject(Router);
  const vigente = await auth.sesionVigente();
  return vigente && auth.perfil()?.rol === 'administrador'
    ? true
    : router.createUrlTree(['/auth/login']);
};
