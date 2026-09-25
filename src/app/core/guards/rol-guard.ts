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
  const permitidos: Rol[] = route.data?.['roles'] ?? [];
  const rol = auth.perfil()?.rol;
  if (!rol) return false;
  return permitidos.includes(rol);
};
