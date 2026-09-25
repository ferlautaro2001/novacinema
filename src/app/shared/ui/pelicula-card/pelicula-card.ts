import { Component, input, output } from '@angular/core';
import { Clasificacion } from '../clasificacion/clasificacion';
import { DuracionPipe } from '../../pipes/duracion-pipe';

// Solo los campos que muestra la tarjeta. Quien la usa le pasa su película y la URL
// de la portada ya armada, así este componente no depende de core ni de Storage.
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
  verDetalle = output<void>();
}
