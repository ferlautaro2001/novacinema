import { Routes } from '@angular/router';

// La compra de entradas (EP-07). Todas las pantallas del grupo piden sesión:
// comprar es para clientes registrados, así que sesionGuard está puesto en
// app.routes.ts sobre el grupo entero y no se repite en cada ruta.
//
// La de la película va antes que la de la función porque tiene dos segmentos y
// la otra uno: si invirtieran el orden, "pelicula" se leería como un id.
export const compraRoutes: Routes = [
  {
    path: 'pelicula/:peliculaId',
    title: 'Elegí la función · NovaCinema',
    loadComponent: () =>
      import('./elegir-funcion/elegir-funcion').then((m) => m.ElegirFuncion),
  },
  {
    path: ':funcionId',
    title: 'Elegí tus butacas · NovaCinema',
    loadComponent: () =>
      import('./elegir-butacas/elegir-butacas').then((m) => m.ElegirButacas),
  },
];
