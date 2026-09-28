import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { PeliculaConCatalogo } from '../models/pelicula';

const SELECCION_CATALOGO =
  '*, clasificacion:clasificaciones(codigo, edad_minima), pelicula_generos(genero:generos(id, nombre))';

// Ranking de películas por entradas vendidas (US-06.01).
//
// Una entrada "vendida no cancelada" es la que no fue anulada (entradas.anulada_en
// es null) y pertenece a una compra en estado 'pagada': las compras pendientes
// todavía no son una venta y las canceladas ya no lo son.
//
// El visitante no puede leer entradas ni compras por RLS, así que los conteos salen
// de la vista pública v_ranking_peliculas, que aplica justo esa regla. Sobre ella
// viene v_ranking_cartelera, que ya devuelve solo las películas en cartelera, ordenadas
// de más a menos ventas y recortadas a 3. El emparejamiento con la fila de cada
// película se hace acá porque la consulta por ids no conserva el orden.
@Service()
export class RankingService {
  private supS = inject(Supabase);

  // Hasta 3 películas en cartelera, de más a menos entradas vendidas no canceladas.
  async masVendidas(): Promise<PeliculaConCatalogo[]> {
    const cliente = this.supS.Sup;

    // SELECT pelicula_id FROM v_ranking_cartelera
    // La vista ya viene ordenada y recortada a 3.
    const { data: conteos, error: errorConteos } = await cliente
      .from('v_ranking_cartelera')
      .select('pelicula_id');
    if (errorConteos !== null) {
      throw errorConteos;
    }

    const peliculas: PeliculaConCatalogo[] = [];

    if (conteos.length !== 0) {
      const ids = idsDe(conteos);

      // SELECT *, clasificacion:clasificaciones(...), pelicula_generos:generos(...)
      //   FROM peliculas
      //   WHERE id IN (...) AND activo AND estado = 'en_cartelera'
      const { data, error } = await cliente
        .from('peliculas')
        .select(SELECCION_CATALOGO)
        .in('id', ids)
        .eq('activo', true)
        .eq('estado', 'en_cartelera');
      if (error !== null) {
        throw error;
      }

      const porId = new Map<string, PeliculaConCatalogo>();
      const ordenadas = data as unknown as PeliculaConCatalogo[];

      for (const pelicula of ordenadas) {
        porId.set(pelicula.id, pelicula);
      }

      for (const id of ids) {
        const pelicula = porId.get(id);

        if (pelicula !== undefined) {
          peliculas.push(pelicula);
        }
      }
    }

    return peliculas;
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

// Los ids del ranking, en el orden en que los trajo la vista.
function idsDe(conteos: { pelicula_id: string | null }[]): string[] {
  const ids: string[] = [];

  for (const conteo of conteos) {
    if (conteo.pelicula_id !== null) {
      ids.push(conteo.pelicula_id);
    }
  }

  return ids;
}
