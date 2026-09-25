import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Buscador por nombre de la cartelera (US-06.04).
@Component({
  selector: 'nc-buscador-peliculas',
  imports: [FormsModule],
  templateUrl: './buscador-peliculas.html',
  styleUrl: './buscador-peliculas.css',
})
export class BuscadorPeliculas {
  texto = model('');
}
