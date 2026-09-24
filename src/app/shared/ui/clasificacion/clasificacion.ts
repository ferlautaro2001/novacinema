import { Component, input } from '@angular/core';
import { Clasificacion as Codigo, EDADES_MINIMAS } from '../../../core/models/pelicula';

@Component({
  selector: 'nc-clasificacion',
  templateUrl: './clasificacion.html',
  styleUrl: './clasificacion.css',
})
export class Clasificacion {
  readonly codigo = input.required<Codigo>();
  protected readonly edades = EDADES_MINIMAS;
}
