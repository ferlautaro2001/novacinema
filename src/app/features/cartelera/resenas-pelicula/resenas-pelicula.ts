import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { ResenaConAutor } from '../../../core/data/resenas-service';
import { Estrellas } from '../../../shared/ui/estrellas/estrellas';

// Comentarios de una película, del más reciente al más antiguo (US-06.06).
@Component({
  selector: 'nc-resenas-pelicula',
  imports: [DatePipe, Estrellas],
  templateUrl: './resenas-pelicula.html',
  styleUrl: './resenas-pelicula.css',
})
export class ResenasPelicula {
  resenas = input.required<ResenaConAutor[]>();
}
