import { Routes } from '@angular/router';

// Ingreso y registro (EP-02).
export const authRoutes: Routes = [
  {
    path: 'registro',
    title: 'Crear cuenta · NovaCinema',
    loadComponent: () => import('./registro/registro').then((m) => m.Registro),
  },
];
