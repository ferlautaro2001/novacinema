import { Routes } from '@angular/router';
import { cambiosPendientesGuard } from '../../core/guards/cambios-pendientes-guard';

export const authRoutes: Routes = [
  {
    path: 'login',
    title: 'Ingresar · NovaCinema',
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    title: 'Crear cuenta · NovaCinema',
    canDeactivate: [cambiosPendientesGuard],
    loadComponent: () => import('./registro/registro').then((m) => m.Registro),
  },
];
