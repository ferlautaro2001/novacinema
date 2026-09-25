import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

// Cada sección nueva del Panel se suma a esta lista y a admin.routes.ts.
@Component({
  selector: 'nc-panel',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './panel.html',
  styleUrl: './panel.css',
})
export class Panel {
  secciones = [
    { ruta: 'peliculas', texto: 'Películas' },
    { ruta: 'salas', texto: 'Salas' },
    { ruta: 'funciones', texto: 'Funciones' },
    { ruta: 'facturacion', texto: 'Facturación' },
    { ruta: 'empleados', texto: 'Empleados' },
  ];
}
