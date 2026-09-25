import { Component, input, output } from '@angular/core';
import { Modal } from '../../../shared/ui/modal/modal';
import { FocoInicial } from '../../../shared/directivas/foco-inicial';

// Modal con el detalle de una película (US-06.06). Lo abren la cartelera, Inicio y
// el enlace directo cartelera/:id.
@Component({
  selector: 'nc-detalle-pelicula',
  imports: [Modal, FocoInicial],
  templateUrl: './detalle-pelicula.html',
  styleUrl: './detalle-pelicula.css',
})
export class DetallePelicula {
  peliculaId = input.required<string>();
  cierre = output<void>();
}
