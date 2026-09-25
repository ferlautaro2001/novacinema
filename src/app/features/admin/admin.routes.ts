import { Routes } from '@angular/router';
import { adminHijosGuard } from '../../core/guards/admin-hijos-guard';
import { cambiosPendientesGuard } from '../../core/guards/cambios-pendientes-guard';

// Al Panel solo entra un administrador (rolGuard en app.routes.ts). Igual vuelvo a
// chequear la sesión en cada sección con adminHijosGuard. Se arranca en facturación.
export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./panel/panel').then((m) => m.Panel),
    canActivateChild: [adminHijosGuard],
    children: [
      {
        path: 'peliculas',
        title: 'Panel · Películas · NovaCinema',
        loadComponent: () => import('./peliculas/peliculas/peliculas').then((m) => m.Peliculas),
      },
      {
        path: 'peliculas/nueva',
        title: 'Nueva película · NovaCinema',
        canDeactivate: [cambiosPendientesGuard],
        loadComponent: () =>
          import('./peliculas/formulario-pelicula/formulario-pelicula').then(
            (m) => m.FormularioPelicula,
          ),
      },
      {
        path: 'peliculas/:id',
        title: 'Editar película · NovaCinema',
        canDeactivate: [cambiosPendientesGuard],
        loadComponent: () =>
          import('./peliculas/formulario-pelicula/formulario-pelicula').then(
            (m) => m.FormularioPelicula,
          ),
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
      {
        path: 'salas',
        title: 'Panel · Salas · NovaCinema',
        loadComponent: () => import('./salas/salas/salas').then((m) => m.Salas),
      },
      {
        path: 'salas/:id',
        title: 'Distribución de sala · NovaCinema',
        loadComponent: () => import('./salas/sala-detalle/sala-detalle').then((m) => m.SalaDetalle),
      },
      {
        path: 'funciones',
        title: 'Panel · Funciones · NovaCinema',
        loadComponent: () => import('./funciones/funciones/funciones').then((m) => m.Funciones),
      },
      {
        path: 'funciones/programar',
        title: 'Programar funciones · NovaCinema',
        canDeactivate: [cambiosPendientesGuard],
        loadComponent: () =>
          import('./funciones/programar-funciones/programar-funciones').then(
            (m) => m.ProgramarFunciones,
          ),
      },
    ],
  },
];
