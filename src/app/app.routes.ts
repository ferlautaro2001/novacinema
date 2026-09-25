import { Routes } from '@angular/router';
import { rolGuard } from './core/guards/rol-guard';
import { sesionGuard } from './core/guards/sesion-guard';

// Todas las pantallas son lazy. Los grupos grandes tienen su propio archivo de rutas.
export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  {
    path: 'inicio',
    title: 'Inicio · NovaCinema',
    loadComponent: () => import('./features/cartelera/inicio/inicio').then((m) => m.Inicio),
  },
  {
    path: 'cartelera',
    title: 'Cartelera · NovaCinema',
    loadComponent: () => import('./features/cartelera/listado/listado').then((m) => m.Listado),
  },
  {
    path: 'cartelera/:id',
    title: 'Película · NovaCinema',
    loadComponent: () => import('./features/cartelera/detalle/detalle').then((m) => m.Detalle),
  },
  {
    path: 'proximamente',
    title: 'Próximamente · NovaCinema',
    loadComponent: () =>
      import('./features/cartelera/proximamente/proximamente').then((m) => m.Proximamente),
  },
  {
    path: 'candy',
    title: 'Candy · NovaCinema',
    loadComponent: () => import('./features/candy/menu/menu').then((m) => m.Menu),
  },
  {
    path: 'cuenta',
    canActivate: [sesionGuard],
    loadChildren: () => import('./features/cuenta/cuenta.routes').then((m) => m.cuentaRoutes),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'admin',
    canMatch: [rolGuard],
    data: { roles: ['administrador'] },
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: 'boleteria',
    canMatch: [rolGuard],
    data: { roles: ['empleado', 'administrador'] },
    loadChildren: () =>
      import('./features/boleteria/boleteria.routes').then((m) => m.boleteriaRoutes),
  },
  {
    path: '**',
    title: 'Página no encontrada · NovaCinema',
    loadComponent: () =>
      import('./features/no-encontrado/no-encontrado').then((m) => m.NoEncontrado),
  },
];
