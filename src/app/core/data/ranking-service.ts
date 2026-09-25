import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { PeliculaConCatalogo } from '../models/pelicula';

const SELECCION_CATALOGO =
  '*, clasificacion:clasificaciones(codigo, edad_minima), pelicula_generos(genero:generos(id, nombre))';

interface PeliculaConVentas {
  pelicula: PeliculaConCatalogo;
  vendidas: number;
}

// Ranking de películas por entradas vendidas (US-06.01).
//
// Una entrada "vendida no cancelada" es la que no fue anulada (entradas.anulada_en
// es null) y pertenece a una compra en estado 'pagada': las compras pendientes
// todavía no son una venta y las canceladas ya no lo son.
//
// El visitante no puede leer entradas ni compras por RLS, así que los conteos salen
// de la vista pública v_ranking_peliculas, que aplica justo esa regla. El filtro de
// cartelera, el orden, el empate alfabético y el recorte a 3 se hacen acá.
@Service()
export class RankingService {
  private supS = inject(Supabase);

  // Hasta 3 películas en cartelera, de más a menos entradas vendidas no canceladas.
  async masVendidas(): Promise<PeliculaConCatalogo[]> {
    const cliente = this.supS.Sup;

    const { data: conteos, error: errorConteos } = await cliente
      .from('v_ranking_peliculas')
      .select('pelicula_id, entradas_vendidas')
      .gt('entradas_vendidas', 0);
    if (errorConteos !== null) {
      throw errorConteos;
    }

    const vendidasPorPelicula = new Map<string, number>();

    for (const conteo of conteos) {
      if (conteo.pelicula_id !== null && conteo.entradas_vendidas !== null) {
        vendidasPorPelicula.set(conteo.pelicula_id, conteo.entradas_vendidas);
      }
    }

    const peliculas: PeliculaConCatalogo[] = [];

    if (vendidasPorPelicula.size !== 0) {
      const ids = [...vendidasPorPelicula.keys()];
      const { data, error } = await cliente
        .from('peliculas')
        .select(SELECCION_CATALOGO)
        .in('id', ids)
        .eq('activo', true)
        .eq('estado', 'en_cartelera');
      if (error !== null) {
        throw error;
      }

      const enCartelera = data as unknown as PeliculaConCatalogo[];
      const ranking: PeliculaConVentas[] = [];

      for (const pelicula of enCartelera) {
        const vendidas = buscarVendidas(vendidasPorPelicula, pelicula.id);
        const puesto: PeliculaConVentas = { pelicula: pelicula, vendidas: vendidas };
        ranking.push(puesto);
      }

      ranking.sort(compararPorVentas);

      const primeras = ranking.slice(0, 3);

      for (const puesto of primeras) {
        peliculas.push(puesto.pelicula);
      }
    }

    return peliculas;
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function buscarVendidas(vendidasPorPelicula: Map<string, number>, id: string): number {
  let vendidas = 0;
  const encontrado = vendidasPorPelicula.get(id);

  if (encontrado !== undefined) {
    vendidas = encontrado;
  }

  return vendidas;
}

// Mayor cantidad primero; ante empate, orden alfabético por título.
function compararPorVentas(primera: PeliculaConVentas, segunda: PeliculaConVentas): number {
  let orden = segunda.vendidas - primera.vendidas;

  if (orden === 0) {
    orden = primera.pelicula.titulo.localeCompare(segunda.pelicula.titulo, 'es');
  }

  return orden;
}
