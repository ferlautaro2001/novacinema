import { Routes } from '@angular/router';

// Cuenta del cliente. Todo el grupo pide sesión (sesionGuard en app.routes.ts).
export const cuentaRoutes: Routes = [
  { path: '', redirectTo: 'perfil', pathMatch: 'full' },
  {
    path: 'perfil',
    title: 'Mi perfil · NovaCinema',
    loadComponent: () => import('./perfil/perfil').then((m) => m.Perfil),
  },
];
