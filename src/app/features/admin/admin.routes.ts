import { Routes } from '@angular/router';

// Panel del administrador. Cada sección se suma con su US y queda protegida por
// adminHijosGuard (US-02.05). Al ingresar, el administrador arranca en la
// facturación del día.
export const adminRoutes: Routes = [
  { path: '', redirectTo: 'facturacion', pathMatch: 'full' },
  {
    path: 'facturacion',
    title: 'Panel · Facturación · NovaCinema',
    loadComponent: () => import('./facturacion/facturacion').then((m) => m.Facturacion),
  },
];
