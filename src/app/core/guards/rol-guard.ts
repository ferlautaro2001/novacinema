import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { AuthService } from '../auth/auth-service';
import type { Rol } from '../models/enumerados';

// Grupos de rutas por rol (Panel, Boletería). Con CanMatch, si el rol no está en
// route.data['roles'] la ruta directamente no existe para esa persona: el router
// sigue buscando y termina en "Página no encontrada", sin revelar que hay algo ahí.
export const rolGuard: CanMatchFn = async (route) => {
  const auth = inject(AuthService);
  await auth.listo();
  const permitidos = (route.data?.['roles'] ?? []) as Rol[];
  const rol = auth.perfil()?.rol;
  return rol !== undefined && permitidos.includes(rol);
};
