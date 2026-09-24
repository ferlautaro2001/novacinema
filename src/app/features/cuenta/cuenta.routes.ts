import { Routes } from '@angular/router';

// Cuenta del cliente (EP-10 y EP-11). Queda protegida por sesionGuard en US-02.05.
export const cuentaRoutes: Routes = [
  { path: '', redirectTo: 'perfil', pathMatch: 'full' },
  {
    path: 'perfil',
    title: 'Mi perfil · NovaCinema',
    loadComponent: () => import('./perfil/perfil').then((m) => m.Perfil),
  },
];
