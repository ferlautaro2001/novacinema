import { Pipe, PipeTransform } from '@angular/core';
import { coincideTitulo } from '../utilidades/busqueda';
import { incluyeGenero } from '../utilidades/filtro-genero';

interface PeliculaFiltrable {
  titulo: string;
  generos: string[];
}

// Uso: peliculas | filtroPeliculas: texto : genero
// El texto y el género se aplican juntos; un texto o un género vacío no filtra.
@Pipe({ name: 'filtroPeliculas' })
export class FiltroPeliculasPipe implements PipeTransform {
  transform<T extends PeliculaFiltrable>(peliculas: T[], texto: string, genero: string): T[] {
    const encontradas: T[] = [];

    for (const pelicula of peliculas) {
      const coincideTexto = coincideTitulo(pelicula.titulo, texto);
      const coincideGenero = incluyeGenero(pelicula.generos, genero);

      if (coincideTexto && coincideGenero) {
        encontradas.push(pelicula);
      }
    }

    return encontradas;
  }
}
