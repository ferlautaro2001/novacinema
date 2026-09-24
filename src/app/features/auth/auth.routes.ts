import { Routes } from '@angular/router';

// Ingreso y registro (EP-02).
export const authRoutes: Routes = [
  {
    path: 'login',
    title: 'Ingresar · NovaCinema',
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    title: 'Crear cuenta · NovaCinema',
    loadComponent: () => import('./registro/registro').then((m) => m.Registro),
  },
];
