import { Routes } from '@angular/router';

// La compra de entradas (EP-07). Todas las pantallas del grupo piden sesión:
// comprar es para clientes registrados, así que sesionGuard está puesto en
// app.routes.ts sobre el grupo entero y no se repite en cada ruta.
//
// El orden importa: las rutas de dos segmentos van antes que la de uno, porque
// si no "edad", "pagar" o "confirmacion" se leerían como un id de función.
export const compraRoutes: Routes = [
  {
    path: 'pelicula/:peliculaId',
    title: 'Elegí la función · NovaCinema',
    loadComponent: () => import('./elegir-funcion/elegir-funcion').then((m) => m.ElegirFuncion),
  },
  {
    path: ':funcionId/edad',
    title: 'Antes de seguir · NovaCinema',
    loadComponent: () => import('./control-edad/control-edad').then((m) => m.ControlEdad),
  },
  {
    path: ':funcionId/pagar',
    title: 'Resumen de tu compra · NovaCinema',
    loadComponent: () => import('./pagar/pagar').then((m) => m.Pagar),
  },
  {
    path: ':funcionId/confirmacion',
    title: 'Compra confirmada · NovaCinema',
    loadComponent: () => import('./confirmacion/confirmacion').then((m) => m.Confirmacion),
  },
  {
    path: ':funcionId',
    title: 'Elegí tus butacas · NovaCinema',
    loadComponent: () => import('./elegir-butacas/elegir-butacas').then((m) => m.ElegirButacas),
  },
];
