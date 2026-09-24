import { Routes } from '@angular/router';
import { adminHijosGuard } from '../../core/guards/admin-hijos-guard';

// Panel del administrador. Al grupo solo entra un administrador (rolGuard en
// app.routes.ts) y cada subsección vuelve a verificar la sesión con
// adminHijosGuard. Al ingresar arranca en la facturación del día.
export const adminRoutes: Routes = [
  {
    path: '',
    canActivateChild: [adminHijosGuard],
    children: [
      { path: '', redirectTo: 'facturacion', pathMatch: 'full' },
      {
        path: 'facturacion',
        title: 'Panel · Facturación · NovaCinema',
        loadComponent: () => import('./facturacion/facturacion').then((m) => m.Facturacion),
      },
    ],
  },
];
