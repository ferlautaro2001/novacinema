import { Component, input } from '@angular/core';

// Muestra de 0 a 5 estrellas (US-06.03). Lo usan la card y los comentarios del detalle.
@Component({
  selector: 'nc-estrellas',
  templateUrl: './estrellas.html',
  styleUrl: './estrellas.css',
})
export class Estrellas {
  cantidad = input.required<number>();
}
