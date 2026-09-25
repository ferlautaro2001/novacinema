import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { AuthService } from '../auth/auth-service';
import type { Rol } from '../models/enumerados';

// Uso CanMatch para que, si el rol no está en route.data['roles'], la ruta no exista
// para esa persona y termine en "Página no encontrada" sin revelar que hay algo ahí.
export const rolGuard: CanMatchFn = async (route) => {
  // inject() solo funciona antes del primer await.
  const auth = inject(AuthService);
  await auth.listo();

  let permitidos: Rol[] = [];

  if (route.data !== undefined && route.data !== null) {
    const rolesDeRuta = route.data['roles'];

    if (rolesDeRuta !== null && rolesDeRuta !== undefined) {
      permitidos = rolesDeRuta;
    }
  }

  const perfil = auth.perfil();

  let puedeEntrar = false;

  if (perfil !== null && perfil.rol !== undefined) {
    puedeEntrar = permitidos.includes(perfil.rol);
  }

  return puedeEntrar;
};
