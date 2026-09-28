import { Routes } from '@angular/router';
import { sesionGuard } from '../../core/guards/sesion-guard';

// El Candy (EP-08). El menú lo ve cualquiera; pagar un pedido pide sesión,
// porque se vincula a una compra propia (AC-08.05.01).
export const candyRoutes: Routes = [
  {
    path: '',
    title: 'Candy · NovaCinema',
    loadComponent: () => import('./menu/menu').then((m) => m.Menu),
  },
  {
    path: 'pedido',
    title: 'Tu pedido del Candy · NovaCinema',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pagar-pedido/pagar-pedido').then((m) => m.PagarPedido),
  },
];
