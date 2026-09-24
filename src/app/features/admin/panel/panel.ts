import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

// Marco del Panel: submenú de secciones y la sección elegida. Cada sección nueva
// se suma a la lista y a admin.routes.ts.
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
    { ruta: 'facturacion', texto: 'Facturación' },
    { ruta: 'empleados', texto: 'Empleados' },
  ];
}
