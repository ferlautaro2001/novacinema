import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import { nombreGenero } from '../models/pelicula';
import type { PeliculaEnCartelera } from '../models/pelicula';
import type { ClasificacionCodigo, EstadoPelicula } from '../models/enumerados';

// Películas que el público puede comprar ahora (US-06.03).
//
// La ventana de preventa, la existencia de una función futura y el promedio de
// las reseñas los decide la vista v_cartelera, que es donde están los datos.
// Antes esta clase hacía cuatro consultas y después armaba en el navegador el
// filtro, la preventa y el promedio.
@Service()
export class CarteleraService {
  private supS = inject(Supabase);

  // La vista ya devuelve solo las películas con venta abierta.
  async listarEnCartelera(): Promise<PeliculaEnCartelera[]> {
    // SELECT * FROM v_cartelera ORDER BY titulo
    const { data, error } = await this.supS.Sup.from('v_cartelera').select('*').order('titulo');
    if (error !== null) {
      throw error;
    }

    const enCartelera: PeliculaEnCartelera[] = [];

    for (const fila of data) {
      const pelicula: PeliculaEnCartelera = {
        id: fila.id,
        titulo: fila.titulo,
        sinopsis: fila.sinopsis,
        duracion_min: fila.duracion_min,
        clasificacion_id: fila.clasificacion_id,
        imagen_path: fila.imagen_path,
        fecha_estreno: fila.fecha_estreno,
        estado: fila.estado as EstadoPelicula,
        destacada: fila.destacada,
        activo: fila.activo,
        creado_en: fila.creado_en,
        actualizado_en: fila.actualizado_en,
        clasificacion: {
          codigo: fila.clasificacion_codigo as ClasificacionCodigo,
          edad_minima: fila.clasificacion_edad_minima,
        },
        generos: generosLegibles(fila.generos),
        puntuacion: fila.puntuacion,
        enPreventa: fila.en_preventa,
      };

      enCartelera.push(pelicula);
    }

    return enCartelera;
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

// La vista devuelve los nombres como los guarda el catálogo. El catálogo de
// TMDB tiene tres que no coinciden con los del enunciado ("Suspense" en vez de
// "Suspenso"), así que el arreglo se pasa por nombreGenero.
function generosLegibles(nombres: string[]): string[] {
  const generos: string[] = [];

  for (const nombre of nombres) {
    const legible = nombreGenero(nombre);

    if (generos.includes(legible) === false) {
      generos.push(legible);
    }
  }

  return generos;
}
