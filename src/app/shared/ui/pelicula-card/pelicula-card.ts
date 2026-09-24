import { Component, input, output } from '@angular/core';
import { Clasificacion } from '../clasificacion/clasificacion';
import { DuracionPipe } from '../../pipes/duracion-pipe';

// Lo que la tarjeta necesita mostrar. Es un subconjunto de la película de core:
// quien la usa le pasa la suya tal cual, y la URL de la portada ya armada, para que
// este componente no dependa del modelo ni de Storage.
export interface PeliculaTarjeta {
  titulo: string;
  sinopsis: string;
  duracion_min: number;
  estado: string;
  clasificacion: { codigo: 'ATP' | '+13' | '+16' | '+18'; edad_minima: number };
}

@Component({
  selector: 'nc-pelicula-card',
  imports: [Clasificacion, DuracionPipe],
  templateUrl: './pelicula-card.html',
  styleUrl: './pelicula-card.css',
})
export class PeliculaCard {
  pelicula = input.required<PeliculaTarjeta>();
  imagenUrl = input.required<string>();
  // Sin datos: quien usa la tarjeta ya sabe qué película es.
  verDetalle = output<void>();
}
