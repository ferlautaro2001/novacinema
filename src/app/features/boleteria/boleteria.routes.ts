import { Routes } from '@angular/router';

// Pantallas de boletería. El rolGuard está en app.routes.ts y se arranca en la venta.
export const boleteriaRoutes: Routes = [
  { path: '', redirectTo: 'venta', pathMatch: 'full' },
  {
    path: 'venta',
    title: 'Boletería · NovaCinema',
    loadComponent: () => import('./venta/venta').then((m) => m.Venta),
  },
];
