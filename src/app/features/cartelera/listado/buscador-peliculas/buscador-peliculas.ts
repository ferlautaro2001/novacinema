import { Component, model } from '@angular/core';

// Buscador por nombre de la cartelera (US-06.04).
@Component({
  selector: 'nc-buscador-peliculas',
  templateUrl: './buscador-peliculas.html',
  styleUrl: './buscador-peliculas.css',
})
export class BuscadorPeliculas {
  texto = model('');
}
