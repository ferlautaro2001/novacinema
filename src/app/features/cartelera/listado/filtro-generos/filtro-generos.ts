import { Component, input, model } from '@angular/core';

// Botones de géneros de la cartelera (US-06.05). Un género vacío es "Todos".
@Component({
  selector: 'nc-filtro-generos',
  templateUrl: './filtro-generos.html',
  styleUrl: './filtro-generos.css',
})
export class FiltroGeneros {
  generos = input<string[]>([]);
  genero = model('');

  elegir(genero: string): void {
    this.genero.set(genero);
  }
}
