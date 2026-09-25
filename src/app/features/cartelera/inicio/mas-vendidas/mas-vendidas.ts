import { Component, output } from '@angular/core';

// Las 3 películas más vendidas (US-06.01). Avisa con el id cuál abrir en detalle.
@Component({
  selector: 'nc-mas-vendidas',
  templateUrl: './mas-vendidas.html',
  styleUrl: './mas-vendidas.css',
})
export class MasVendidas {
  verDetalle = output<string>();
}
