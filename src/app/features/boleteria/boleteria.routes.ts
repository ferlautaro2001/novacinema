import { Routes } from '@angular/router';

// Pantallas del empleado de boletería (EP-09), protegidas por rolGuard (US-02.05).
// Al ingresar, el empleado arranca en la venta.
export const boleteriaRoutes: Routes = [
  { path: '', redirectTo: 'venta', pathMatch: 'full' },
  {
    path: 'venta',
    title: 'Boletería · NovaCinema',
    loadComponent: () => import('./venta/venta').then((m) => m.Venta),
  },
];
