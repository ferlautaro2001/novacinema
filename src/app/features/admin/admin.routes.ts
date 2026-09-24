import { Routes } from '@angular/router';
import { adminHijosGuard } from '../../core/guards/admin-hijos-guard';
import { cambiosPendientesGuard } from '../../core/guards/cambios-pendientes-guard';

// Panel del administrador. Al grupo solo entra un administrador (rolGuard en
// app.routes.ts) y cada subsección vuelve a verificar la sesión con
// adminHijosGuard. Al ingresar arranca en la facturación del día.
export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./panel/panel').then((m) => m.Panel),
    canActivateChild: [adminHijosGuard],
    children: [
      {
        path: 'peliculas',
        title: 'Panel · Películas · NovaCinema',
        loadComponent: () => import('./peliculas/peliculas').then((m) => m.Peliculas),
      },
      {
        path: 'peliculas/nueva',
        title: 'Nueva película · NovaCinema',
        canDeactivate: [cambiosPendientesGuard],
        loadComponent: () =>
          import('./peliculas/formulario-pelicula').then((m) => m.FormularioPelicula),
      },
      {
        path: 'peliculas/:id',
        title: 'Editar película · NovaCinema',
        canDeactivate: [cambiosPendientesGuard],
        loadComponent: () =>
          import('./peliculas/formulario-pelicula').then((m) => m.FormularioPelicula),
      },
      { path: '', redirectTo: 'facturacion', pathMatch: 'full' },
      {
        path: 'facturacion',
        title: 'Panel · Facturación · NovaCinema',
        loadComponent: () => import('./facturacion/facturacion').then((m) => m.Facturacion),
      },
      {
        path: 'empleados',
        title: 'Panel · Empleados · NovaCinema',
        loadComponent: () => import('./empleados/empleados').then((m) => m.Empleados),
      },
    ],
  },
];
