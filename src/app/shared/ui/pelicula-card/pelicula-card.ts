import { Component, inject, input, output } from '@angular/core';
import { PeliculaConCatalogo } from '../../../core/models/pelicula';
import { StorageService } from '../../../core/data/storage-service';
import { Clasificacion } from '../clasificacion/clasificacion';
import { DuracionPipe } from '../../pipes/duracion-pipe';

@Component({
  selector: 'nc-pelicula-card',
  imports: [Clasificacion, DuracionPipe],
  templateUrl: './pelicula-card.html',
  styleUrl: './pelicula-card.css',
})
export class PeliculaCard {
  pelicula = input.required<PeliculaConCatalogo>();
  verDetalle = output<PeliculaConCatalogo>();
  storage = inject(StorageService);
}
